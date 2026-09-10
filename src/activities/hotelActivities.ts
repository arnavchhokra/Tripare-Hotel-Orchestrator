import fetch from 'node-fetch';
import { SupplierHotel, DeduplicatedHotel } from '../types/hotel';
import { cacheHotels } from '../services/redis';

/**
 * Activity: Fetch hotels from a supplier endpoint for a given city.
 * This is the only place where HTTP I/O happens — kept out of the workflow.
 */
export async function fetchSupplierHotels(
  supplierUrl: string,
  supplierName: string,
  city: string
): Promise<SupplierHotel[]> {
  const url = `${supplierUrl}?city=${encodeURIComponent(city)}`;
  console.log(`[Activity] fetchSupplierHotels: calling ${url}`);

  const response = await fetch(url, { timeout: 8000 } as any);

  if (!response.ok) {
    throw new Error(
      `[Activity] ${supplierName} returned HTTP ${response.status} for city="${city}"`
    );
  }

  const data = (await response.json()) as SupplierHotel[];
  console.log(`[Activity] ${supplierName} returned ${data.length} hotels for city="${city}"`);
  return data;
}

/**
 * Activity: Deduplicate hotels by name across two supplier lists.
 * For each hotel name appearing in both lists, the cheaper option wins.
 * For hotels present in only one list, that entry is selected.
 *
 * Returns the final list sorted ascending by price.
 */
export async function deduplicateHotels(
  hotelsA: SupplierHotel[],
  hotelsB: SupplierHotel[]
): Promise<DeduplicatedHotel[]> {
  console.log(
    `[Activity] deduplicateHotels: A=${hotelsA.length}, B=${hotelsB.length}`
  );

  // Map normalised name → best offer so far
  const bestMap = new Map<string, DeduplicatedHotel>();

  const processHotel = (hotel: SupplierHotel, supplier: string) => {
    const key = hotel.name.toLowerCase().trim();
    const existing = bestMap.get(key);

    if (!existing || hotel.price < existing.price) {
      bestMap.set(key, {
        name: hotel.name,
        price: hotel.price,
        supplier,
        commissionPct: hotel.commissionPct,
      });
    }
  };

  for (const hotel of hotelsA) processHotel(hotel, 'Supplier A');
  for (const hotel of hotelsB) processHotel(hotel, 'Supplier B');

  const result = Array.from(bestMap.values()).sort((a, b) => a.price - b.price);
  console.log(`[Activity] deduplicateHotels: result=${result.length} unique hotels`);
  return result;
}

/**
 * Activity: Persist deduplicated hotel list to Redis.
 * Uses a Sorted Set so price-range filtering can be done inside Redis.
 */
export async function persistToRedis(
  city: string,
  hotels: DeduplicatedHotel[]
): Promise<void> {
  console.log(`[Activity] persistToRedis: city="${city}", count=${hotels.length}`);
  await cacheHotels(city, hotels);
}
