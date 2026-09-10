import test from 'node:test';
import assert from 'node:assert/strict';
import { deduplicateHotels } from '../src/activities/hotelActivities';

test('deduplicateHotels', async (t) => {
  await t.test('selects the cheaper option when hotel exists in both lists', async () => {
    const listA = [
      { hotelId: 'A1', city: 'Delhi', name: 'Hotel Alpha', price: 100, commissionPct: 10 },
      { hotelId: 'A2', city: 'Delhi', name: 'Hotel Beta', price: 200, commissionPct: 15 }
    ];
    const listB = [
      { hotelId: 'B1', city: 'Delhi', name: 'Hotel Alpha', price: 90, commissionPct: 12 },
      { hotelId: 'B2', city: 'Delhi', name: 'Hotel Gamma', price: 300, commissionPct: 20 }
    ];

    const result = await deduplicateHotels(listA, listB);
    
    assert.equal(result.length, 3);
    
    // Results should be sorted by price ascending: 90, 200, 300
    assert.deepEqual(result[0], { name: 'Hotel Alpha', price: 90, supplier: 'Supplier B', commissionPct: 12 });
    assert.deepEqual(result[1], { name: 'Hotel Beta', price: 200, supplier: 'Supplier A', commissionPct: 15 });
    assert.deepEqual(result[2], { name: 'Hotel Gamma', price: 300, supplier: 'Supplier B', commissionPct: 20 });
  });

  await t.test('handles case insensitivity and whitespace', async () => {
    const listA = [{ hotelId: 'A3', city: 'Delhi', name: '  hotel delta ', price: 150, commissionPct: 10 }];
    const listB = [{ hotelId: 'B3', city: 'Delhi', name: 'Hotel Delta', price: 140, commissionPct: 10 }];

    const result = await deduplicateHotels(listA, listB);
    
    assert.equal(result.length, 1);
    assert.equal(result[0].price, 140);
    assert.equal(result[0].supplier, 'Supplier B');
  });

  await t.test('handles empty lists', async () => {
    const result = await deduplicateHotels([], []);
    assert.equal(result.length, 0);
  });
});
