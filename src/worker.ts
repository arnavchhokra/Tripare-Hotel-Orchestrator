import { Worker, NativeConnection } from '@temporalio/worker';
import * as activities from './activities/hotelActivities';

const TEMPORAL_ADDRESS = process.env.TEMPORAL_ADDRESS || 'localhost:7233';
const TASK_QUEUE = 'hotel-aggregation';

async function run(): Promise<void> {
  console.log(`[Worker] Starting — connecting to Temporal at ${TEMPORAL_ADDRESS}`);

  const connection = await NativeConnection.connect({
    address: TEMPORAL_ADDRESS,
  });

  const worker = await Worker.create({
    connection,
    // Path to the compiled workflow file (Temporal bundles it separately)
    workflowsPath: require.resolve('./workflows/hotelAggregation'),
    // Register all activity implementations
    activities,
    taskQueue: TASK_QUEUE,
  });

  console.log(`[Worker] Listening on task queue "${TASK_QUEUE}"…`);
  await worker.run();
}

run().catch((err) => {
  console.error('[Worker] Fatal error:', err);
  process.exit(1);
});
