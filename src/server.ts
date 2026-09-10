import express, { Request, Response, NextFunction } from 'express';
import { hotelsRouter } from './routes/hotels';
import { supplierRouter } from './routes/suppliers';
import { healthRouter } from './routes/health';
import { getRedisClient } from './services/redis';

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

// ─── Middleware ────────────────────────────────────────────────────────────────
app.use(express.json());
app.use((req: Request, _res: Response, next: NextFunction) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/hotels', hotelsRouter);
app.use('/', supplierRouter);
app.use('/health', healthRouter);

// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: 'Not found' });
});

// Global error handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[Server] Unhandled error:', err.message);
  res.status(500).json({ error: 'Internal server error', details: err.message });
});

// ─── Start ────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`[Server] Hotel Orchestrator running on port ${PORT}`);
  // Eagerly connect Redis on startup
  getRedisClient();
});

export default app;
