import { Worker } from '@temporalio/worker';
import * as activities from './activities/hotelActivities';
import path from 'path';

const TEMPORAL_ADDRESS = process.env.TEMPORAL_ADDRESS || 'localhost:7233';
const TASK_QUEUE = 'hotel-aggregation';

async function run(): Promise<void> {
  console.log(`[Worker] Starting — connecting to Temporal at ${TEMPORAL_ADDRESS}`);

  const worker = await Worker.create({
    // Path to the compiled workflow file (Temporal bundles it separately)
    workflowsPath: path.resolve(__dirname, './workflows/hotelAggregation'),
    // Register all activity implementations
    activities,
    taskQueue: TASK_QUEUE,
    connection: {
      address: TEMPORAL_ADDRESS,
    } as any,
  });

  console.log(`[Worker] Listening on task queue "${TASK_QUEUE}"…`);
  await worker.run();
}

run().catch((err) => {
  console.error('[Worker] Fatal error:', err);
  process.exit(1);
});
