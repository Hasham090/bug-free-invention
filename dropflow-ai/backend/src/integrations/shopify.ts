import axios, { AxiosInstance } from "axios";
import crypto from "node:crypto";
import { env } from "../lib/env.js";
import { logger } from "../lib/logger.js";
import { upstream } from "../lib/errors.js";

const log = logger("shopify");
const API_VERSION = "2024-10";

// ───── OAuth ─────

export function buildShopifyAuthUrl(shop: string, state: string): string {
  const url = new URL(`https://${shop}/admin/oauth/authorize`);
  url.searchParams.set("client_id", env.SHOPIFY_API_KEY);
  url.searchParams.set("scope", env.SHOPIFY_SCOPES);
  url.searchParams.set("redirect_uri", env.SHOPIFY_REDIRECT_URI);
  url.searchParams.set("state", state);
  return url.toString();
}

export function verifyShopifyHmac(query: Record<string, string>): boolean {
  const { hmac, signature: _sig, ...rest } = query;
  if (!hmac) return false;
  const sorted = Object.keys(rest)
    .sort()
    .map((k) => `${k}=${rest[k]}`)
    .join("&");
  const computed = crypto
    .createHmac("sha256", env.SHOPIFY_API_SECRET)
    .update(sorted)
    .digest("hex");
  return crypto.timingSafeEqual(Buffer.from(hmac), Buffer.from(computed));
}

export function verifyShopifyWebhook(rawBody: Buffer, hmacHeader: string): boolean {
  const computed = crypto
    .createHmac("sha256", env.SHOPIFY_API_SECRET)
    .update(rawBody)
    .digest("base64");
  try {
    return crypto.timingSafeEqual(Buffer.from(hmacHeader), Buffer.from(computed));
  } catch {
    return false;
  }
}

export async function exchangeCodeForToken(shop: string, code: string): Promise<{ access_token: string; scope: string }> {
  const res = await axios.post(`https://${shop}/admin/oauth/access_token`, {
    client_id: env.SHOPIFY_API_KEY,
    client_secret: env.SHOPIFY_API_SECRET,
    code,
  });
  return res.data;
}

// ───── Admin API client ─────

export class ShopifyAdmin {
  private http: AxiosInstance;
  constructor(public shop: string, public token: string) {
    this.http = axios.create({
      baseURL: `https://${shop}/admin/api/${API_VERSION}`,
      headers: { "X-Shopify-Access-Token": token, "Content-Type": "application/json" },
      timeout: 20_000,
    });
  }

  private async req<T>(method: "GET" | "POST" | "PUT" | "DELETE", path: string, body?: unknown): Promise<T> {
    try {
      const res = await this.http.request<T>({ method, url: path, data: body });
      return res.data;
    } catch (e: unknown) {
      const err = e as { response?: { data?: unknown; status?: number }; message?: string };
      log.error(`${method} ${path} failed`, err.response?.data ?? err.message);
      throw upstream(`shopify ${method} ${path} failed`, err.response?.data);
    }
  }

  shopInfo() {
    return this.req<{ shop: { id: number; name: string; email: string; domain: string; primary_locale: string } }>(
      "GET",
      "/shop.json",
    );
  }

  listProducts(limit = 50) {
    return this.req<{ products: ShopifyProduct[] }>("GET", `/products.json?limit=${limit}`);
  }

  listOrders(limit = 50, status: "any" | "open" | "closed" = "any") {
    return this.req<{ orders: ShopifyOrder[] }>("GET", `/orders.json?limit=${limit}&status=${status}`);
  }

  createProduct(product: ShopifyProductCreate) {
    return this.req<{ product: ShopifyProduct }>("POST", "/products.json", { product });
  }

  updateInventoryPolicy(variantId: number, policy: "deny" | "continue") {
    return this.req("PUT", `/variants/${variantId}.json`, {
      variant: { id: variantId, inventory_policy: policy },
    });
  }

  uploadProductImage(productId: number, src: string) {
    return this.req("POST", `/products/${productId}/images.json`, { image: { src } });
  }

  registerWebhook(topic: string, address: string) {
    return this.req<{ webhook: { id: number } }>("POST", "/webhooks.json", {
      webhook: { topic, address, format: "json" },
    });
  }

