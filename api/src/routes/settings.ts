import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import { authMiddleware, requireRole } from '../middleware/auth';

export const settingsRouter = Router();

/**
 * GET /api/settings/event
 * Any authenticated user can read the current event dates.
 */
settingsRouter.get('/event', authMiddleware, async (_req: Request, res: Response): Promise<void> => {
  try {
    let settings = await prisma.eventSettings.findUnique({
      where: { id: 'singleton' },
    });

    if (!settings) {
      // Auto-create with defaults if it doesn't exist
      settings = await prisma.eventSettings.create({
        data: {
          id: 'singleton',
          eventStart: new Date('2026-08-01T00:00:00Z'),
          eventEnd: new Date('2026-08-31T23:59:59Z'),
          judgingEnd: new Date('2026-09-07T23:59:59Z'),
          hostingDomainPattern: '\\.zerops\\.app\\b',
          requiredConfigFile: 'zerops.yaml',
          platformDisplayName: 'Zerops',
        },
      });
    }

    res.json({
      eventStart: settings.eventStart.toISOString(),
      eventEnd: settings.eventEnd.toISOString(),
      judgingEnd: settings.judgingEnd.toISOString(),
      hostingDomainPattern: settings.hostingDomainPattern,
      requiredConfigFile: settings.requiredConfigFile,
      platformDisplayName: settings.platformDisplayName,
      updatedAt: settings.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error('[Settings] GET event error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PUT /api/settings/event
 * Organizer-only — update the event date configuration.
 */
settingsRouter.put('/event', authMiddleware, requireRole('organizer'), async (req: Request, res: Response): Promise<void> => {
  try {
    const { 
      eventStart, 
      eventEnd, 
      judgingEnd,
      hostingDomainPattern,
      requiredConfigFile,
      platformDisplayName
    } = req.body;

    if (!eventStart || !eventEnd || !judgingEnd) {
      res.status(400).json({ error: 'eventStart, eventEnd, and judgingEnd are all required' });
      return;
    }

    if (
      typeof hostingDomainPattern !== 'string' ||
      typeof requiredConfigFile !== 'string' ||
      typeof platformDisplayName !== 'string'
    ) {
      res.status(400).json({ error: 'Verification configuration fields are required and must be strings' });
      return;
    }

    // Validate they're parsable dates
    const start = new Date(eventStart);
    const end = new Date(eventEnd);
    const judging = new Date(judgingEnd);

    if (isNaN(start.getTime()) || isNaN(end.getTime()) || isNaN(judging.getTime())) {
      res.status(400).json({ error: 'All dates must be valid ISO 8601 date strings' });
      return;
    }

    if (start >= end) {
      res.status(400).json({ error: 'eventStart must be before eventEnd' });
      return;
    }

    if (end > judging) {
      res.status(400).json({ error: 'judgingEnd must be on or after eventEnd' });
      return;
    }

    const settings = await prisma.eventSettings.upsert({
      where: { id: 'singleton' },
      update: {
        eventStart: start,
        eventEnd: end,
        judgingEnd: judging,
        hostingDomainPattern,
        requiredConfigFile,
        platformDisplayName,
      },
      create: {
        id: 'singleton',
        eventStart: start,
        eventEnd: end,
        judgingEnd: judging,
        hostingDomainPattern,
        requiredConfigFile,
        platformDisplayName,
      },
    });

    console.log(`[Settings] Event dates updated by ${req.user?.email}: ${start.toISOString()} → ${end.toISOString()}, judging until ${judging.toISOString()}`);

    res.json({
      eventStart: settings.eventStart.toISOString(),
      eventEnd: settings.eventEnd.toISOString(),
      judgingEnd: settings.judgingEnd.toISOString(),
      hostingDomainPattern: settings.hostingDomainPattern,
      requiredConfigFile: settings.requiredConfigFile,
      platformDisplayName: settings.platformDisplayName,
      updatedAt: settings.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error('[Settings] PUT event error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
