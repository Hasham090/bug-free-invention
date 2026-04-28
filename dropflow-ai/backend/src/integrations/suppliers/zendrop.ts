import axios, { AxiosInstance } from "axios";
import { env } from "../../lib/env.js";
import { logger } from "../../lib/logger.js";
import { upstream } from "../../lib/errors.js";
import type { SupplierAdapter, SupplierOrderRequest, SupplierOrderResponse, SupplierProductDTO } from "./types.js";

const log = logger("zendrop");

function client(): AxiosInstance {
  if (!env.ZENDROP_API_KEY) throw upstream("Zendrop API key not configured");
  return axios.create({
    baseURL: "https://api.zendrop.com/public/v1",
    headers: { Authorization: `Bearer ${env.ZENDROP_API_KEY}`, "Content-Type": "application/json" },
    timeout: 20_000,
  });
}

export const zendropAdapter: SupplierAdapter = {
  kind: "ZENDROP",
  name: "Zendrop",
  isConfigured: () => Boolean(env.ZENDROP_API_KEY),

  async searchProducts({ query, limit = 20 }) {
    if (!env.ZENDROP_API_KEY) return [];
    try {
      const c = client();
      const res = await c.get(`/products`, { params: { search: query, limit } });
      const list = (res.data?.data ?? []) as ZenProduct[];
      return list.map(mapZen);
    } catch (e: unknown) {
      const err = e as { response?: { data?: unknown }; message?: string };
      log.warn("search failed", err.message);
      return [];
    }
  },

  async getProduct(externalId: string) {
    const c = client();
    const res = await c.get(`/products/${externalId}`);
    return mapZen(res.data?.data as ZenProduct);
  },

  async placeOrder(req: SupplierOrderRequest): Promise<SupplierOrderResponse> {
    const c = client();
    const res = await c.post(`/orders`, {
      reference: `df-${Date.now()}`,
      line_items: [{ product_id: req.externalProductId, variant_sku: req.variantSku, quantity: req.quantity }],
      shipping_address: {
        name: req.shipping.name,
        address1: req.shipping.line1,
        address2: req.shipping.line2,
        city: req.shipping.city,
        province: req.shipping.state,
        zip: req.shipping.postalCode,
        country: req.shipping.country,
        phone: req.shipping.phone,
        email: req.shipping.email,
      },
    });
    return { externalOrderId: res.data?.data?.id ?? "", status: "placed", raw: res.data };
  },

  async getTracking(externalOrderId: string) {
    const c = client();
    const res = await c.get(`/orders/${externalOrderId}`);
    const o = res.data?.data;
    return { trackingNumber: o?.tracking_number, trackingUrl: o?.tracking_url, status: o?.status ?? "unknown" };
  },
};

interface ZenProduct {
  id: string;
  name: string;
  description?: string;
  images?: string[];
  cost: number;
  shipping_time?: { min: number; max: number };
  category?: string;
  rating?: number;
}

function mapZen(p: ZenProduct): SupplierProductDTO {
  return {
    externalId: p.id,
    title: p.name,
    description: p.description,
    images: p.images ?? [],
    costCents: Math.round(p.cost * 100),
    currency: "USD",
    shippingDays: p.shipping_time?.max,
    category: p.category,
    rating: p.rating,
    raw: p,
  };
}
