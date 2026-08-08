import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import { authMiddleware, requireRole } from '../middleware/auth';

export const reviewsRouter = Router();

/**
 * POST /api/reviews
 * Judge submits or updates a review for a submission.
 */
reviewsRouter.post('/', authMiddleware, requireRole('judge', 'organizer'), async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      submissionId,
      dashboardShownInVideo,
      scoreIdea,
      scoreExecution,
      scoreZeropsUsage,
      notes,
    } = req.body;

    if (!submissionId) {
      res.status(400).json({ error: 'submissionId is required' });
      return;
    }

    // Validate scores are in range
    const scores = [scoreIdea, scoreExecution, scoreZeropsUsage].filter(s => s !== undefined && s !== null);
    for (const score of scores) {
      if (typeof score !== 'number' || score < 1 || score > 10) {
        res.status(400).json({ error: 'Scores must be integers between 1 and 10' });
        return;
      }
    }

    // Check submission exists
    const submission = await prisma.submission.findUnique({ where: { id: submissionId } });
    if (!submission) {
      res.status(404).json({ error: 'Submission not found' });
      return;
    }

    // Upsert: if this judge already reviewed this submission, update it
    const existingReview = await prisma.judgeReview.findFirst({
      where: {
        submissionId,
        judgeId: req.user!.userId,
      },
    });

    let review;
    if (existingReview) {
      review = await prisma.judgeReview.update({
        where: { id: existingReview.id },
        data: {
          dashboardShownInVideo: dashboardShownInVideo ?? existingReview.dashboardShownInVideo,
          scoreIdea: scoreIdea ?? existingReview.scoreIdea,
          scoreExecution: scoreExecution ?? existingReview.scoreExecution,
          scoreZeropsUsage: scoreZeropsUsage ?? existingReview.scoreZeropsUsage,
          notes: notes ?? existingReview.notes,
          reviewedAt: new Date(),
        },
      });
    } else {
      review = await prisma.judgeReview.create({
        data: {
          submissionId,
          judgeId: req.user!.userId,
          dashboardShownInVideo: dashboardShownInVideo ?? false,
          scoreIdea,
          scoreExecution,
          scoreZeropsUsage,
          notes,
        },
      });
    }

    res.status(existingReview ? 200 : 201).json(review);
  } catch (error) {
    console.error('[Reviews] Create/update error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
