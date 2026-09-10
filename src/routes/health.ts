import { Router, Request, Response } from 'express';
import fetch from 'node-fetch';
import { pingRedis } from '../services/redis';

export const healthRouter = Router();

const SUPPLIER_A_URL =
  process.env.SUPPLIER_A_URL || 'http://localhost:3000/supplierA/hotels';
const SUPPLIER_B_URL =
  process.env.SUPPLIER_B_URL || 'http://localhost:3000/supplierB/hotels';
const TEMPORAL_ADDRESS = process.env.TEMPORAL_ADDRESS || 'localhost:7233';

interface ServiceStatus {
  status: 'up' | 'down';
  latencyMs?: number;
  error?: string;
}

async function checkSupplier(url: string): Promise<ServiceStatus> {
  const start = Date.now();
  try {
    const response = await fetch(`${url}?city=ping`, { timeout: 5000 } as any);
    return {
      status: response.ok ? 'up' : 'down',
      latencyMs: Date.now() - start,
    };
  } catch (err: any) {
    return { status: 'down', latencyMs: Date.now() - start, error: err.message };
  }
}

async function checkTemporal(): Promise<ServiceStatus> {
  const start = Date.now();
  try {
    // Best effort: try to open a TCP connection to Temporal gRPC port
    const { Connection } = await import('@temporalio/client');
    const conn = await Promise.race([
      Connection.connect({ address: TEMPORAL_ADDRESS }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Timeout')), 4000)
      ),
    ]);
    await (conn as any).close();
    return { status: 'up', latencyMs: Date.now() - start };
  } catch (err: any) {
    return { status: 'down', latencyMs: Date.now() - start, error: err.message };
  }
}

/**
 * GET /health
 * Returns health status of all dependent services.
 */
healthRouter.get('/', async (_req: Request, res: Response) => {
  const [supplierA, supplierB, redisOk, temporal] = await Promise.all([
    checkSupplier(SUPPLIER_A_URL),
    checkSupplier(SUPPLIER_B_URL),
    pingRedis(),
    checkTemporal(),
  ]);

  const redisStatus: ServiceStatus = redisOk
    ? { status: 'up' }
    : { status: 'down', error: 'Redis ping failed' };

  const allHealthy =
    supplierA.status === 'up' &&
    supplierB.status === 'up' &&
    redisStatus.status === 'up' &&
    temporal.status === 'up';

  const payload = {
    status: allHealthy ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    services: {
      supplierA,
      supplierB,
      redis: redisStatus,
      temporal,
    },
  };

  return res.status(allHealthy ? 200 : 503).json(payload);
});
