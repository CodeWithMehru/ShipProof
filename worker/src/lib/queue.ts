import Redis from 'ioredis';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

let redis: Redis | null = null;

export function getRedis(): Redis {
  if (!redis) {
    redis = new Redis(REDIS_URL, {
      maxRetriesPerRequest: null, // Required for BRPOP blocking
      retryStrategy(times) {
        const delay = Math.min(times * 200, 2000);
        return delay;
      },
    });
    redis.on('error', (err) => {
      console.error('[Worker/Valkey] Connection error:', err.message);
    });
    redis.on('connect', () => {
      console.log('[Worker/Valkey] Connected');
    });
  }
  return redis;
}

export interface Job {
  type: string;
  payload: Record<string, unknown>;
  enqueuedAt: string;
}

/**
 * Blocking pop from the job queue.
 * Waits up to `timeoutSeconds` for a job. Returns null if timeout.
 */
export async function dequeueJob(timeoutSeconds = 5): Promise<Job | null> {
  const redis = getRedis();
  const result = await redis.brpop('shipproof:jobs', timeoutSeconds);
  if (!result) return null;

  try {
    return JSON.parse(result[1]) as Job;
  } catch {
    console.error('[Worker/Queue] Failed to parse job:', result[1]);
    return null;
  }
}

/**
 * Cache a value in Valkey with a TTL (default 5 minutes).
 * Used to avoid re-fetching the same GitHub data repeatedly.
 */
export async function cacheGet(key: string): Promise<string | null> {
  const redis = getRedis();
  return redis.get(`shipproof:cache:${key}`);
}

export async function cacheSet(key: string, value: string, ttlSeconds = 300): Promise<void> {
  const redis = getRedis();
  await redis.setex(`shipproof:cache:${key}`, ttlSeconds, value);
}
