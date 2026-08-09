import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { getSubmissionDetail, deleteSubmission, getEventSettings, type SubmissionDetail } from '../lib/api';
import { useAuth } from '../lib/auth';
import { StatusBadge } from '../components/StatusBadge';
import { UptimeChart } from '../components/UptimeChart';
import { CommitTimeline } from '../components/CommitTimeline';
import { ScoreForm } from '../components/ScoreForm';
import {
  ArrowLeft,
  ExternalLink,
  GitFork,
  Video,
  Layers,
  AlertTriangle,
  CheckCircle,
  Clock,
  Server,
  Trash2,
} from 'lucide-react';

export function SubmissionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { token, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState<SubmissionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [platformDisplayName, setPlatformDisplayName] = useState('Zerops');
  const [requiredConfigFile, setRequiredConfigFile] = useState('zerops.yaml');

  useEffect(() => {
    if (!isAuthenticated) { navigate('/login'); return; }
    fetchData();
  }, [id, isAuthenticated]);

  const fetchData = async () => {
    if (!token || !id) return;
    setLoading(true);
    try {
      const [d, settings] = await Promise.all([
        getSubmissionDetail(token, id),
        getEventSettings(token)
      ]);
      setData(d);
      if (settings) {
        setPlatformDisplayName(settings.platformDisplayName);
        setRequiredConfigFile(settings.requiredConfigFile);
      }
    } catch (err) {
      console.error('Failed to load submission detail:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!token || !data) return;
    if (!window.confirm(`Permanently delete "${data.projectName}" and all its verification data? This cannot be undone.`)) return;
    try {
      await deleteSubmission(token, data.id);
      navigate('/dashboard');
    } catch (err) {
      alert(`Failed to delete: ${(err as Error).message}`);
    }
  };

  if (loading || !data) {
    return (
      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="space-y-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="skeleton h-48 rounded-card" />
          ))}
        </div>
      </div>
    );
  }

  const vr = data.verificationResults[0] || null;
  const detectedServices = vr?.detectedServices as { services: string[]; raw?: string; found: boolean } | null;
  const depHints = vr?.dependencyHints as { libraries: string[]; files: string[]; note: string } | null;
  const commitTimeline = (vr?.commitTimeline ?? []) as { date: string; count: number }[];
  const myReview = data.reviews.find((r) => r.judge?.id === user?.id);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-6xl mx-auto px-6 py-10"
    >
      {/* Back button */}
      <Link
        to="/dashboard"
        className="inline-flex items-center gap-2 text-sm text-text-muted hover:text-text-primary transition-colors mb-6"
      >
        <ArrowLeft size={16} />
        Back to dashboard
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl font-bold text-text-primary tracking-tight">{data.projectName}</h1>
            <StatusBadge status={data.status} />
          </div>
          <p className="text-text-secondary text-sm">
            by {data.participantName} · {data.participantEmail}
          </p>
          <p className="text-text-dim text-xs mono mt-1">
            Submitted {new Date(data.submittedAt).toLocaleString()}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <a href={data.liveUrl} target="_blank" rel="noopener noreferrer" className="btn-secondary text-sm">
            <ExternalLink size={14} />
            Live URL
          </a>
          <a href={data.githubRepoUrl} target="_blank" rel="noopener noreferrer" className="btn-secondary text-sm">
            <GitFork size={14} />
            Repo
          </a>
          <a href={data.demoVideoUrl} target="_blank" rel="noopener noreferrer" className="btn-secondary text-sm">
            <Video size={14} />
            Demo
          </a>
          {user?.role === 'organizer' && (
            <button
              onClick={handleDelete}
              className="btn-secondary text-sm text-status-danger hover:bg-status-danger/10 border-status-danger/30"
            >
              <Trash2 size={14} />
              Delete
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* ─── Left column: Charts & Verification ─────────── */}
        <div className="col-span-2 space-y-6">
          {/* Layer 1: Uptime Chart */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-text-primary flex items-center gap-2">
                <Clock size={18} className="text-accent" />
                Uptime Monitoring
              </h2>
              <div className="flex items-center gap-2">
                {data.uptimeLogs.length > 0 && (
                  <StatusBadge status={data.uptimeLogs[0]?.isUp ? 'up' : 'down'} size="sm" />
                )}
                <span className="text-xs text-text-dim mono">
                  {data.uptimeLogs.length} checks
                </span>
              </div>
            </div>
            <UptimeChart data={[...data.uptimeLogs].reverse()} />
          </div>

          {/* Layer 4: Commit Timeline */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-text-primary flex items-center gap-2">
                <GitFork size={18} className="text-accent" />
                Commit Activity
              </h2>
              {vr?.commitAuthenticity && (
                <StatusBadge status={vr.commitAuthenticity} />
              )}
            </div>
            <CommitTimeline data={commitTimeline} authenticity={vr?.commitAuthenticity ?? null} />
            <p className="text-xs text-text-dim mt-3 flex items-start gap-1.5">
              <AlertTriangle size={12} className="text-status-warning mt-0.5 flex-shrink-0" />
              Commit distribution is a signal for human review — not an automated verdict.
              A "Review Suggested" flag means the pattern warrants a closer look, not that the submission is invalid.
            </p>
          </div>

          {/* Layer 2: Detected Services */}
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-text-primary flex items-center gap-2 mb-4">
              <Layers size={18} className="text-accent" />
              Architecture Analysis
            </h2>

            {/* Hosting subdomain detection */}
            <div className="flex items-center gap-3 mb-4 p-3 card-elevated rounded-lg">
              <Server size={16} className="text-text-dim" />
              <span className="text-sm text-text-secondary">{platformDisplayName} Subdomain Detected:</span>
              {vr?.isZeropsSubdomain ? (
                <span className="flex items-center gap-1.5 text-status-healthy text-sm font-medium">
                  <CheckCircle size={14} />
                  Yes — URL matches expected pattern
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-status-warning text-sm">
                  <AlertTriangle size={14} />
                  Custom domain — needs manual confirmation
                </span>
              )}
            </div>

            {/* Detected services from config file */}
            {detectedServices?.found ? (
              <div className="mb-4">
                <p className="text-sm text-text-secondary mb-2">
                  <span className="text-accent font-medium">{detectedServices.services.length}</span> service{detectedServices.services.length !== 1 ? 's' : ''} declared in <span className="mono text-text-primary">{requiredConfigFile}</span>
                </p>
                <div className="flex flex-wrap gap-2 mb-3">
                  {detectedServices.services.map((svc) => (
                    <span key={svc} className="badge-info mono text-xs">{svc}</span>
                  ))}
                </div>
                {detectedServices.raw && (
                  <details className="group">
                    <summary className="text-xs text-text-muted cursor-pointer hover:text-text-secondary transition-colors">
                      Show raw {requiredConfigFile}
                    </summary>
                    <pre className="code-block mt-2 text-xs text-text-secondary">
                      {detectedServices.raw}
                    </pre>
                  </details>
                )}
                <p className="text-xs text-text-dim mt-2 flex items-start gap-1.5">
                  <AlertTriangle size={12} className="text-status-warning mt-0.5 flex-shrink-0" />
                  {requiredConfigFile} only describes app-tier services built from source — managed services are provisioned on the {platformDisplayName} dashboard and cannot be verified from this file.
                </p>
              </div>
            ) : (
              <div className="p-3 card-elevated rounded-lg mb-4">
                <p className="text-sm text-status-warning flex items-center gap-2">
                  <AlertTriangle size={14} />
                  {requiredConfigFile} not found at repo root — manual review needed
                </p>
              </div>
            )}

            {/* Dependency hints (soft signal) */}
            {depHints && depHints.libraries.length > 0 && (
              <div className="mt-4 pt-4 border-t border-border-subtle">
                <p className="text-xs text-text-dim uppercase tracking-widest font-medium mb-2 flex items-center gap-1.5">
                  <AlertTriangle size={11} />
                  Dependency Hints — weak signal, not verified
                </p>
                <div className="flex flex-wrap gap-2">
                  {depHints.libraries.map((lib) => (
                    <span key={lib} className="badge-pending mono text-xs">{lib}</span>
                  ))}
                </div>
                <p className="text-xs text-text-dim mt-2 italic">
                  Found in: {depHints.files.join(', ')} — presence of these libraries suggests possible database/cache usage but does not constitute proof.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* ─── Right column: Review form ──────────────────── */}
        <div className="space-y-6">
          {/* Quick info card */}
          <div className="card p-5">
            <h3 className="text-sm font-semibold text-text-primary mb-3 uppercase tracking-wider">Quick Info</h3>
            <div className="space-y-3">
              <InfoRow label="Live URL" value={new URL(data.liveUrl).hostname} mono />
              <InfoRow label="Repo" value={data.githubRepoUrl.replace('https://github.com/', '')} mono />
              <InfoRow label="Status" value={data.status} />
              <InfoRow label="Services" value={detectedServices?.services.length?.toString() ?? '—'} />
              <InfoRow label="Uptime Checks" value={data.uptimeLogs.length.toString()} />
              <InfoRow label="Reviews" value={data.reviews.length.toString()} />
            </div>
          </div>

          {/* Review form */}
          <div className="card p-5">
            <h3 className="text-sm font-semibold text-text-primary mb-4 uppercase tracking-wider">
              Judge Review
            </h3>
            <ScoreForm
              submissionId={data.id}
              existingReview={myReview ? {
                dashboardShownInVideo: myReview.dashboardShownInVideo,
                scoreIdea: myReview.scoreIdea,
                scoreExecution: myReview.scoreExecution,
                scoreZeropsUsage: myReview.scoreZeropsUsage,
                notes: myReview.notes,
              } : undefined}
              onReviewSubmitted={fetchData}
              platformDisplayName={platformDisplayName}
            />
          </div>

          {/* Previous reviews */}
          {data.reviews.length > 0 && (
            <div className="card p-5">
              <h3 className="text-sm font-semibold text-text-primary mb-3 uppercase tracking-wider">
                All Reviews ({data.reviews.length})
              </h3>
              <div className="space-y-3">
                {data.reviews.map((review) => (
                  <div key={review.id} className="card-elevated p-3 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-text-muted mono">{review.judge?.email}</span>
                      <span className="text-xs text-text-dim">
                        {new Date(review.reviewedAt).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-xs">
                      <span className="text-text-secondary">Idea: <span className="text-accent font-bold">{review.scoreIdea ?? '—'}</span></span>
                      <span className="text-text-secondary">Exec: <span className="text-accent font-bold">{review.scoreExecution ?? '—'}</span></span>
                      <span className="text-text-secondary">Zerops: <span className="text-accent font-bold">{review.scoreZeropsUsage ?? '—'}</span></span>
                    </div>
                    {review.dashboardShownInVideo && (
                      <p className="text-xs text-status-healthy mt-1 flex items-center gap-1">
                        <CheckCircle size={11} /> Dashboard confirmed in video
                      </p>
                    )}
                    {review.notes && (
                      <p className="text-xs text-text-dim mt-2 italic">"{review.notes}"</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function InfoRow({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-text-dim">{label}</span>
      <span className={`text-sm text-text-secondary ${mono ? 'mono' : ''} truncate max-w-[180px]`}>{value}</span>
    </div>
  );
}
