import { useState } from 'react';
import { submitReview, type ReviewInput } from '../lib/api';
import { useAuth } from '../lib/auth';
import { CheckCircle, AlertCircle } from 'lucide-react';

interface ScoreFormProps {
  submissionId: string;
  existingReview?: {
    dashboardShownInVideo: boolean;
    scoreIdea: number | null;
    scoreExecution: number | null;
    scoreZeropsUsage: number | null;
    notes: string | null;
  };
  onReviewSubmitted: () => void;
}

export function ScoreForm({ submissionId, existingReview, onReviewSubmitted }: ScoreFormProps) {
  const { token } = useAuth();
  const [dashboardShown, setDashboardShown] = useState(existingReview?.dashboardShownInVideo ?? false);
  const [scoreIdea, setScoreIdea] = useState<number>(existingReview?.scoreIdea ?? 5);
  const [scoreExecution, setScoreExecution] = useState<number>(existingReview?.scoreExecution ?? 5);
  const [scoreZerops, setScoreZerops] = useState<number>(existingReview?.scoreZeropsUsage ?? 5);
  const [notes, setNotes] = useState(existingReview?.notes ?? '');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    setSubmitting(true);
    setError('');
    setSuccess(false);

    try {
      const data: ReviewInput = {
        submissionId,
        dashboardShownInVideo: dashboardShown,
        scoreIdea,
        scoreExecution,
        scoreZeropsUsage: scoreZerops,
        notes: notes || undefined,
      };
      await submitReview(token, data);
      setSuccess(true);
      onReviewSubmitted();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Layer 3: Manual dashboard-in-video confirmation */}
      <div className="card-elevated p-4 flex items-start gap-4">
        <label className="flex items-center gap-3 cursor-pointer flex-1">
          <div className="relative">
            <input
              type="checkbox"
              checked={dashboardShown}
              onChange={(e) => setDashboardShown(e.target.checked)}
              className="sr-only"
            />
            <div className={`w-5 h-5 rounded border-2 transition-all duration-200 flex items-center justify-center ${
              dashboardShown
                ? 'bg-accent border-accent'
                : 'border-border-strong bg-transparent hover:border-text-muted'
            }`}>
              {dashboardShown && (
                <svg className="w-3 h-3 text-base" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </div>
          </div>
          <div>
            <p className="text-sm font-medium text-text-primary">Dashboard shown in video?</p>
            <p className="text-xs text-text-dim mt-0.5">
              Confirm if the demo video includes a view of the participant's Zerops project dashboard showing their services list. This is a human-verified check — not automated.
            </p>
          </div>
        </label>
      </div>

      {/* Score sliders */}
      <div className="grid grid-cols-3 gap-4">
        <ScoreSlider label="Idea" value={scoreIdea} onChange={setScoreIdea} />
        <ScoreSlider label="Execution" value={scoreExecution} onChange={setScoreExecution} />
        <ScoreSlider label="Zerops Usage" value={scoreZerops} onChange={setScoreZerops} />
      </div>

      {/* Notes */}
      <div>
        <label className="label">Notes (optional)</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Any additional observations..."
          rows={3}
          className="input-field resize-none"
        />
      </div>

      {/* Feedback */}
      {error && (
        <div className="flex items-center gap-2 text-status-danger text-sm">
          <AlertCircle size={16} />
          {error}
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 text-status-healthy text-sm animate-fade-in">
          <CheckCircle size={16} />
          Review saved successfully
        </div>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="btn-primary w-full"
      >
        {submitting ? 'Saving...' : existingReview ? 'Update Review' : 'Submit Review'}
      </button>
    </form>
  );
}

function ScoreSlider({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="card-elevated p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-text-secondary">{label}</span>
        <span className="text-2xl font-bold text-accent mono">{value}</span>
      </div>
      <input
        type="range"
        min={1}
        max={10}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-1.5 bg-base rounded-full appearance-none cursor-pointer
                   [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4
                   [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-accent
                   [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:shadow-[0_0_8px_rgba(0,229,153,0.3)]
                   [&::-webkit-slider-thumb]:transition-shadow hover:[&::-webkit-slider-thumb]:shadow-[0_0_12px_rgba(0,229,153,0.5)]"
      />
      <div className="flex justify-between mt-1">
        <span className="text-[10px] text-text-dim">1</span>
        <span className="text-[10px] text-text-dim">10</span>
      </div>
    </div>
  );
}
