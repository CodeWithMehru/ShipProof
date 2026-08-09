const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

interface RequestOptions {
  method?: string;
  body?: unknown;
  token?: string;
}

async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, token } = options;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}${endpoint}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || `HTTP ${res.status}`);
  }

  return res.json();
}

// ─── Auth ──────────────────────────────────────────────────────────────

export interface LoginResponse {
  token: string;
  user: { id: string; email: string; role: string };
}

export function login(email: string, password: string): Promise<LoginResponse> {
  return request('/api/auth/login', { method: 'POST', body: { email, password } });
}

// ─── Submissions ───────────────────────────────────────────────────────

export interface SubmissionInput {
  projectName: string;
  participantName: string;
  participantEmail: string;
  liveUrl: string;
  githubRepoUrl: string;
  demoVideoUrl: string;
}

export function submitProject(data: SubmissionInput) {
  return request('/api/submissions', { method: 'POST', body: data });
}

export interface SubmissionSummary {
  id: string;
  projectName: string;
  participantName: string;
  participantEmail: string;
  liveUrl: string;
  githubRepoUrl: string;
  demoVideoUrl: string;
  submittedAt: string;
  status: string;
  isZeropsSubdomain: boolean | null;
  detectedServicesCount: number | null;
  commitAuthenticity: string | null;
  isUp: boolean | null;
  lastCheckedAt: string | null;
  reviewCount: number;
  hasReview: boolean;
}

export function getSubmissions(token: string, status?: string): Promise<SubmissionSummary[]> {
  const query = status && status !== 'all' ? `?status=${status}` : '';
  return request(`/api/submissions${query}`, { token });
}

export function deleteSubmission(token: string, id: string): Promise<{ message: string }> {
  return request(`/api/submissions/${id}`, { method: 'DELETE', token });
}

export function clearAllSubmissions(token: string): Promise<{ message: string; count: number }> {
  return request('/api/submissions', { method: 'DELETE', token });
}

export interface VerificationResult {
  id: string;
  submissionId: string;
  isZeropsSubdomain: boolean | null;
  detectedServices: { services: string[]; raw?: string; found: boolean } | null;
  dependencyHints: { libraries: string[]; files: string[]; note: string } | null;
  commitAuthenticity: string | null;
  commitTimeline: { date: string; count: number }[] | null;
  checkedAt: string;
}

export interface UptimeLog {
  id: string;
  submissionId: string;
  checkedAt: string;
  statusCode: number | null;
  responseTimeMs: number | null;
  isUp: boolean | null;
}

export interface JudgeReview {
  id: string;
  submissionId: string;
  judgeId: string;
  dashboardShownInVideo: boolean;
  scoreIdea: number | null;
  scoreExecution: number | null;
  scoreZeropsUsage: number | null;
  notes: string | null;
  reviewedAt: string;
  judge: { id: string; email: string; role: string };
}

export interface SubmissionDetail {
  id: string;
  projectName: string;
  participantName: string;
  participantEmail: string;
  liveUrl: string;
  githubRepoUrl: string;
  demoVideoUrl: string;
  submittedAt: string;
  status: string;
  verificationResults: VerificationResult[];
  uptimeLogs: UptimeLog[];
  reviews: JudgeReview[];
}

export function getSubmissionDetail(token: string, id: string): Promise<SubmissionDetail> {
  return request(`/api/submissions/${id}`, { token });
}

export function getUptimeLogs(token: string, id: string): Promise<UptimeLog[]> {
  return request(`/api/submissions/${id}/uptime`, { token });
}

// ─── Reviews ───────────────────────────────────────────────────────────

export interface ReviewInput {
  submissionId: string;
  dashboardShownInVideo?: boolean;
  scoreIdea?: number;
  scoreExecution?: number;
  scoreZeropsUsage?: number;
  notes?: string;
}

export function submitReview(token: string, data: ReviewInput) {
  return request('/api/reviews', { method: 'POST', body: data, token });
}

// ─── Reports ───────────────────────────────────────────────────────────

export interface SponsorReport {
  generatedAt: string;
  totalSubmissions: number;
  liveSubmissions: number;
  percentLive: number;
  zeropsHosted: number;
  percentZeropsHosted: number;
  multiServiceSubmissions: number;
  percentMultiService: number;
  authenticityDistribution: {
    healthy: number;
    reviewSuggested: number;
    insufficientData: number;
  };
  averageScores: {
    idea: number | null;
    execution: number | null;
    zeropsUsage: number | null;
  };
  totalReviews: number;
}

export function getSponsorReport(token: string): Promise<SponsorReport> {
  return request('/api/reports/sponsor', { token });
}

export function downloadCSVReport(token: string): void {
  const url = `${API_URL}/api/reports/sponsor?format=csv`;
  const a = document.createElement('a');
  // We need to fetch with auth header, so we can't just set href
  fetch(url, { headers: { Authorization: `Bearer ${token}` } })
    .then(res => res.blob())
    .then(blob => {
      a.href = URL.createObjectURL(blob);
      a.download = 'shipproof-sponsor-report.csv';
      a.click();
    });
}

// ─── Event Settings ────────────────────────────────────────────────────

export interface EventSettings {
  eventStart: string;
  eventEnd: string;
  judgingEnd: string;
  updatedAt: string;
}

export function getEventSettings(token: string): Promise<EventSettings> {
  return request('/api/settings/event', { token });
}

export function updateEventSettings(
  token: string,
  data: { eventStart: string; eventEnd: string; judgingEnd: string }
): Promise<EventSettings> {
  return request('/api/settings/event', { method: 'PUT', body: data, token });
}
