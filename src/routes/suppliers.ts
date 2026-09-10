import { Router, Request, Response } from 'express';
import { SupplierHotel } from '../types/hotel';

const supplierAData: SupplierHotel[] = require('../data/supplierA.json');
const supplierBData: SupplierHotel[] = require('../data/supplierB.json');

export const supplierRouter = Router();

/**
 * GET /supplierA/hotels?city=<city>
 * Returns mock hotel data from Supplier A filtered by city.
 */
supplierRouter.get('/supplierA/hotels', (req: Request, res: Response) => {
  const city = (req.query.city as string | undefined)?.toLowerCase().trim();
  console.log(`[SupplierA] Request for city="${city}"`);

  if (!city) {
    const data = supplierAData;
    return res.json(data);
  }

  const filtered = supplierAData.filter(
    (h) => h.city.toLowerCase() === city
  );
  return res.json(filtered);
});

/**
 * GET /supplierB/hotels?city=<city>
 * Returns mock hotel data from Supplier B filtered by city.
 */
supplierRouter.get('/supplierB/hotels', (req: Request, res: Response) => {
  const city = (req.query.city as string | undefined)?.toLowerCase().trim();
  console.log(`[SupplierB] Request for city="${city}"`);

  if (!city) {
    const data = supplierBData;
    return res.json(data);
  }

  const filtered = supplierBData.filter(
    (h) => h.city.toLowerCase() === city
  );
  return res.json(filtered);
});
