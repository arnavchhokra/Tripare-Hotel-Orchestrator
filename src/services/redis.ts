import Redis from 'ioredis';
import { DeduplicatedHotel } from '../types/hotel';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const CACHE_TTL_SECONDS = 300; // 5 minutes

let redisClient: Redis | null = null;

/**
 * Returns a singleton Redis client.
 * Creates the connection lazily on first call.
 */
export function getRedisClient(): Redis {
  if (!redisClient) {
    redisClient = new Redis(REDIS_URL, {
      lazyConnect: false,
      enableReadyCheck: true,
      maxRetriesPerRequest: 3,
    });

    redisClient.on('connect', () => console.log('[Redis] Connected'));
    redisClient.on('error', (err) => console.error('[Redis] Error:', err.message));
  }
  return redisClient;
}

/**
 * Checks if a city's hotel list is already cached.
 */
export async function isCached(city: string): Promise<boolean> {
  const redis = getRedisClient();
  const exists = await redis.exists(`hotels:${city}`);
  return exists === 1;
}

/**
 * Stores deduplicated hotels in a Redis Sorted Set keyed by city.
 * Score = price, member = JSON-serialised hotel object.
 * Also sets a TTL so stale data expires automatically.
 */
export async function cacheHotels(city: string, hotels: DeduplicatedHotel[]): Promise<void> {
  if (hotels.length === 0) return;

  const redis = getRedisClient();
  const key = `hotels:${city}`;

  // Clear any existing data for the city first (re-run scenario)
  await redis.del(key);

  const pipeline = redis.pipeline();
  for (const hotel of hotels) {
    pipeline.zadd(key, hotel.price, JSON.stringify(hotel));
  }
  pipeline.expire(key, CACHE_TTL_SECONDS);
  await pipeline.exec();

  console.log(`[Redis] Cached ${hotels.length} hotels for city="${city}" (TTL=${CACHE_TTL_SECONDS}s)`);
}

/**
 * Retrieves hotels from Redis within an optional price range.
 * Filtering is performed entirely inside Redis using ZRANGEBYSCORE.
 *
 * @param city      The city key.
 * @param minPrice  Minimum price (inclusive). Defaults to -Infinity.
 * @param maxPrice  Maximum price (inclusive). Defaults to +Infinity.
 */
export async function getHotelsFromCache(
  city: string,
  minPrice?: number,
  maxPrice?: number
): Promise<DeduplicatedHotel[]> {
  const redis = getRedisClient();
  const key = `hotels:${city}`;

  const min = minPrice !== undefined ? minPrice : '-inf';
  const max = maxPrice !== undefined ? maxPrice : '+inf';

  // ZRANGEBYSCORE returns members (JSON strings) sorted by score (price) ascending
  const members = await redis.zrangebyscore(key, min, max);

  return members.map((m) => JSON.parse(m) as DeduplicatedHotel);
}

/**
 * Pings Redis to check connectivity. Returns true if healthy.
 */
export async function pingRedis(): Promise<boolean> {
  try {
    const redis = getRedisClient();
    const result = await redis.ping();
    return result === 'PONG';
  } catch {
    return false;
  }
}

/**
 * Gracefully closes the Redis connection.
 */
export async function closeRedis(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
  }
}
