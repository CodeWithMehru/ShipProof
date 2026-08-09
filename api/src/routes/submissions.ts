import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import { authMiddleware, requireRole } from '../middleware/auth';
import { enqueueJob } from '../lib/queue';

export const submissionsRouter = Router();

/**
 * POST /api/submissions
 * Public endpoint — submit a hackathon project.
 * Immediately enqueues a verification job for the worker.
 */
submissionsRouter.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      projectName,
      participantName,
      participantEmail,
      liveUrl,
      githubRepoUrl,
      demoVideoUrl,
    } = req.body;

    // Basic validation
    if (!projectName || !participantName || !participantEmail || !liveUrl || !githubRepoUrl || !demoVideoUrl) {
      res.status(400).json({
        error: 'All fields are required: projectName, participantName, participantEmail, liveUrl, githubRepoUrl, demoVideoUrl',
      });
      return;
    }

    // URL format validation
    try {
      new URL(liveUrl);
      new URL(githubRepoUrl);
      new URL(demoVideoUrl);
    } catch {
      res.status(400).json({ error: 'liveUrl, githubRepoUrl, and demoVideoUrl must be valid URLs' });
      return;
    }

    // GitHub URL must point to github.com
    if (!githubRepoUrl.includes('github.com')) {
      res.status(400).json({ error: 'githubRepoUrl must be a GitHub repository URL' });
      return;
    }

    const submission = await prisma.submission.create({
      data: {
        projectName,
        participantName,
        participantEmail,
        liveUrl,
        githubRepoUrl,
        demoVideoUrl,
        status: 'pending',
      },
    });

    // Enqueue verification job for the worker
    try {
      await enqueueJob('verify', { submissionId: submission.id });
    } catch (queueErr) {
      // If queue is down, submission still saved — worker can pick it up later
      console.error('[Submissions] Queue enqueue failed:', queueErr);
    }

    res.status(201).json({
      message: 'Submission received — verification will begin shortly.',
      submission: {
        id: submission.id,
        projectName: submission.projectName,
        status: submission.status,
        submittedAt: submission.submittedAt,
      },
    });
  } catch (error) {
    console.error('[Submissions] Create error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/submissions
 * Judge/organizer only — list all submissions with latest verification state.
 */
submissionsRouter.get('/', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { status, sort, order } = req.query;

    const where = status && status !== 'all' ? { status: status as string } : {};

    const submissions = await prisma.submission.findMany({
      where,
      include: {
        verificationResults: {
          orderBy: { checkedAt: 'desc' },
          take: 1,
        },
        uptimeLogs: {
          orderBy: { checkedAt: 'desc' },
          take: 1,
        },
        reviews: {
          select: {
            id: true,
            dashboardShownInVideo: true,
            scoreIdea: true,
            scoreExecution: true,
            scoreZeropsUsage: true,
          },
        },
      },
      orderBy: {
        [sort as string || 'submittedAt']: order === 'asc' ? 'asc' : 'desc',
      },
    });

    // Flatten for the dashboard table
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = submissions.map((s: any) => {
      const vr = s.verificationResults[0] || null;
      const latestUptime = s.uptimeLogs[0] || null;
      return {
        id: s.id,
        projectName: s.projectName,
        participantName: s.participantName,
        participantEmail: s.participantEmail,
        liveUrl: s.liveUrl,
        githubRepoUrl: s.githubRepoUrl,
        demoVideoUrl: s.demoVideoUrl,
        submittedAt: s.submittedAt,
        status: s.status,
        // Verification summary
        isZeropsSubdomain: vr?.isZeropsSubdomain ?? null,
        detectedServicesCount: vr?.detectedServices
          ? (vr.detectedServices as { services?: unknown[] })?.services?.length ?? 0
          : null,
        commitAuthenticity: vr?.commitAuthenticity ?? null,
        // Latest uptime
        isUp: latestUptime?.isUp ?? null,
        lastCheckedAt: latestUptime?.checkedAt ?? null,
        // Review summary
        reviewCount: s.reviews.length,
        hasReview: s.reviews.length > 0,
      };
    });

    res.json(result);
  } catch (error) {
    console.error('[Submissions] List error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/submissions/:id
 * Full detail including verification_results, uptime_logs, reviews.
 */
submissionsRouter.get('/:id', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const submission = await prisma.submission.findUnique({
      where: { id: req.params.id },
      include: {
        verificationResults: {
          orderBy: { checkedAt: 'desc' },
        },
        uptimeLogs: {
          orderBy: { checkedAt: 'desc' },
        },
        reviews: {
          include: {
            judge: {
              select: { id: true, email: true, role: true },
            },
          },
          orderBy: { reviewedAt: 'desc' },
        },
      },
    });

    if (!submission) {
      res.status(404).json({ error: 'Submission not found' });
      return;
    }

    res.json(submission);
  } catch (error) {
    console.error('[Submissions] Detail error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/submissions/:id/uptime
 * Uptime history for charting — returns the last 200 data points.
 */
submissionsRouter.get('/:id/uptime', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const logs = await prisma.uptimeLog.findMany({
      where: { submissionId: req.params.id },
      orderBy: { checkedAt: 'asc' },
      take: 200,
    });

    res.json(logs);
  } catch (error) {
    console.error('[Submissions] Uptime error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DELETE /api/submissions/:id
 * Organizer-only — permanently delete a single submission and all its
 * cascaded data (verification_results, uptime_logs, judge_reviews).
 * Cascade is enforced at the database level via ON DELETE CASCADE.
 */
submissionsRouter.delete('/:id', authMiddleware, requireRole('organizer'), async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const existing = await prisma.submission.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ error: 'Submission not found' });
      return;
    }

    await prisma.submission.delete({ where: { id } });

    console.log(`[Submissions] Deleted submission ${id} (${existing.projectName}) by organizer ${req.user?.email}`);
    res.status(200).json({ message: `Submission "${existing.projectName}" deleted.` });
  } catch (error) {
    console.error('[Submissions] Delete error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DELETE /api/submissions
 * Organizer-only — delete ALL submissions (and their cascaded data) in one
 * operation. Intended for resetting the platform between hackathons.
 * Uses deleteMany which triggers the DB-level CASCADE on related rows.
 */
submissionsRouter.delete('/', authMiddleware, requireRole('organizer'), async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await prisma.submission.deleteMany({});
    console.log(`[Submissions] Cleared all ${result.count} submissions by organizer ${req.user?.email}`);
    res.status(200).json({ message: `All ${result.count} submissions have been permanently deleted.`, count: result.count });
  } catch (error) {
    console.error('[Submissions] Clear-all error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
