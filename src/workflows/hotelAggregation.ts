import { proxyActivities } from '@temporalio/workflow';
import type * as activities from '../activities/hotelActivities';
import { DeduplicatedHotel, WorkflowInput } from '../types/hotel';

// Proxy all activities with shared retry/timeout settings.
// NOTE: imports inside a workflow file MUST come from @temporalio/workflow only.
//       All real I/O lives in activities — never import ioredis/fetch here.
const { fetchSupplierHotels, deduplicateHotels, persistToRedis } =
  proxyActivities<typeof activities>({
    startToCloseTimeout: '15 seconds',
    retry: {
      initialInterval: '500 milliseconds',
      backoffCoefficient: 2,
      maximumAttempts: 3,
    },
  });

/**
 * Workflow: hotelAggregationWorkflow
 *
 * 1. Calls Supplier A and Supplier B in parallel.
 * 2. Deduplicates — cheapest price per hotel name wins.
 * 3. Caches the result in Redis.
 * 4. Returns the final list to the caller.
 */
export async function hotelAggregationWorkflow(
  input: WorkflowInput
): Promise<DeduplicatedHotel[]> {
  const { city, supplierAUrl, supplierBUrl } = input;

  // Step 1 — parallel supplier fetch
  const [hotelsA, hotelsB] = await Promise.all([
    fetchSupplierHotels(supplierAUrl, 'Supplier A', city),
    fetchSupplierHotels(supplierBUrl, 'Supplier B', city),
  ]);

  // Step 2 — deduplication
  const deduped = await deduplicateHotels(hotelsA, hotelsB);

  // Step 3 — cache
  await persistToRedis(city, deduped);

  return deduped;
}
