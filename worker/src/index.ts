import 'dotenv/config';
import cron from 'node-cron';
import { dequeueJob } from './lib/queue';
import { runVerification } from './jobs/verify';
import { runAllUptimeChecks } from './jobs/uptime';

console.log('[ShipProof Worker] Starting...');

/**
 * Main job processing loop.
 * Uses BRPOP to block-wait for jobs from the Valkey queue.
 */
async function processJobs(): Promise<void> {
  console.log('[Worker] Job processor started — waiting for jobs...');

  while (true) {
    try {
      const job = await dequeueJob(5); // 5-second blocking timeout

      if (!job) continue; // Timeout, loop again

      console.log(`[Worker] Received job: ${job.type}`);

      switch (job.type) {
        case 'verify': {
          const submissionId = job.payload.submissionId as string;
          if (!submissionId) {
            console.error('[Worker] verify job missing submissionId');
            break;
          }
          await runVerification(submissionId);
          break;
        }

        default:
          console.warn(`[Worker] Unknown job type: ${job.type}`);
      }
    } catch (error) {
      console.error('[Worker] Job processing error:', error);
      // Brief pause before retrying to avoid tight error loops
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
}

/**
 * Schedule periodic uptime checks every 15 minutes.
 * Uses node-cron for reliable scheduling.
 */
cron.schedule('*/15 * * * *', async () => {
  console.log('[Worker] Running scheduled uptime checks...');
  try {
    await runAllUptimeChecks();
  } catch (error) {
    console.error('[Worker] Uptime check error:', error);
  }
});

// Start the job processing loop
processJobs().catch((err) => {
  console.error('[Worker] Fatal error in job processor:', err);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('[Worker] SIGTERM received — shutting down');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('[Worker] SIGINT received — shutting down');
  process.exit(0);
});
