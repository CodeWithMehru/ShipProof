import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { getSponsorReport, downloadCSVReport, type SponsorReport } from '../lib/api';
import { useAuth } from '../lib/auth';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Download, FileBarChart, TrendingUp, Shield, Layers, Activity } from 'lucide-react';

export function ReportPage() {
  const { token, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const [report, setReport] = useState<SponsorReport | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) { navigate('/login'); return; }
    if (user?.role !== 'organizer') { navigate('/dashboard'); return; }
    fetchReport();
  }, [isAuthenticated]);

  const fetchReport = async () => {
    if (!token) return;
    try {
      const data = await getSponsorReport(token);
      setReport(data);
    } catch (err) {
      console.error('Failed to load report:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !report) {
    return (
      <div className="max-w-5xl mx-auto px-6 py-12">
        <div className="space-y-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="skeleton h-32 rounded-card" />
          ))}
        </div>
      </div>
    );
  }

  const authenticityData = [
    { name: 'Healthy', value: report.authenticityDistribution.healthy, color: '#00E599' },
    { name: 'Review Suggested', value: report.authenticityDistribution.reviewSuggested, color: '#F59E0B' },
    { name: 'Insufficient Data', value: report.authenticityDistribution.insufficientData, color: '#71717A' },
  ].filter(d => d.value > 0);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-5xl mx-auto px-6 py-12"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-10">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
              <FileBarChart className="text-accent" size={22} />
            </div>
            <h1 className="text-3xl font-bold text-text-primary tracking-tight">Sponsor Report</h1>
          </div>
          <p className="text-text-muted text-sm">
            Generated {new Date(report.generatedAt).toLocaleString()} · Presentation-ready summary
          </p>
        </div>
        <button onClick={() => token && downloadCSVReport(token)} className="btn-primary">
          <Download size={16} />
          Export CSV
        </button>
      </div>

      {/* Big Numbers */}
      <div className="grid grid-cols-4 gap-5 mb-10">
        <BigStat
          value={report.totalSubmissions}
          label="Total Submissions"
          icon={<TrendingUp size={20} />}
        />
        <BigStat
          value={`${report.percentLive}%`}
          label="Verified Live"
          sublabel={`${report.liveSubmissions} of ${report.totalSubmissions}`}
          icon={<Activity size={20} />}
          accent
        />
        <BigStat
          value={`${report.percentMultiService}%`}
          label="Multi-Service (3+)"
          sublabel={`${report.multiServiceSubmissions} submissions`}
          icon={<Layers size={20} />}
          accent
        />
        <BigStat
          value={`${report.percentZeropsHosted}%`}
          label="Zerops Hosted"
          sublabel={`${report.zeropsHosted} confirmed`}
          icon={<Shield size={20} />}
          accent
        />
      </div>

      {/* Two-column: Authenticity + Scores */}
      <div className="grid grid-cols-2 gap-6 mb-10">
        {/* Authenticity Distribution */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-text-primary mb-6">Authenticity Distribution</h2>
          <div className="flex items-center gap-8">
            <div className="w-40 h-40">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={authenticityData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={70}
                    dataKey="value"
                    strokeWidth={0}
                  >
                    {authenticityData.map((entry, index) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#18181B',
                      border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: '8px',
                      color: '#FAFAFA',
                      fontSize: '13px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-3 flex-1">
              {authenticityData.map((d) => (
                <div key={d.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: d.color }} />
                    <span className="text-sm text-text-secondary">{d.name}</span>
                  </div>
                  <span className="text-sm font-bold mono text-text-primary">{d.value}</span>
                </div>
              ))}
            </div>
          </div>
          <p className="text-xs text-text-dim mt-4 italic">
            Authenticity flags are signals for human review, not automated verdicts.
          </p>
        </div>

        {/* Average Scores */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-text-primary mb-6">Average Scores</h2>
          <div className="space-y-5">
            <ScoreBar label="Idea" value={report.averageScores.idea} />
            <ScoreBar label="Execution" value={report.averageScores.execution} />
            <ScoreBar label="Zerops Usage" value={report.averageScores.zeropsUsage} />
          </div>
          <div className="mt-6 pt-4 border-t border-border-subtle">
            <div className="flex items-center justify-between text-sm">
              <span className="text-text-muted">Total Reviews</span>
              <span className="text-text-primary font-bold mono">{report.totalReviews}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer note */}
      <div className="card p-5 text-center">
        <p className="text-xs text-text-dim leading-relaxed max-w-2xl mx-auto">
          ShipProof automates what can be honestly automated without violating anyone's account security,
          and clearly hands off to a human judge for anything it cannot prove with certainty.
          This report reflects automated signals + human reviews combined.
        </p>
      </div>
    </motion.div>
  );
}

function BigStat({ value, label, sublabel, icon, accent = false }: {
  value: string | number;
  label: string;
  sublabel?: string;
  icon: React.ReactNode;
  accent?: boolean;
}) {
  return (
    <div className="card p-6">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${
        accent ? 'bg-accent/10 text-accent' : 'bg-base-elevated text-text-muted'
      }`}>
        {icon}
      </div>
      <div className={`text-4xl font-bold tracking-tight mb-1 ${accent ? 'text-accent' : 'text-text-primary'}`}>
        {value}
      </div>
      <div className="text-sm text-text-muted">{label}</div>
      {sublabel && <div className="text-xs text-text-dim mt-0.5">{sublabel}</div>}
    </div>
  );
}

function ScoreBar({ label, value }: { label: string; value: number | null }) {
  const width = value ? (value / 10) * 100 : 0;
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-sm text-text-secondary">{label}</span>
        <span className="text-lg font-bold mono text-accent">{value ?? '—'}</span>
      </div>
      <div className="h-2 bg-base rounded-full overflow-hidden">
        <div
          className="h-full bg-accent rounded-full transition-all duration-500"
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  );
}
