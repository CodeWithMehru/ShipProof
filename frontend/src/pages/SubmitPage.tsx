import { useState } from 'react';
import { submitProject } from '../lib/api';
import { CheckCircle, AlertCircle, Rocket, GitFork, Globe, Video, User, Mail, Folder } from 'lucide-react';

export function SubmitPage() {
  const [form, setForm] = useState({
    projectName: '',
    participantName: '',
    participantEmail: '',
    liveUrl: '',
    githubRepoUrl: '',
    demoVideoUrl: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const update = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      await submitProject(form);
      setSuccess(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-6">
        <div className="max-w-md w-full text-center animate-fade-in">
          <div className="w-20 h-20 rounded-2xl bg-accent/10 flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="text-accent" size={40} />
          </div>
          <h1 className="text-3xl font-bold text-text-primary mb-3">You're in! 🚀</h1>
          <p className="text-text-secondary text-lg mb-2">
            Your submission has been received.
          </p>
          <p className="text-text-muted text-sm mb-8">
            Verification will begin automatically — we'll check your live URL, GitHub repo, and commit history.
            No action needed from your side.
          </p>
          <div className="card p-4 text-left">
            <p className="text-xs text-text-dim uppercase tracking-widest mb-2 font-medium">What happens next</p>
            <ul className="space-y-2 text-sm text-text-secondary">
              <li className="flex items-start gap-2">
                <span className="text-accent mt-0.5">•</span>
                We ping your live URL to confirm it's up
              </li>
              <li className="flex items-start gap-2">
                <span className="text-accent mt-0.5">•</span>
                We scan your GitHub repo for architecture signals
              </li>
              <li className="flex items-start gap-2">
                <span className="text-accent mt-0.5">•</span>
                A human judge will review your demo video
              </li>
              <li className="flex items-start gap-2">
                <span className="text-accent mt-0.5">•</span>
                Your project stays monitored until judging ends
              </li>
            </ul>
          </div>
          <button
            onClick={() => { setSuccess(false); setForm({ projectName: '', participantName: '', participantEmail: '', liveUrl: '', githubRepoUrl: '', demoVideoUrl: '' }); }}
            className="btn-secondary mt-6"
          >
            Submit another project
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-6 py-16">
      <div className="max-w-lg w-full animate-slide-up">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="w-14 h-14 rounded-2xl bg-accent/10 flex items-center justify-center mx-auto mb-5">
            <Rocket className="text-accent" size={28} />
          </div>
          <h1 className="text-3xl font-bold text-text-primary mb-2 tracking-tight">
            Submit your project
          </h1>
          <p className="text-text-secondary text-base">
            Almost there — just paste your links and you're done.
          </p>
          <p className="text-text-dim text-sm mt-1">
            No API tokens, no file uploads, no extra steps.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="label flex items-center gap-1.5">
              <Folder size={14} className="text-text-dim" />
              Project Name
            </label>
            <input
              type="text"
              value={form.projectName}
              onChange={update('projectName')}
              placeholder="e.g. CloudPulse, TaskHive, DevBoard..."
              className="input-field"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label flex items-center gap-1.5">
                <User size={14} className="text-text-dim" />
                Your Name
              </label>
              <input
                type="text"
                value={form.participantName}
                onChange={update('participantName')}
                placeholder="Ada Lovelace"
                className="input-field"
                required
              />
            </div>
            <div>
              <label className="label flex items-center gap-1.5">
                <Mail size={14} className="text-text-dim" />
                Email
              </label>
              <input
                type="email"
                value={form.participantEmail}
                onChange={update('participantEmail')}
                placeholder="ada@example.com"
                className="input-field"
                required
              />
            </div>
          </div>

          <div>
            <label className="label flex items-center gap-1.5">
              <Globe size={14} className="text-text-dim" />
              Live URL
            </label>
            <input
              type="url"
              value={form.liveUrl}
              onChange={update('liveUrl')}
              placeholder="https://my-app-123-3000.prg1.zerops.app"
              className="input-field mono text-sm"
              required
            />
            <p className="text-xs text-text-dim mt-1">
              Your deployed app's public URL. Zerops subdomains (*.zerops.app) are auto-detected.
            </p>
          </div>

          <div>
            <label className="label flex items-center gap-1.5">
              <GitFork size={14} className="text-text-dim" />
              GitHub Repository
            </label>
            <input
              type="url"
              value={form.githubRepoUrl}
              onChange={update('githubRepoUrl')}
              placeholder="https://github.com/username/my-hackathon-project"
              className="input-field mono text-sm"
              required
            />
          </div>

          <div>
            <label className="label flex items-center gap-1.5">
              <Video size={14} className="text-text-dim" />
              Demo Video URL
            </label>
            <input
              type="url"
              value={form.demoVideoUrl}
              onChange={update('demoVideoUrl')}
              placeholder="https://youtube.com/watch?v=... or https://loom.com/share/..."
              className="input-field mono text-sm"
              required
            />
            <p className="text-xs text-text-dim mt-1">
              Make sure your video shows your Zerops project dashboard with your services list.
            </p>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-status-danger text-sm bg-status-danger/8 p-3 rounded-input animate-fade-in">
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="btn-primary w-full text-base py-3.5"
          >
            {submitting ? (
              <>
                <span className="w-4 h-4 border-2 border-base/30 border-t-base rounded-full animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <Rocket size={18} />
                Submit Project
              </>
            )}
          </button>
        </form>

        {/* Trust note */}
        <p className="text-center text-xs text-text-dim mt-8 max-w-sm mx-auto leading-relaxed">
          We never ask for your Zerops API token or any account credentials.
          Verification uses only your public URL and public GitHub repo.
        </p>
      </div>
    </div>
  );
}
