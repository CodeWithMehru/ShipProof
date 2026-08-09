import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSubmissions, deleteSubmission, getEventSettings, type SubmissionSummary } from '../lib/api';
import { useAuth } from '../lib/auth';
import { StatusBadge } from '../components/StatusBadge';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import {
  Search,
  Filter,
  ExternalLink,
  ChevronRight,
  RefreshCw,
  Layers,
  Activity,
  Trash2,
  Inbox,
} from 'lucide-react';

const STATUS_FILTERS = ['all', 'pending', 'verifying', 'verified', 'flagged'];

export function DashboardPage() {
  const { token, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const [submissions, setSubmissions] = useState<SubmissionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [platformDisplayName, setPlatformDisplayName] = useState('Zerops');

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    fetchData();
  }, [isAuthenticated, statusFilter]);

  const fetchData = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [data, settings] = await Promise.all([
        getSubmissions(token, statusFilter),
        getEventSettings(token)
      ]);
      setSubmissions(data);
      if (settings?.platformDisplayName) {
        setPlatformDisplayName(settings.platformDisplayName);
      }
    } catch (err) {
      console.error('Failed to load submissions:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const handleDelete = async (e: React.MouseEvent, id: string, name: string) => {
    e.stopPropagation(); // prevent row click navigating away
    if (!token) return;
    if (!window.confirm(`Permanently delete "${name}" and all its verification data? This cannot be undone.`)) return;
    try {
      await deleteSubmission(token, id);
      setSubmissions((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      alert(`Failed to delete: ${(err as Error).message}`);
    }
  };

  const filtered = submissions.filter((s) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      s.projectName.toLowerCase().includes(q) ||
      s.participantName.toLowerCase().includes(q) ||
      s.participantEmail.toLowerCase().includes(q)
    );
  });

  // Summary stats
  const totalCount = submissions.length;
  const liveCount = submissions.filter((s) => s.isUp === true).length;
  const verifiedCount = submissions.filter((s) => s.status === 'verified').length;
  const flaggedCount = submissions.filter((s) => s.status === 'flagged').length;

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1, 
      transition: { staggerChildren: 0.05, ease: "easeOut" }
    }
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.3 } }
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-10">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex items-center justify-between mb-8"
      >
        <div>
          <h1 className="text-3xl font-extrabold text-text-primary tracking-tight">Submissions</h1>
          <p className="text-text-muted text-sm mt-1.5">
            {totalCount} total submissions · {liveCount} live · {flaggedCount} flagged
          </p>
        </div>
        <button onClick={handleRefresh} className="btn-secondary" disabled={refreshing}>
          <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
          Refresh
        </button>
      </motion.div>

      {/* Summary Cards */}
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-4 gap-5 mb-10"
      >
        <motion.div variants={itemVariants} className="stat-card bg-base-elevated/50 backdrop-blur-sm border-border-subtle shadow-sm hover:border-text-dim transition-colors">
          <div className="stat-value">{totalCount}</div>
          <div className="stat-label uppercase tracking-wider text-xs font-semibold">Total Submissions</div>
        </motion.div>
        <motion.div variants={itemVariants} className="stat-card bg-base-elevated/50 backdrop-blur-sm border-border-subtle shadow-sm hover:border-status-healthy/50 transition-colors">
          <div className="stat-value text-status-healthy">{liveCount}</div>
          <div className="stat-label uppercase tracking-wider text-xs font-semibold">Currently Live</div>
        </motion.div>
        <motion.div variants={itemVariants} className="stat-card bg-base-elevated/50 backdrop-blur-sm border-border-subtle shadow-sm hover:border-accent/50 transition-colors">
          <div className="stat-value text-accent">{verifiedCount}</div>
          <div className="stat-label uppercase tracking-wider text-xs font-semibold">Verified</div>
        </motion.div>
        <motion.div variants={itemVariants} className="stat-card bg-base-elevated/50 backdrop-blur-sm border-border-subtle shadow-sm hover:border-status-warning/50 transition-colors">
          <div className="stat-value text-status-warning">{flaggedCount}</div>
          <div className="stat-label uppercase tracking-wider text-xs font-semibold">Flagged for Review</div>
        </motion.div>
      </motion.div>

      {/* Filters */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="flex items-center gap-4 mb-6"
      >
        <div className="relative flex-1 max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-dim" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, or project..."
            className="input-field pl-10 py-2.5 text-sm"
          />
        </div>
        <div className="flex items-center gap-1.5 bg-base-card border border-border-subtle rounded-input p-1">
          <Filter size={14} className="text-text-dim ml-2" />
          {STATUS_FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setStatusFilter(f)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium capitalize transition-all duration-150 ${
                statusFilter === f
                  ? 'bg-accent/10 text-accent'
                  : 'text-text-muted hover:text-text-primary hover:bg-base-elevated'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border-subtle">
                <th className="text-left text-xs font-medium text-text-dim uppercase tracking-wider px-4 py-3">Project</th>
                <th className="text-left text-xs font-medium text-text-dim uppercase tracking-wider px-4 py-3">Participant</th>
                <th className="text-center text-xs font-medium text-text-dim uppercase tracking-wider px-4 py-3">Status</th>
                <th className="text-center text-xs font-medium text-text-dim uppercase tracking-wider px-4 py-3">
                  <span className="flex items-center justify-center gap-1"><Activity size={12} />Live</span>
                </th>
                <th className="text-center text-xs font-medium text-text-dim uppercase tracking-wider px-4 py-3">{platformDisplayName}</th>
                <th className="text-center text-xs font-medium text-text-dim uppercase tracking-wider px-4 py-3">
                  <span className="flex items-center justify-center gap-1"><Layers size={12} />Services</span>
                </th>
                <th className="text-center text-xs font-medium text-text-dim uppercase tracking-wider px-4 py-3">Authenticity</th>
                <th className="text-center text-xs font-medium text-text-dim uppercase tracking-wider px-4 py-3">Reviewed</th>
                {user?.role === 'organizer' && (
                  <th className="px-4 py-3 text-xs font-medium text-text-dim uppercase tracking-wider text-center">Delete</th>
                )}
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <motion.tbody
              variants={containerVariants}
              initial="hidden"
              animate="visible"
            >
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-border-subtle">
                    {Array.from({ length: (user?.role === 'organizer' ? 10 : 9) }).map((_, j) => (
                      <td key={j} className="px-4 py-4">
                        <div className="skeleton h-4 w-20 rounded opacity-50" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-24 text-center">
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="flex flex-col items-center justify-center text-text-dim"
                    >
                      <div className="w-16 h-16 rounded-2xl bg-base-elevated flex items-center justify-center mb-4">
                        <Inbox size={28} className="text-text-muted" />
                      </div>
                      <p className="text-base font-medium text-text-primary mb-1">No submissions found</p>
                      <p className="text-sm">Try adjusting your filters or search query.</p>
                    </motion.div>
                  </td>
                </tr>
              ) : (
                <AnimatePresence>
                  {filtered.map((s) => (
                    <motion.tr
                      variants={itemVariants}
                      layout
                    key={s.id}
                    className="table-row cursor-pointer"
                    onClick={() => navigate(`/dashboard/${s.id}`)}
                  >
                    <td className="px-4 py-3.5">
                      <div className="font-medium text-sm text-text-primary">{s.projectName}</div>
                      <div className="text-xs text-text-dim mono mt-0.5 flex items-center gap-1.5">
                        <ExternalLink size={10} />
                        {new URL(s.liveUrl).hostname}
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="text-sm text-text-secondary">{s.participantName}</div>
                      <div className="text-xs text-text-dim mono">{s.participantEmail}</div>
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <StatusBadge status={s.status} size="sm" />
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      {s.isUp === null ? (
                        <span className="text-text-dim text-xs">—</span>
                      ) : (
                        <StatusBadge status={s.isUp ? 'up' : 'down'} size="sm" />
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      {s.isZeropsSubdomain === null ? (
                        <span className="text-text-dim text-xs">—</span>
                      ) : s.isZeropsSubdomain ? (
                        <StatusBadge status="yes" size="sm" />
                      ) : (
                        <StatusBadge status="custom_domain" size="sm" />
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      {s.detectedServicesCount === null ? (
                        <span className="text-text-dim text-xs">—</span>
                      ) : (
                        <span className={`text-sm font-bold mono ${
                          s.detectedServicesCount >= 3 ? 'text-status-healthy' :
                          s.detectedServicesCount >= 1 ? 'text-status-warning' : 'text-text-dim'
                        }`}>
                          {s.detectedServicesCount}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      {s.commitAuthenticity ? (
                        <StatusBadge status={s.commitAuthenticity} size="sm" />
                      ) : (
                        <span className="text-text-dim text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      {s.hasReview ? (
                        <span className="text-xs text-accent font-medium">✓ {s.reviewCount}</span>
                      ) : (
                        <span className="text-text-dim text-xs">—</span>
                      )}
                    </td>
                    {user?.role === 'organizer' && (
                      <td className="px-4 py-3.5 text-center">
                        <button
                          onClick={(e) => handleDelete(e, s.id, s.projectName)}
                          className="p-1.5 rounded-md text-text-dim hover:text-status-danger hover:bg-status-danger/10 transition-all duration-150"
                          title="Delete submission"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    )}
                    <td className="px-4 py-3.5 text-right">
                      <ChevronRight size={16} className="text-text-dim" />
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
              )}
            </motion.tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