  updateOrderTracking(orderId: number, fulfillmentOrderId: number, tracking: { number: string; url?: string; company?: string }) {
    return this.req("POST", `/fulfillments.json`, {
      fulfillment: {
        line_items_by_fulfillment_order: [{ fulfillment_order_id: fulfillmentOrderId }],
        tracking_info: { number: tracking.number, url: tracking.url, company: tracking.company ?? "Other" },
        notify_customer: true,
      },
    });
  }

  listFulfillmentOrders(orderId: number) {
    return this.req<{ fulfillment_orders: { id: number; status: string }[] }>(
      "GET",
      `/orders/${orderId}/fulfillment_orders.json`,
    );
  }

  createPage(page: { title: string; body_html: string; handle?: string }) {
    return this.req("POST", "/pages.json", { page });
  }

  // Theme settings: this is intentionally minimal — full theme config requires
  // either editing theme assets or using the Storefront/Theme app extension.
  publishTheme(themeId: number) {
    return this.req("PUT", `/themes/${themeId}.json`, { theme: { id: themeId, role: "main" } });
  }
}

// ───── Partner API: create new store ─────

/**
 * Provisions a new development store via the Shopify Partner GraphQL API.
 * Requires SHOPIFY_PARTNER_API_TOKEN and SHOPIFY_PARTNER_ORG_ID.
 */
export async function createDevelopmentStore(input: {
  storeName: string;
  storeType?: "merchant" | "affiliate" | "developer";
}): Promise<{ shopDomain: string; createdAt: string }> {
  if (!env.SHOPIFY_PARTNER_API_TOKEN || !env.SHOPIFY_PARTNER_ORG_ID) {
    throw upstream("Partner API credentials not configured (SHOPIFY_PARTNER_API_TOKEN / SHOPIFY_PARTNER_ORG_ID)");
  }
  const url = `https://partners.shopify.com/${env.SHOPIFY_PARTNER_ORG_ID}/api/2024-10/graphql.json`;
  const query = `mutation CreateStore($input: DevelopmentStoreInput!) {
    developmentStoreCreate(input: $input) {
      developmentStore { shopDomain createdAt }
      userErrors { field message }
    }
  }`;
  const res = await axios.post(
    url,
    { query, variables: { input: { storeName: input.storeName, storeType: input.storeType ?? "developer" } } },
    { headers: { "X-Shopify-Access-Token": env.SHOPIFY_PARTNER_API_TOKEN } },
  );
  const data = res.data?.data?.developmentStoreCreate;
  if (!data || data.userErrors?.length) {
    throw upstream("partner store creation failed", data?.userErrors);
  }
  return data.developmentStore;
}

// ───── Webhook bootstrap ─────

const REQUIRED_WEBHOOKS = [
  "orders/create",
  "orders/updated",
  "orders/cancelled",
  "refunds/create",
  "inventory_levels/update",
  "products/update",
];

export async function bootstrapWebhooks(admin: ShopifyAdmin) {
  const base = env.BACKEND_PUBLIC_URL.replace(/\/$/, "");
  for (const topic of REQUIRED_WEBHOOKS) {
    try {
      await admin.registerWebhook(topic, `${base}/api/shopify/webhooks/${topic.replace("/", "-")}`);
      log.info(`registered webhook ${topic} for ${admin.shop}`);
    } catch (e) {
      log.warn(`webhook register failed for ${topic}: ${(e as Error).message}`);
    }
  }
}

// ───── Types ─────

export interface ShopifyProduct {
  id: number;
  title: string;
  body_html: string;
  handle: string;
  status: string;
  tags: string;
  variants: { id: number; sku: string; price: string; inventory_quantity: number }[];
  images: { src: string }[];
}

export interface ShopifyOrder {
  id: number;
  name: string;
  email: string | null;
  total_price: string;
  currency: string;
  shipping_address: Record<string, unknown> | null;
  customer: { first_name: string; last_name: string; email: string } | null;
  line_items: { id: number; title: string; quantity: number; price: string; variant_id: number; product_id: number }[];
}

export interface ShopifyProductCreate {
  title: string;
  body_html: string;
  vendor?: string;
  product_type?: string;
  tags?: string;
  status?: "active" | "draft" | "archived";
  variants?: { price: string; sku?: string; inventory_policy?: "deny" | "continue"; inventory_quantity?: number; option1?: string; option2?: string; option3?: string }[];
  images?: { src: string }[];
  options?: { name: string; values: string[] }[];
}
