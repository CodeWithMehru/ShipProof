import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import { authMiddleware, requireRole } from '../middleware/auth';

export const reportsRouter = Router();

/**
 * GET /api/reports/sponsor
 * Organizer-only aggregate stats for sponsor reporting.
 * Returns JSON by default, CSV if ?format=csv
 */
reportsRouter.get('/sponsor', authMiddleware, requireRole('organizer'), async (req: Request, res: Response): Promise<void> => {
  try {
    const totalSubmissions = await prisma.submission.count();

    // Submissions that have at least one uptime check showing isUp=true
    const liveSubmissions = await prisma.submission.count({
      where: {
        uptimeLogs: {
          some: { isUp: true },
        },
      },
    });

    // Submissions where zerops subdomain was detected
    const zeropsHosted = await prisma.submission.count({
      where: {
        verificationResults: {
          some: { isZeropsSubdomain: true },
        },
      },
    });

    // Submissions with 3+ detected services (multi-service)
    const allVerifications = await prisma.verificationResult.findMany({
      select: { submissionId: true, detectedServices: true },
    });
    const multiServiceIds = new Set<string>();
    for (const vr of allVerifications) {
      const services = vr.detectedServices as { services?: unknown[] } | null;
      if (services?.services && services.services.length >= 3) {
        multiServiceIds.add(vr.submissionId);
      }
    }

    // Authenticity distribution
    const healthyCount = await prisma.verificationResult.count({
      where: { commitAuthenticity: 'healthy' },
    });
    const reviewSuggestedCount = await prisma.verificationResult.count({
      where: { commitAuthenticity: 'review_suggested' },
    });
    const insufficientDataCount = await prisma.verificationResult.count({
      where: { commitAuthenticity: 'insufficient_data' },
    });

    // Average scores
    const reviewAgg = await prisma.judgeReview.aggregate({
      _avg: {
        scoreIdea: true,
        scoreExecution: true,
        scoreZeropsUsage: true,
      },
      _count: true,
    });

    const report = {
      generatedAt: new Date().toISOString(),
      totalSubmissions,
      liveSubmissions,
      percentLive: totalSubmissions > 0 ? Math.round((liveSubmissions / totalSubmissions) * 100) : 0,
      zeropsHosted,
      percentZeropsHosted: totalSubmissions > 0 ? Math.round((zeropsHosted / totalSubmissions) * 100) : 0,
      multiServiceSubmissions: multiServiceIds.size,
      percentMultiService: totalSubmissions > 0 ? Math.round((multiServiceIds.size / totalSubmissions) * 100) : 0,
      authenticityDistribution: {
        healthy: healthyCount,
        reviewSuggested: reviewSuggestedCount,
        insufficientData: insufficientDataCount,
      },
      averageScores: {
        idea: reviewAgg._avg.scoreIdea ? Math.round(reviewAgg._avg.scoreIdea * 10) / 10 : null,
        execution: reviewAgg._avg.scoreExecution ? Math.round(reviewAgg._avg.scoreExecution * 10) / 10 : null,
        zeropsUsage: reviewAgg._avg.scoreZeropsUsage ? Math.round(reviewAgg._avg.scoreZeropsUsage * 10) / 10 : null,
      },
      totalReviews: reviewAgg._count,
    };

    if (req.query.format === 'csv') {
      const csv = [
        'Metric,Value',
        `Total Submissions,${report.totalSubmissions}`,
        `Live Submissions,${report.liveSubmissions}`,
        `% Live,${report.percentLive}%`,
        `Zerops Hosted,${report.zeropsHosted}`,
        `% Zerops Hosted,${report.percentZeropsHosted}%`,
        `Multi-Service (3+),${report.multiServiceSubmissions}`,
        `% Multi-Service,${report.percentMultiService}%`,
        `Authenticity: Healthy,${report.authenticityDistribution.healthy}`,
        `Authenticity: Review Suggested,${report.authenticityDistribution.reviewSuggested}`,
        `Authenticity: Insufficient Data,${report.authenticityDistribution.insufficientData}`,
        `Avg Score - Idea,${report.averageScores.idea ?? 'N/A'}`,
        `Avg Score - Execution,${report.averageScores.execution ?? 'N/A'}`,
        `Avg Score - Zerops Usage,${report.averageScores.zeropsUsage ?? 'N/A'}`,
        `Total Reviews,${report.totalReviews}`,
      ].join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=shipproof-sponsor-report.csv');
      res.send(csv);
      return;
    }

    res.json(report);
  } catch (error) {
    console.error('[Reports] Sponsor report error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
