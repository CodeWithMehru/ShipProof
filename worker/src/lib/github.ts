import { cacheGet, cacheSet } from './queue';

const GITHUB_API = 'https://api.github.com';

/**
 * Read GITHUB_TOKEN lazily so dotenv/config has loaded by call time.
 * The old code read process.env.GITHUB_TOKEN at module-load time,
 * which was before dotenv ran — resulting in an empty token.
 */
function getToken(): string {
  return process.env.GITHUB_TOKEN || '';
}

function getHeaders(): Record<string, string> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Accept': 'application/vnd.github.v3+json',
    'User-Agent': 'ShipProof-Verifier/1.0',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

/**
 * Parse a GitHub repo URL into owner/repo format.
 * Handles: https://github.com/owner/repo, https://github.com/owner/repo.git, etc.
 */
export function parseRepoUrl(url: string): { owner: string; repo: string } | null {
  try {
    const parsed = new URL(url);
    if (!parsed.hostname.includes('github.com')) return null;

    const parts = parsed.pathname.replace(/^\//, '').replace(/\.git$/, '').split('/');
    if (parts.length < 2) return null;

    return { owner: parts[0], repo: parts[1] };
  } catch {
    return null;
  }
}

/**
 * Fetch a file's content from a GitHub repo (base64 decoded).
 * Uses Valkey cache to avoid redundant API calls.
 */
export async function fetchFileContent(
  owner: string,
  repo: string,
  path: string
): Promise<{ content: string; found: boolean }> {
  const cacheKey = `github:file:${owner}/${repo}/${path}`;
  const cached = await cacheGet(cacheKey);
  if (cached) {
    const parsed = JSON.parse(cached);
    return parsed;
  }

  const url = `${GITHUB_API}/repos/${owner}/${repo}/contents/${path}`;
  const hasToken = !!getToken();
  console.log(`[GitHub] Fetching file: ${url} (auth: ${hasToken})`);

  try {
    const res = await fetch(url, {
      headers: getHeaders(),
    });

    console.log(`[GitHub] File ${path} response: ${res.status} ${res.statusText}`);

    if (res.status === 404) {
      const result = { content: '', found: false };
      await cacheSet(cacheKey, JSON.stringify(result));
      return result;
    }

    if (!res.ok) {
      const body = await res.text();
      console.error(`[GitHub] Failed to fetch ${path}: ${res.status} ${res.statusText} — ${body}`);
      return { content: '', found: false };
    }

    const data = await res.json() as { content?: string; encoding?: string };

    if (data.content && data.encoding === 'base64') {
      const content = Buffer.from(data.content, 'base64').toString('utf-8');
      const result = { content, found: true };
      await cacheSet(cacheKey, JSON.stringify(result));
      return result;
    }

    return { content: '', found: false };
  } catch (error) {
    console.error(`[GitHub] Error fetching ${path}:`, (error as Error).message);
    return { content: '', found: false };
  }
}

export interface GitHubCommit {
  sha: string;
  message: string;
  date: string;
  additions?: number;
  deletions?: number;
}

/**
 * Fetch commit history from a GitHub repo.
 * Returns up to 100 commits (GitHub API default page size).
 */
export async function fetchCommits(
  owner: string,
  repo: string
): Promise<GitHubCommit[]> {
  const cacheKey = `github:commits:${owner}/${repo}`;
  const cached = await cacheGet(cacheKey);
  if (cached) {
    console.log(`[GitHub] Commits cache hit for ${owner}/${repo} (${JSON.parse(cached).length} commits)`);
    return JSON.parse(cached);
  }

  const url = `${GITHUB_API}/repos/${owner}/${repo}/commits?per_page=100`;
  const hasToken = !!getToken();
  console.log(`[GitHub] Fetching commits: ${url} (auth: ${hasToken})`);

  try {
    const res = await fetch(url, {
      headers: getHeaders() as Record<string, string>,
    });

    console.log(`[GitHub] Commits response: ${res.status} ${res.statusText}`);

    if (!res.ok) {
      const body = await res.text();
      console.error(`[GitHub] Failed to fetch commits for ${owner}/${repo}: ${res.status} ${res.statusText} — ${body}`);
      return [];
    }

    const data = await res.json() as Array<{
      sha: string;
      commit: {
        message: string;
        author: { date: string };
      };
      stats?: { additions: number; deletions: number };
    }>;

    const commits: GitHubCommit[] = data.map((c) => ({
      sha: c.sha.slice(0, 7),
      message: c.commit.message.split('\n')[0].slice(0, 100),
      date: c.commit.author.date,
      additions: c.stats?.additions,
      deletions: c.stats?.deletions,
    }));

    console.log(`[GitHub] Parsed ${commits.length} commits for ${owner}/${repo}`);
    if (commits.length > 0) {
      console.log(`[GitHub] First commit: ${commits[commits.length - 1].date}, Latest: ${commits[0].date}`);
    }

    await cacheSet(cacheKey, JSON.stringify(commits));
    return commits;
  } catch (error) {
    console.error(`[GitHub] Error fetching commits for ${owner}/${repo}:`, (error as Error).message);
    return [];
  }
}
