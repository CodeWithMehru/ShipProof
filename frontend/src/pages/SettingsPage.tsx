import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { getEventSettings, updateEventSettings, clearAllSubmissions } from '../lib/api';
import { useAuth } from '../lib/auth';
import { Settings, Calendar, Save, CheckCircle, AlertTriangle, Trash2, Server } from 'lucide-react';

/**
 * Convert an ISO date string to a `datetime-local` input value (YYYY-MM-DDTHH:MM).
 */
function toDatetimeLocal(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/**
 * Convert a `datetime-local` input value to an ISO string.
 */
function fromDatetimeLocal(value: string): string {
  return new Date(value).toISOString();
}

export function SettingsPage() {
  const { token, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const [eventStart, setEventStart] = useState('');
  const [eventEnd, setEventEnd] = useState('');
  const [judgingEnd, setJudgingEnd] = useState('');

  const [hostingDomainPattern, setHostingDomainPattern] = useState('');
  const [requiredConfigFile, setRequiredConfigFile] = useState('');
  const [platformDisplayName, setPlatformDisplayName] = useState('');

  // Clear-all confirmation state
  const [clearConfirm, setClearConfirm] = useState('');
  const [clearing, setClearing] = useState(false);
  const [clearSuccess, setClearSuccess] = useState<string | null>(null);
  const [clearError, setClearError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) { navigate('/login'); return; }
    if (user?.role !== 'organizer') { navigate('/dashboard'); return; }
    fetchSettings();
  }, [isAuthenticated]);

  const fetchSettings = async () => {
    if (!token) return;
    try {
      const data = await getEventSettings(token);
      setEventStart(toDatetimeLocal(data.eventStart));
      setEventEnd(toDatetimeLocal(data.eventEnd));
      setJudgingEnd(toDatetimeLocal(data.judgingEnd));
      setHostingDomainPattern(data.hostingDomainPattern || '');
      setRequiredConfigFile(data.requiredConfigFile || '');
      setPlatformDisplayName(data.platformDisplayName || '');
      setLastUpdated(data.updatedAt);
    } catch (err) {
      console.error('Failed to load settings:', err);
      setError('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!token) return;
    setError(null);
    setSuccess(false);
    setSaving(true);

    try {
      const data = await updateEventSettings(token, {
        eventStart: fromDatetimeLocal(eventStart),
        eventEnd: fromDatetimeLocal(eventEnd),
        judgingEnd: fromDatetimeLocal(judgingEnd),
        hostingDomainPattern,
        requiredConfigFile,
        platformDisplayName,
      });
      setLastUpdated(data.updatedAt);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError((err as Error).message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleClearAll = async () => {
    if (!token) return;
    if (clearConfirm !== 'DELETE ALL') return;
    setClearing(true);
    setClearError(null);
    setClearSuccess(null);
    try {
      const result = await clearAllSubmissions(token);
      setClearSuccess(result.message);
      setClearConfirm('');
    } catch (err) {
      setClearError((err as Error).message || 'Failed to clear submissions');
    } finally {
      setClearing(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-12">
        <div className="space-y-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="skeleton h-20 rounded-card" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-2xl mx-auto px-6 py-12"
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
          <Settings className="text-accent" size={22} />
        </div>
        <h1 className="text-3xl font-bold text-text-primary tracking-tight">Event Settings</h1>
      </div>
      <p className="text-text-muted text-sm mb-8">
        Configure the hackathon event window, judging period, and deployment verification parameters.
        {lastUpdated && (
          <span className="text-text-dim block mt-1 mono text-xs">
            Last updated: {new Date(lastUpdated).toLocaleString()}
          </span>
        )}
      </p>

      {error && (
        <div className="bg-status-danger/10 border border-status-danger text-status-danger px-4 py-3 rounded-card text-sm mb-6 flex items-start gap-2">
          <AlertTriangle size={16} className="mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="bg-status-healthy/10 border border-status-healthy text-status-healthy px-4 py-3 rounded-card text-sm mb-6 flex items-center gap-2">
          <CheckCircle size={16} />
          <span>Settings saved successfully</span>
        </div>
      )}

      <div className="space-y-8">
        {/* Event Dates Section */}
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-6 pb-4 border-b border-border-subtle">
            <Calendar className="text-text-muted" size={18} />
            <h2 className="text-lg font-semibold text-text-primary">Event Dates</h2>
          </div>
          <div className="space-y-6">
            <DateField
              label="Event Start"
              description="When the hackathon officially begins. Commits before this date are flagged as pre-event."
              value={eventStart}
              onChange={setEventStart}
              icon={<Calendar size={16} />}
            />

            <DateField
              label="Event End"
              description="When the hackathon officially ends. The commit window closes here."
              value={eventEnd}
              onChange={setEventEnd}
              icon={<Calendar size={16} />}
            />

            <DateField
              label="Judging End"
              description="Deadline for judges to submit their reviews. Must be on or after the event end date."
              value={judgingEnd}
              onChange={setJudgingEnd}
              icon={<Calendar size={16} />}
            />
          </div>
        </div>

        {/* Verification Configuration Section */}
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-6 pb-4 border-b border-border-subtle">
            <Server className="text-text-muted" size={18} />
            <h2 className="text-lg font-semibold text-text-primary">Verification Configuration</h2>
          </div>

          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1.5">
                Hosting Domain Pattern
              </label>
              <input
                type="text"
                value={hostingDomainPattern}
                onChange={(e) => setHostingDomainPattern(e.target.value)}
                className="input-field"
                placeholder="\.zerops\.app\b"
              />
              <p className="text-xs text-text-dim mt-1.5 leading-relaxed">
                Regex pattern used by the worker to confirm the live URL is hosted on the required platform.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1.5">
                Required Config File
              </label>
              <input
                type="text"
                value={requiredConfigFile}
                onChange={(e) => setRequiredConfigFile(e.target.value)}
                className="input-field"
                placeholder="zerops.yaml"
              />
              <p className="text-xs text-text-dim mt-1.5 leading-relaxed">
                The filename the worker will look for in the root of the GitHub repository.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1.5">
                Platform Display Name
              </label>
              <input
                type="text"
                value={platformDisplayName}
                onChange={(e) => setPlatformDisplayName(e.target.value)}
                className="input-field"
                placeholder="Zerops"
              />
              <p className="text-xs text-text-dim mt-1.5 leading-relaxed">
                The display name shown in the UI for dashboard columns, badges, and score labels.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end mt-6 mb-12">
        <button
          onClick={handleSave}
          disabled={saving}
          className="btn-primary w-full"
        >
          <Save size={16} />
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>

      {/* Info note */}
      <div className="card p-4 mt-6 text-center">
        <p className="text-xs text-text-dim leading-relaxed max-w-lg mx-auto">
          The worker caches these settings in memory for up to 5 minutes. After saving,
          any new verification jobs will use the updated dates automatically — no restart required.
        </p>
      </div>

      {/* ─── Danger Zone ─────────────────────────────────────────── */}
      <div className="mt-10 border border-status-danger/30 rounded-card overflow-hidden">
        <div className="bg-status-danger/8 px-6 py-4 flex items-center gap-3">
          <Trash2 size={18} className="text-status-danger" />
          <div>
            <h2 className="text-sm font-semibold text-status-danger uppercase tracking-wider">Danger Zone</h2>
            <p className="text-xs text-text-muted mt-0.5">These actions are irreversible. Use them only when resetting the platform between hackathons.</p>
          </div>
        </div>
        <div className="p-6">
          <h3 className="text-sm font-semibold text-text-primary mb-1">Clear all submissions</h3>
          <p className="text-xs text-text-dim mb-4 leading-relaxed">
            Permanently deletes every submission row, along with all its verification results,
            uptime logs, and judge reviews. This is intended to be used by an organizer once
            judging for a hackathon is complete and the platform is being reset for the next event.
          </p>

          {clearSuccess && (
            <div className="flex items-center gap-2 text-status-healthy text-sm p-3 bg-status-healthy/8 rounded-lg mb-4">
              <CheckCircle size={16} />
              {clearSuccess}
            </div>
          )}
          {clearError && (
            <div className="flex items-center gap-2 text-status-danger text-sm p-3 bg-status-danger/8 rounded-lg mb-4">
              <AlertTriangle size={16} />
              {clearError}
            </div>
          )}

          <label className="block text-xs text-text-secondary mb-2">
            Type <span className="mono font-bold text-text-primary">DELETE ALL</span> to confirm:
          </label>
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={clearConfirm}
              onChange={(e) => setClearConfirm(e.target.value)}
              placeholder="DELETE ALL"
              className="input-field py-2 text-sm mono flex-1"
            />
            <button
              onClick={handleClearAll}
              disabled={clearConfirm !== 'DELETE ALL' || clearing}
              className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-status-danger hover:bg-status-danger/80 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-150 flex items-center gap-2"
            >
              <Trash2 size={14} />
              {clearing ? 'Clearing...' : 'Clear All Submissions'}
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function DateField({
  label,
  description,
  value,
  onChange,
  icon,
}: {
  label: string;
  description: string;
  value: string;
  onChange: (v: string) => void;
  icon: React.ReactNode;
}) {
  return (
    <div>
      <label className="flex items-center gap-2 text-sm font-medium text-text-primary mb-1">
        <span className="text-accent">{icon}</span>
        {label}
      </label>
      <p className="text-xs text-text-dim mb-2">{description}</p>
      <input
        type="datetime-local"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="input-field py-2.5 text-sm mono"
      />
    </div>
  );
}
