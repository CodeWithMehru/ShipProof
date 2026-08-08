import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSubmissions, type SubmissionSummary } from '../lib/api';
import { useAuth } from '../lib/auth';
import { StatusBadge } from '../components/StatusBadge';
import {
  Search,
  Filter,
  ExternalLink,
  ChevronRight,
  RefreshCw,
  Layers,
  Activity,
} from 'lucide-react';

const STATUS_FILTERS = ['all', 'pending', 'verifying', 'verified', 'flagged'];

export function DashboardPage() {
  const { token, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [submissions, setSubmissions] = useState<SubmissionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);

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
      const data = await getSubmissions(token, statusFilter);
      setSubmissions(data);
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

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-text-primary tracking-tight">Submissions</h1>
          <p className="text-text-muted text-sm mt-1">
            {totalCount} total submissions · {liveCount} live · {flaggedCount} flagged
          </p>
        </div>
        <button onClick={handleRefresh} className="btn-secondary" disabled={refreshing}>
          <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <div className="stat-card">
          <div className="stat-value">{totalCount}</div>
          <div className="stat-label">Total Submissions</div>
        </div>
        <div className="stat-card">
          <div className="stat-value text-status-healthy">{liveCount}</div>
          <div className="stat-label">Currently Live</div>
        </div>
        <div className="stat-card">
          <div className="stat-value text-accent">{verifiedCount}</div>
          <div className="stat-label">Verified</div>
        </div>
        <div className="stat-card">
          <div className="stat-value text-status-warning">{flaggedCount}</div>
          <div className="stat-label">Flagged for Review</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 mb-6">
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
      </div>

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
                <th className="text-center text-xs font-medium text-text-dim uppercase tracking-wider px-4 py-3">Zerops</th>
                <th className="text-center text-xs font-medium text-text-dim uppercase tracking-wider px-4 py-3">
                  <span className="flex items-center justify-center gap-1"><Layers size={12} />Services</span>
                </th>
                <th className="text-center text-xs font-medium text-text-dim uppercase tracking-wider px-4 py-3">Authenticity</th>
                <th className="text-center text-xs font-medium text-text-dim uppercase tracking-wider px-4 py-3">Reviewed</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="table-row">
                    {Array.from({ length: 9 }).map((_, j) => (
                      <td key={j} className="px-4 py-4">
                        <div className="skeleton h-4 w-20 rounded" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-text-dim text-sm">
                    No submissions found
                  </td>
                </tr>
              ) : (
                filtered.map((s) => (
                  <tr
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
                    <td className="px-4 py-3.5 text-right">
                      <ChevronRight size={16} className="text-text-dim" />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
