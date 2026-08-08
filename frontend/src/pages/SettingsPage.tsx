import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getEventSettings, updateEventSettings } from '../lib/api';
import { useAuth } from '../lib/auth';
import { Settings, Calendar, Save, CheckCircle, AlertTriangle } from 'lucide-react';

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
    <div className="max-w-2xl mx-auto px-6 py-12 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
          <Settings className="text-accent" size={22} />
        </div>
        <h1 className="text-3xl font-bold text-text-primary tracking-tight">Event Settings</h1>
      </div>
      <p className="text-text-muted text-sm mb-8">
        Configure the hackathon event window and judging period. The worker uses these dates
        to evaluate commit authenticity.
        {lastUpdated && (
          <span className="text-text-dim block mt-1 mono text-xs">
            Last updated: {new Date(lastUpdated).toLocaleString()}
          </span>
        )}
      </p>

      {/* Form */}
      <div className="card p-6 space-y-6">
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

        <div className="border-t border-border-subtle pt-6">
          <DateField
            label="Judging End"
            description="Deadline for judges to submit their reviews. Must be on or after the event end date."
            value={judgingEnd}
            onChange={setJudgingEnd}
            icon={<Calendar size={16} />}
          />
        </div>

        {/* Error / success messages */}
        {error && (
          <div className="flex items-center gap-2 text-status-danger text-sm p-3 bg-status-danger/8 rounded-lg">
            <AlertTriangle size={16} />
            {error}
          </div>
        )}

        {success && (
          <div className="flex items-center gap-2 text-status-healthy text-sm p-3 bg-status-healthy/8 rounded-lg">
            <CheckCircle size={16} />
            Settings saved successfully. The worker will pick up the new dates within 5 minutes.
          </div>
        )}

        {/* Save button */}
        <button
          onClick={handleSave}
          disabled={saving || !eventStart || !eventEnd || !judgingEnd}
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
    </div>
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
