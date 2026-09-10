// Raw shape returned by each mock supplier
export interface SupplierHotel {
  hotelId: string;
  name: string;
  price: number;
  city: string;
  commissionPct: number;
}

// Final shape after deduplication — returned to the client
export interface DeduplicatedHotel {
  name: string;
  price: number;
  supplier: string;
  commissionPct: number;
}

// Input to the Temporal workflow
export interface WorkflowInput {
  city: string;
  supplierAUrl: string;
  supplierBUrl: string;
}
