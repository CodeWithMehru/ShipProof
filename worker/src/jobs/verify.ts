import prisma from '../lib/prisma';
import { parseRepoUrl, fetchFileContent, fetchCommits, GitHubCommit } from '../lib/github';
import { parse as parseYaml } from 'yaml';
import { getEventSettings } from '../lib/eventSettings';

/**
 * Known database/cache client library names — used as a soft signal (not proof)
 * that the project likely uses managed services.
 */
const KNOWN_DB_CACHE_LIBS = [
  // Node.js / JS
  'pg', 'pg-promise', 'postgres', 'knex', 'prisma', '@prisma/client', 'drizzle-orm',
  'mongoose', 'mongodb', 'mysql2', 'mysql', 'sequelize', 'typeorm',
  'ioredis', 'redis', 'bullmq', 'bull',
  // Python
  'psycopg2', 'psycopg2-binary', 'asyncpg', 'sqlalchemy', 'django',
  'pymongo', 'motor', 'redis', 'celery',
  // Go
  'github.com/lib/pq', 'github.com/jackc/pgx', 'github.com/go-redis/redis',
  'gorm.io/gorm', 'github.com/go-sql-driver/mysql',
];

/**
 * Run the full 4-layer verification pipeline for a submission.
 */
export async function runVerification(submissionId: string): Promise<void> {
  console.log(`[Verify] Starting verification for submission ${submissionId}`);

  // Update status to verifying
  await prisma.submission.update({
    where: { id: submissionId },
    data: { status: 'verifying' },
  });

  const submission = await prisma.submission.findUnique({
    where: { id: submissionId },
  });

  if (!submission) {
    console.error(`[Verify] Submission ${submissionId} not found`);
    return;
  }

  const eventSettings = await getEventSettings();
  const { eventStart, eventEnd } = eventSettings;

  // ─── LAYER 1: Liveness Check ─────────────────────────────────────────
  let isUp = false;
  let statusCode: number | null = null;
  let responseTimeMs: number | null = null;
  let isZeropsSubdomain = false;

  try {
    const start = Date.now();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000); // 10s timeout

    const res = await fetch(submission.liveUrl, {
      method: 'GET',
      signal: controller.signal,
      redirect: 'follow',
    });
    clearTimeout(timeout);

    responseTimeMs = Date.now() - start;
    statusCode = res.status;
    isUp = res.status >= 200 && res.status < 400;
  } catch (err) {
    console.log(`[Verify] Liveness check failed for ${submission.liveUrl}:`, (err as Error).message);
    isUp = false;
    statusCode = 0;
    responseTimeMs = 0;
  }

  // Record uptime log
  await prisma.uptimeLog.create({
    data: {
      submissionId,
      statusCode,
      responseTimeMs,
      isUp,
    },
  });

  // Check if URL matches the configured hosting domain pattern
  const domainRegex = new RegExp(eventSettings.hostingDomainPattern, 'i');
  isZeropsSubdomain = domainRegex.test(submission.liveUrl);

  // ─── LAYER 2: Architecture Check via GitHub ──────────────────────────
  const repoInfo = parseRepoUrl(submission.githubRepoUrl);
  let detectedServices: { services: string[]; raw?: string; found: boolean } = {
    services: [],
    found: false,
  };
  let dependencyHints: { libraries: string[]; files: string[]; note: string } = {
    libraries: [],
    files: [],
    note: 'Dependency hints are a weak signal — not verified proof of managed service usage.',
  };

  if (repoInfo) {
    console.log('[Verify] using requiredConfigFile:', eventSettings.requiredConfigFile);
    // Fetch and parse required config file
    const zeropsFile = await fetchFileContent(repoInfo.owner, repoInfo.repo, eventSettings.requiredConfigFile);
    if (zeropsFile.found) {
      try {
        const parsed = parseYaml(zeropsFile.content) as {
          zerops?: Array<{ setup?: string }>;
        };
        if (parsed?.zerops && Array.isArray(parsed.zerops)) {
          detectedServices = {
            services: parsed.zerops
              .filter((s) => s.setup)
              .map((s) => s.setup as string),
            raw: zeropsFile.content,
            found: true,
          };
        }
      } catch (e) {
        console.error(`[Verify] Failed to parse ${eventSettings.requiredConfigFile}:`, e);
        detectedServices = { services: [], found: true }; // File exists but unparseable
      }
    } else {
      // config file not found at root — note for manual review
      detectedServices = {
        services: [],
        found: false,
      };
    }

    // Soft signal: scan dependency files for known DB/cache libraries
    const depFiles = [
      { path: 'package.json', parser: parsePackageJson },
      { path: 'requirements.txt', parser: parseRequirementsTxt },
      { path: 'go.mod', parser: parseGoMod },
    ];

    for (const df of depFiles) {
      const file = await fetchFileContent(repoInfo.owner, repoInfo.repo, df.path);
      if (file.found) {
        const libs = df.parser(file.content);
        dependencyHints.libraries.push(...libs);
        dependencyHints.files.push(df.path);
      }
    }

    // Deduplicate
    dependencyHints.libraries = [...new Set(dependencyHints.libraries)];
  }

  // ─── LAYER 4: Commit Authenticity ────────────────────────────────────
  let commitAuthenticity = 'insufficient_data';
  let commitTimeline: { date: string; count: number }[] = [];

  if (repoInfo) {
    console.log(`[Verify] Fetching commits for ${repoInfo.owner}/${repoInfo.repo}...`);
    const commits = await fetchCommits(repoInfo.owner, repoInfo.repo);
    console.log(`[Verify] Got ${commits.length} commits for ${repoInfo.owner}/${repoInfo.repo}`);

    if (commits.length < 3) {
      commitAuthenticity = 'insufficient_data';
      console.log(`[Verify] Only ${commits.length} commits — marking as insufficient_data`);
    } else {
      // Get event window from DB (via cached settings) — fallback to wide window

      console.log(`[Verify] Event window: ${eventStart.toISOString()} → ${eventEnd.toISOString()}`);

      // Build timeline: group commits by hour within the event window
      const hourBuckets = new Map<string, number>();
      let commitsInWindow = 0;
      let commitsBeforeWindow = 0;

      for (const commit of commits) {
        const commitDate = new Date(commit.date);
        if (commitDate >= eventStart && commitDate <= eventEnd) {
          commitsInWindow++;
          // Bucket by hour
          const hourKey = commitDate.toISOString().slice(0, 13) + ':00:00Z';
          hourBuckets.set(hourKey, (hourBuckets.get(hourKey) || 0) + 1);
        } else if (commitDate < eventStart) {
          commitsBeforeWindow++;
        }
      }

      console.log(`[Verify] Commits in window: ${commitsInWindow}, before window: ${commitsBeforeWindow}`);

      // Build sorted timeline for charting
      commitTimeline = Array.from(hourBuckets.entries())
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => a.date.localeCompare(b.date));

      // Determine authenticity flag
      if (commitsInWindow === 0) {
        // No commits during the event — suspicious
        commitAuthenticity = 'review_suggested';
      } else if (commitsBeforeWindow > commitsInWindow * 2) {
        // More than 2x commits before the event vs during — suggests pre-built
        commitAuthenticity = 'review_suggested';
      } else {
        // Check distribution: are commits spread across multiple hours?
        const uniqueHours = hourBuckets.size;
        const eventHours = Math.max(1, (eventEnd.getTime() - eventStart.getTime()) / (1000 * 60 * 60));
        const spreadRatio = uniqueHours / eventHours;

        if (spreadRatio < 0.05 && commitsInWindow > 5) {
          // Very few unique hours but many commits — dumped in bursts
          commitAuthenticity = 'review_suggested';
        } else {
          commitAuthenticity = 'healthy';
        }
      }

      console.log(`[Verify] Commit authenticity: ${commitAuthenticity}, timeline entries: ${commitTimeline.length}`);
    }
  }

  // ─── Write verification results ──────────────────────────────────────
  await prisma.verificationResult.create({
    data: {
      submissionId,
      isZeropsSubdomain,
      detectedServices: detectedServices as object,
      dependencyHints: dependencyHints as object,
      commitAuthenticity,
      commitTimeline: commitTimeline as object[],
    },
  });

  // Update submission status based on results
  const hasIssues = !isUp || !isZeropsSubdomain || commitAuthenticity === 'review_suggested';
  await prisma.submission.update({
    where: { id: submissionId },
    data: { status: hasIssues ? 'flagged' : 'verified' },
  });

  console.log(`[Verify] Completed verification for ${submissionId}: ${hasIssues ? 'flagged' : 'verified'}`);
}

// ─── Dependency file parsers ───────────────────────────────────────────

function parsePackageJson(content: string): string[] {
  try {
    const pkg = JSON.parse(content) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
    const allDeps = [
      ...Object.keys(pkg.dependencies || {}),
      ...Object.keys(pkg.devDependencies || {}),
    ];
    return allDeps.filter((d) => KNOWN_DB_CACHE_LIBS.includes(d));
  } catch {
    return [];
  }
}

function parseRequirementsTxt(content: string): string[] {
  const lines = content.split('\n').map((l) => l.trim().split('==')[0].split('>=')[0].toLowerCase());
  return lines.filter((l) => KNOWN_DB_CACHE_LIBS.includes(l));
}

function parseGoMod(content: string): string[] {
  const lines = content.split('\n').map((l) => l.trim());
  return KNOWN_DB_CACHE_LIBS.filter((lib) => lines.some((line) => line.includes(lib)));
}
