import Redis from 'ioredis';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

let redis: Redis | null = null;

export function getRedis(): Redis {
  if (!redis) {
    redis = new Redis(REDIS_URL, {
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        const delay = Math.min(times * 200, 2000);
        return delay;
      },
    });
    redis.on('error', (err) => {
      console.error('[Valkey] Connection error:', err.message);
    });
    redis.on('connect', () => {
      console.log('[Valkey] Connected');
    });
  }
  return redis;
}

/**
 * Enqueue a verification job for the worker to pick up.
 * Jobs are pushed to a Redis/Valkey list, consumed via BRPOP by the worker.
 */
export async function enqueueJob(type: string, payload: Record<string, unknown>): Promise<void> {
  const redis = getRedis();
  const job = JSON.stringify({ type, payload, enqueuedAt: new Date().toISOString() });
  await redis.lpush('shipproof:jobs', job);
  console.log(`[Queue] Enqueued ${type} job`);
}
