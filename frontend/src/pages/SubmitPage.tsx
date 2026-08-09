import { useState } from 'react';
import { submitProject } from '../lib/api';
import { CheckCircle, AlertCircle, GitFork, Globe, Video, User, Mail, Folder } from 'lucide-react';
import { motion, type Variants } from 'framer-motion';

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

  const containerVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut", staggerChildren: 0.1 } }
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.3 } }
  };

  if (success) {
    return (
      <div className="min-h-[85vh] flex items-center justify-center px-6">
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="max-w-md w-full text-center"
        >
          <motion.div variants={itemVariants} className="w-20 h-20 rounded-2xl bg-accent/10 flex items-center justify-center mx-auto mb-8 shadow-[0_0_40px_rgba(0,229,153,0.15)]">
            <CheckCircle className="text-accent" size={40} />
          </motion.div>
          
          <motion.h1 variants={itemVariants} className="text-4xl font-extrabold text-text-primary mb-4 tracking-tight">
            You're in!
          </motion.h1>
          
          <motion.p variants={itemVariants} className="text-text-secondary text-lg mb-8 leading-relaxed">
            Your submission has been securely received. Verification will begin automatically in the background. No further action needed.
          </motion.p>
          
          <motion.div variants={itemVariants} className="card p-6 text-left mb-8 bg-base-elevated/50 backdrop-blur-sm border-border-subtle hover:border-accent/30 transition-colors">
            <p className="text-xs text-text-dim uppercase tracking-widest mb-4 font-semibold">What happens next</p>
            <ul className="space-y-3.5 text-sm text-text-secondary">
              {[
                "We ping your live URL to confirm it's up",
                "We scan your GitHub repo for architecture signals",
                "A human judge will review your demo video",
                "Your project stays monitored until judging ends"
              ].map((text, i) => (
                <motion.li 
                  key={i}
                  variants={itemVariants}
                  className="flex items-start gap-3"
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-accent mt-1.5 shrink-0 shadow-[0_0_8px_rgba(0,229,153,0.8)]" />
                  <span className="leading-relaxed">{text}</span>
                </motion.li>
              ))}
            </ul>
          </motion.div>
          
          <motion.button
            variants={itemVariants}
            onClick={() => { setSuccess(false); setForm({ projectName: '', participantName: '', participantEmail: '', liveUrl: '', githubRepoUrl: '', demoVideoUrl: '' }); }}
            className="btn-secondary px-8 py-3 w-full sm:w-auto"
          >
            Submit another project
          </motion.button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-6 py-20 relative overflow-hidden">
      {/* Subtle background glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-accent/5 blur-[120px] rounded-full pointer-events-none" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="max-w-xl w-full relative z-10"
      >
        {/* Header */}
        <div className="text-center mb-12">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-base-elevated to-base border border-border-subtle flex items-center justify-center mx-auto mb-6 shadow-lg">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-accent">
              <path d="M21 7.5L12 3L3 7.5M21 7.5V16.5L12 21M21 7.5L12 12M3 7.5V16.5L12 21M3 7.5L12 12M12 21V12M8.5 12L11 14.5L16.5 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold text-text-primary mb-4 tracking-tight">
            Submit your project
          </h1>
          <p className="text-text-secondary text-lg mb-2">
            Almost there — paste your links to begin verification.
          </p>
          <p className="text-text-dim text-sm">
            No API tokens, no file uploads, no extra steps required.
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

          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            type="submit"
            disabled={submitting}
            className="btn-primary w-full text-base py-4 mt-4 shadow-[0_0_20px_rgba(0,229,153,0.15)]"
          >
            {submitting ? (
              <>
                <span className="w-4 h-4 border-2 border-base/30 border-t-base rounded-full animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                Submit Project
              </>
            )}
          </motion.button>
        </form>

        {/* Trust note */}
        <div className="mt-10 pt-8 border-t border-border-subtle text-center">
          <p className="text-xs text-text-dim max-w-sm mx-auto leading-relaxed">
            We never ask for your Zerops API token or any account credentials.
            Verification uses only your public URL and public GitHub repo.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
