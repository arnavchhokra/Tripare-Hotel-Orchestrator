# 🏨 Hotel Offer Orchestrator

A hotel aggregation microservice that fetches offers from two mock suppliers in parallel, deduplicates them by cheapest price, caches results in Redis, and supports price-range filtering — all orchestrated via **Temporal.io**.

## Quick Start

```bash
git clone <repo-url> && cd Tripare-Hotel-Orchestrator
docker-compose up --build
```
> Wait ~30–60s for Temporal to initialize.

**Services:**
- **Express API**: `http://localhost:3000`
- **Temporal UI**: `http://localhost:8080`

## API Endpoints

- `GET /api/hotels?city=delhi&minPrice=5000&maxPrice=6000` (Main Deduplication endpoint)
- `GET /supplierA/hotels?city=delhi` (Mock data)
- `GET /supplierB/hotels?city=delhi` (Mock data)
- `GET /health` (System health)

## Testing

This project uses the native Node.js test runner (`node:test`). Tests are written to ensure the core business logic (e.g., hotel deduplication) works as expected.

**Run tests:**
```bash
npm run test
```

*The deduplication logic checks for cheapest rates across suppliers while handling whitespace and case-insensitivity natively.*

## Architecture

- **Parallel fetching**: Temporal `Promise.all` workflow.
- **Deduplication**: Cheapest price per hotel name.
- **Caching & Filtering**: Redis Sorted Sets (`ZADD`, `ZRANGEBYSCORE`).
- **Resilience**: Temporal exponential back-off (3 retries).

See the included `postman/Hotel_Orchestrator.postman_collection.json` for testing all API scenarios manually.
