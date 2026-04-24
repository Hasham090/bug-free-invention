export type ProductStatus = "HEALTHY" | "SLOW" | "DEAD";
export type ActionType = "DISCOUNT" | "BUNDLE" | "LIQUIDATE" | "REORDER_PAUSE" | "PROMOTE";
export type ActionStatus = "PENDING" | "DONE" | "DISMISSED";
export type Plan = "STARTER" | "GROWTH" | "ENTERPRISE";

export interface Product {
  id: string;
  storeId: string;
  name: string;
  sku: string;
  imageUrl: string;
  category: string;
  unitsInStock: number;
  costPrice: number;
  sellingPrice: number;
  lastSaleDate: Date | null;
  createdAt: Date;
}

export interface SaleRecord {
  id: string;
  productId: string;
  quantity: number;
  saleDate: Date;
  revenue: number;
}

export interface AIRecommendation {
  id: string;
  productId: string;
  actionType: ActionType;
  explanation: string;
  expectedOutcome: string;
  confidenceScore: number;
  status: ActionStatus;
  dollarImpact: number;
  createdAt: Date;
}

export interface ProductWithIntel extends Product {
  daysSinceLastSale: number;
  status: ProductStatus;
  marginPct: number;
  inventoryValue: number;
  velocity30d: number;
  recommendation?: AIRecommendation;
}
