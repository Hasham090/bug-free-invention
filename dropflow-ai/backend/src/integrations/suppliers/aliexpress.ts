import axios from "axios";
import crypto from "node:crypto";
import { env } from "../../lib/env.js";
import { logger } from "../../lib/logger.js";
import { upstream } from "../../lib/errors.js";
import type { SupplierAdapter, SupplierOrderRequest, SupplierOrderResponse, SupplierProductDTO } from "./types.js";

const log = logger("aliexpress");
const API_BASE = "https://api-sg.aliexpress.com/sync";

function signParams(params: Record<string, string>, secret: string): string {
  const sorted = Object.keys(params).sort().map((k) => `${k}${params[k]}`).join("");
  return crypto.createHmac("sha256", secret).update(`${sorted}`).digest("hex").toUpperCase();
}

async function call<T>(method: string, params: Record<string, string>): Promise<T> {
  if (!env.ALIEXPRESS_API_KEY || !env.ALIEXPRESS_API_SECRET) {
    throw upstream("AliExpress API not configured");
  }
  const base = {
    method,
    app_key: env.ALIEXPRESS_API_KEY,
    sign_method: "sha256",
    timestamp: new Date().toISOString(),
    format: "json",
    v: "2.0",
    ...params,
  };
  const sign = signParams(base, env.ALIEXPRESS_API_SECRET);
  const res = await axios.post(API_BASE, null, { params: { ...base, sign } });
  if (res.data?.error_response) throw upstream("AliExpress error", res.data.error_response);
  return res.data as T;
}

export const aliexpressAdapter: SupplierAdapter = {
  kind: "ALIEXPRESS",
  name: "AliExpress",
  isConfigured: () => Boolean(env.ALIEXPRESS_API_KEY && env.ALIEXPRESS_API_SECRET),

  async searchProducts({ query, category, limit = 20 }) {
    if (!this.isConfigured()) {
      log.warn("API not configured — returning empty result; use Playwright fallback for scraping.");
      return [];
    }
    const r = await call<{ aliexpress_affiliate_product_query_response: { resp_result: { result: { products: { product: AliProduct[] } } } } }>(
      "aliexpress.affiliate.product.query",
      { keywords: query, category_ids: category ?? "", page_size: String(limit) },
    );
    const products = r.aliexpress_affiliate_product_query_response?.resp_result?.result?.products?.product ?? [];
    return products.map(mapProduct);
  },

  async getProduct(externalId: string) {
    const r = await call<{ aliexpress_affiliate_productdetail_get_response: { resp_result: { result: { products: { product: AliProduct[] } } } } }>(
      "aliexpress.affiliate.productdetail.get",
      { product_ids: externalId },
    );
    const p = r.aliexpress_affiliate_productdetail_get_response?.resp_result?.result?.products?.product?.[0];
    if (!p) throw upstream("AliExpress product not found", { externalId });
    return mapProduct(p);
  },

  async placeOrder(req: SupplierOrderRequest): Promise<SupplierOrderResponse> {
    // Real implementation requires the AliExpress Dropshipping API (separate scope).
    // We send the request and return what comes back; the API-key gate already throws if unavailable.
    const r = await call<{ aliexpress_ds_order_create_response: { result: AliOrderResp } }>(
      "aliexpress.ds.order.create",
      {
        param_place_order_request4_open_api_d_t_o: JSON.stringify({
          logistics_address: {
            address: req.shipping.line1,
            address2: req.shipping.line2 ?? "",
            city: req.shipping.city,
            country: req.shipping.country,
            zip: req.shipping.postalCode,
            province: req.shipping.state ?? "",
            full_name: req.shipping.name,
            mobile_no: req.shipping.phone ?? "",
            email: req.shipping.email ?? "",
          },
          product_items: [{
            product_id: req.externalProductId,
            sku_attr: req.variantSku ?? "",
            product_count: req.quantity,
          }],
        }),
      },
    );
    const result = r.aliexpress_ds_order_create_response.result;
    return {
      externalOrderId: String(result.order_list?.[0] ?? ""),
      status: result.is_success ? "placed" : "failed",
      raw: result,
    };
  },

  async getTracking(externalOrderId: string) {
    const r = await call<{ aliexpress_ds_order_tracking_get_response: { result: { tracking_number?: string; tracking_url?: string; logistics_status?: string } } }>(
      "aliexpress.ds.order.tracking.get",
      { ae_order_id: externalOrderId },
    );
    const t = r.aliexpress_ds_order_tracking_get_response.result;
    return { trackingNumber: t.tracking_number, trackingUrl: t.tracking_url, status: t.logistics_status ?? "unknown" };
  },
};

interface AliProduct {
  product_id: string | number;
  product_title: string;
  product_main_image_url: string;
  product_small_image_urls?: { string: string[] };
  target_app_sale_price: string;
  target_app_sale_price_currency?: string;
  evaluate_rate?: string;
  lastest_volume?: number;
  shipping_to_days?: string;
  first_level_category_name?: string;
}

function mapProduct(p: AliProduct): SupplierProductDTO {
  const cost = Math.round(parseFloat(p.target_app_sale_price) * 100);
  return {
    externalId: String(p.product_id),
    title: p.product_title,
    images: [p.product_main_image_url, ...(p.product_small_image_urls?.string ?? [])].filter(Boolean),
    costCents: cost,
    currency: p.target_app_sale_price_currency ?? "USD",
    shippingDays: p.shipping_to_days ? parseInt(p.shipping_to_days, 10) : undefined,
    rating: p.evaluate_rate ? parseFloat(p.evaluate_rate) / 20 : undefined, // % → 0-5
    reviewCount: p.lastest_volume,
    category: p.first_level_category_name,
    raw: p,
  };
}

interface AliOrderResp {
  is_success: boolean;
  order_list?: number[];
  error_msg?: string;
}
