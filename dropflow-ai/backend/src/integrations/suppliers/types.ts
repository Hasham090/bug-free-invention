export interface SupplierProductDTO {
  externalId: string;
  title: string;
  description?: string;
  images: string[];
  variants?: { name: string; sku?: string; priceCents: number; stock: number; options?: Record<string, string> }[];
  costCents: number;
  currency: string;
  shippingDays?: number;
  moq?: number;
  rating?: number;
  reviewCount?: number;
  category?: string;
  raw?: unknown;
}

export interface SupplierOrderRequest {
  externalProductId: string;
  variantSku?: string;
  quantity: number;
  shipping: {
    name: string;
    line1: string;
    line2?: string;
    city: string;
    state?: string;
    postalCode: string;
    country: string;
    phone?: string;
    email?: string;
  };
}

export interface SupplierOrderResponse {
  externalOrderId: string;
  status: string;
  trackingNumber?: string;
  trackingUrl?: string;
  raw?: unknown;
}

export interface SupplierAdapter {
  kind: "ALIEXPRESS" | "CJ_DROPSHIPPING" | "ZENDROP" | "GENERIC_SCRAPED" | "CSV_IMPORT";
  name: string;
  isConfigured(): boolean;
  searchProducts(opts: { query: string; category?: string; limit?: number }): Promise<SupplierProductDTO[]>;
  getProduct(externalId: string): Promise<SupplierProductDTO>;
  placeOrder(req: SupplierOrderRequest): Promise<SupplierOrderResponse>;
  getTracking(externalOrderId: string): Promise<{ trackingNumber?: string; trackingUrl?: string; status: string }>;
}
