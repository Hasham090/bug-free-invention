import axios, { AxiosInstance } from "axios";
import { env } from "../../lib/env.js";
import { logger } from "../../lib/logger.js";
import { upstream } from "../../lib/errors.js";
import type { SupplierAdapter, SupplierOrderRequest, SupplierOrderResponse, SupplierProductDTO } from "./types.js";

const log = logger("cj");

class CJ {
  http: AxiosInstance;
  constructor(token: string) {
    this.http = axios.create({
      baseURL: "https://developers.cjdropshipping.com/api2.0/v1",
      headers: { "CJ-Access-Token": token, "Content-Type": "application/json" },
      timeout: 20_000,
    });
  }
  async req<T>(method: "GET" | "POST", path: string, params?: unknown): Promise<T> {
    try {
      const res = await this.http.request<{ code: number; result: boolean; message: string; data: T }>({
        method,
        url: path,
        params: method === "GET" ? params : undefined,
        data: method === "POST" ? params : undefined,
      });
      if (!res.data.result) throw upstream(`cj error: ${res.data.message}`, res.data);
      return res.data.data;
    } catch (e: unknown) {
      const err = e as { response?: { data?: unknown }; message?: string };
      log.error(`${method} ${path} failed`, err.response?.data ?? err.message);
      throw upstream("cj request failed", err.response?.data);
    }
  }
}

export const cjAdapter: SupplierAdapter = {
  kind: "CJ_DROPSHIPPING",
  name: "CJ Dropshipping",
  isConfigured: () => Boolean(env.CJDROPSHIPPING_API_KEY),

  async searchProducts({ query, category, limit = 20 }) {
    if (!env.CJDROPSHIPPING_API_KEY) return [];
    const cj = new CJ(env.CJDROPSHIPPING_API_KEY);
    const data = await cj.req<{ list: CJProduct[] }>("GET", "/product/list", {
      productNameEn: query,
      categoryId: category,
      pageSize: limit,
    });
    return data.list.map(mapCJProduct);
  },

  async getProduct(externalId: string) {
    const cj = new CJ(env.CJDROPSHIPPING_API_KEY);
    const data = await cj.req<CJProduct>("GET", "/product/query", { pid: externalId });
    return mapCJProduct(data);
  },

  async placeOrder(req: SupplierOrderRequest): Promise<SupplierOrderResponse> {
    const cj = new CJ(env.CJDROPSHIPPING_API_KEY);
    const data = await cj.req<{ orderId: string; orderNum: string }>("POST", "/shopping/order/createOrder", {
      orderNumber: `df-${Date.now()}`,
      shippingZip: req.shipping.postalCode,
      shippingCountryCode: req.shipping.country,
      shippingCountry: req.shipping.country,
      shippingProvince: req.shipping.state ?? "",
      shippingCity: req.shipping.city,
      shippingAddress: req.shipping.line1,
      shippingAddress2: req.shipping.line2 ?? "",
      shippingCustomerName: req.shipping.name,
      shippingPhone: req.shipping.phone ?? "",
      remark: "DropFlow auto-fulfillment",
      products: [{ vid: req.variantSku ?? req.externalProductId, quantity: req.quantity }],
    });
    return { externalOrderId: data.orderId, status: "placed", raw: data };
  },

  async getTracking(externalOrderId: string) {
    const cj = new CJ(env.CJDROPSHIPPING_API_KEY);
    const data = await cj.req<{ trackNumber: string; trackingUrl: string; status: string }>("GET", "/logistic/trackInfo", {
      orderId: externalOrderId,
    });
    return { trackingNumber: data.trackNumber, trackingUrl: data.trackingUrl, status: data.status };
  },
};

interface CJProduct {
  pid: string;
  productNameEn: string;
  productImage: string;
  productImageSet?: string;
  sellPrice: string;
  productSku?: string;
  productType?: string;
  categoryName?: string;
  variants?: { vid: string; variantNameEn: string; variantSku: string; variantSellPrice: string; variantStandard: string }[];
}

function mapCJProduct(p: CJProduct): SupplierProductDTO {
  const cost = Math.round(parseFloat(p.sellPrice) * 100);
  return {
    externalId: p.pid,
    title: p.productNameEn,
    images: [p.productImage, ...(p.productImageSet?.split(";") ?? [])].filter(Boolean),
    costCents: cost,
    currency: "USD",
    category: p.categoryName,
    variants: p.variants?.map((v) => ({
      name: v.variantNameEn,
      sku: v.variantSku,
      priceCents: Math.round(parseFloat(v.variantSellPrice) * 100),
      stock: 9999,
    })),
    raw: p,
  };
}
