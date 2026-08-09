import prisma from '../lib/prisma';

/**
 * Perform an uptime check for a single submission.
 * Called by the periodic scheduler.
 */
export async function checkUptime(submissionId: string): Promise<void> {
  const submission = await prisma.submission.findUnique({
    where: { id: submissionId },
    select: { id: true, liveUrl: true },
  });

  if (!submission) return;

  let isUp = false;
  let statusCode: number | null = null;
  let responseTimeMs: number | null = null;

  try {
    const start = Date.now();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const res = await fetch(submission.liveUrl, {
      method: 'GET',
      signal: controller.signal,
      redirect: 'follow',
    });
    clearTimeout(timeout);

    responseTimeMs = Date.now() - start;
    statusCode = res.status;
    isUp = res.status >= 200 && res.status < 400;
  } catch {
    isUp = false;
    statusCode = 0;
    responseTimeMs = 0;
  }

  await prisma.uptimeLog.create({
    data: {
      submissionId,
      statusCode,
      responseTimeMs,
      isUp,
    },
  });

  console.log(`[Uptime] ${submission.liveUrl} → ${isUp ? 'UP' : 'DOWN'} (${statusCode}, ${responseTimeMs}ms)`);
}

/**
 * Run uptime checks for ALL active submissions.
 * "Active" means status is not 'pending' and judging hasn't ended.
 */
export async function runAllUptimeChecks(): Promise<void> {
  const { getEventSettings } = await import('../lib/eventSettings');
  const settings = await getEventSettings();
  const judgingEnd = settings.judgingEnd;

  if (new Date() > judgingEnd) {
    console.log('[Uptime] Judging period has ended — skipping uptime checks');
    return;
  }

  const submissions = await prisma.submission.findMany({
    where: {
      status: { in: ['verifying', 'verified', 'flagged'] },
    },
    select: { id: true },
  });

  console.log(`[Uptime] Running checks for ${submissions.length} submissions`);

  // Run checks with concurrency limit to avoid overwhelming target servers
  const CONCURRENCY = 5;
  for (let i = 0; i < submissions.length; i += CONCURRENCY) {
    const batch = submissions.slice(i, i + CONCURRENCY);
    await Promise.allSettled(batch.map((s: { id: string }) => checkUptime(s.id)));
  }
}
