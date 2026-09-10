import { Router, Request, Response } from 'express';
import { Connection, Client } from '@temporalio/client';
import { hotelAggregationWorkflow } from '../workflows/hotelAggregation';
import { isCached, getHotelsFromCache } from '../services/redis';
import { WorkflowInput } from '../types/hotel';
import { v4 as uuidv4 } from 'uuid';

export const hotelsRouter = Router();

const SUPPLIER_A_URL =
  process.env.SUPPLIER_A_URL || 'http://localhost:3000/supplierA/hotels';
const SUPPLIER_B_URL =
  process.env.SUPPLIER_B_URL || 'http://localhost:3000/supplierB/hotels';
const TEMPORAL_ADDRESS = process.env.TEMPORAL_ADDRESS || 'localhost:7233';
const TASK_QUEUE = 'hotel-aggregation';

/**
 * GET /api/hotels?city=<city>[&minPrice=<min>][&maxPrice=<max>]
 *
 * 1. Validates the city param.
 * 2. On cache miss → starts a Temporal workflow to fetch, deduplicate, and cache.
 * 3. Queries Redis (ZRANGEBYSCORE) with optional price bounds.
 * 4. Returns the final deduplicated list.
 */
hotelsRouter.get('/', async (req: Request, res: Response) => {
  const city = (req.query.city as string | undefined)?.toLowerCase().trim();
  const minPrice = req.query.minPrice ? Number(req.query.minPrice) : undefined;
  const maxPrice = req.query.maxPrice ? Number(req.query.maxPrice) : undefined;

  // --- Validation ---
  if (!city) {
    return res.status(400).json({
      error: 'Missing required query parameter: city',
    });
  }

  if (
    (minPrice !== undefined && isNaN(minPrice)) ||
    (maxPrice !== undefined && isNaN(maxPrice))
  ) {
    return res.status(400).json({ error: 'minPrice and maxPrice must be numbers' });
  }

  console.log(
    `[GET /api/hotels] city="${city}" minPrice=${minPrice ?? 'none'} maxPrice=${maxPrice ?? 'none'}`
  );

  try {
    // --- Cache check ---
    const cached = await isCached(city);

    if (!cached) {
      console.log(`[Hotels] Cache miss for city="${city}" — triggering workflow`);

      // Connect to Temporal and start the aggregation workflow
      const connection = await Connection.connect({ address: TEMPORAL_ADDRESS });
      const client = new Client({ connection });

      const workflowInput: WorkflowInput = {
        city,
        supplierAUrl: SUPPLIER_A_URL,
        supplierBUrl: SUPPLIER_B_URL,
      };

      const handle = await client.workflow.start(hotelAggregationWorkflow, {
        taskQueue: TASK_QUEUE,
        workflowId: `hotel-agg-${city}-${uuidv4()}`,
        args: [workflowInput],
      });

      // Await workflow completion (synchronous for the HTTP request)
      await handle.result();
      await connection.close();
      console.log(`[Hotels] Workflow complete for city="${city}"`);
    } else {
      console.log(`[Hotels] Cache hit for city="${city}"`);
    }

    // --- Fetch from Redis with optional price filter ---
    const hotels = await getHotelsFromCache(city, minPrice, maxPrice);

    return res.json(hotels);
  } catch (err: any) {
    console.error(`[Hotels] Error:`, err.message);
    return res.status(500).json({ error: 'Internal server error', details: err.message });
  }
});
