import prisma from './prisma';

interface EventSettingsCache {
  eventStart: Date;
  eventEnd: Date;
  judgingEnd: Date;
  hostingDomainPattern: string;
  requiredConfigFile: string;
  platformDisplayName: string;
}

let cache: EventSettingsCache | null = null;
let cacheExpiry = 0;

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Read event settings from the database, cached in memory for 5 minutes.
 * Falls back to wide-open defaults if the settings row doesn't exist yet.
 */
export async function getEventSettings(): Promise<EventSettingsCache> {
  const now = Date.now();

  if (cache && now < cacheExpiry) {
    return cache;
  }

  try {
    const settings = await prisma.eventSettings.findUnique({
      where: { id: 'singleton' },
    });

    if (settings) {
      cache = {
        eventStart: settings.eventStart,
        eventEnd: settings.eventEnd,
        judgingEnd: settings.judgingEnd,
        hostingDomainPattern: settings.hostingDomainPattern,
        requiredConfigFile: settings.requiredConfigFile,
        platformDisplayName: settings.platformDisplayName,
      };
      console.log(`[EventSettings] Loaded from DB — window: ${cache.eventStart.toISOString()} → ${cache.eventEnd.toISOString()}`);
    } else {
      // Fallback: wide-open window so nothing breaks before seed runs
      cache = {
        eventStart: new Date('2026-01-01T00:00:00Z'),
        eventEnd: new Date('2026-12-31T23:59:59Z'),
        judgingEnd: new Date('2027-01-31T23:59:59Z'),
        hostingDomainPattern: '\\.zerops\\.app\\b',
        requiredConfigFile: 'zerops.yaml',
        platformDisplayName: 'Zerops',
      };
      console.warn('[EventSettings] No settings row found — using fallback defaults');
    }

    cacheExpiry = now + CACHE_TTL_MS;
    return cache;
  } catch (error) {
    console.error('[EventSettings] DB read failed:', (error as Error).message);

    // If we have stale cache, reuse it; otherwise use fallback
    if (cache) {
      console.warn('[EventSettings] Reusing stale cache');
      return cache;
    }

    return {
      eventStart: new Date('2026-01-01T00:00:00Z'),
      eventEnd: new Date('2026-12-31T23:59:59Z'),
      judgingEnd: new Date('2027-01-31T23:59:59Z'),
      hostingDomainPattern: '\\.zerops\\.app\\b',
      requiredConfigFile: 'zerops.yaml',
      platformDisplayName: 'Zerops',
    };
  }
}
