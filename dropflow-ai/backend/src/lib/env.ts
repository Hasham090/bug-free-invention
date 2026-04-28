import dotenv from "dotenv";
dotenv.config();

function need(key: string): string {
  const v = process.env[key];
  if (!v) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(`Missing required env var: ${key}`);
    }
    console.warn(`[env] Missing ${key} — running in dev mode with degraded functionality.`);
  }
  return v ?? "";
}

export const env = {
  NODE_ENV: process.env.NODE_ENV ?? "development",
  PORT: parseInt(process.env.BACKEND_PORT ?? "4000", 10),
  DATABASE_URL: need("DATABASE_URL"),
  REDIS_URL: process.env.REDIS_URL ?? "redis://localhost:6379",
  FRONTEND_URL: process.env.FRONTEND_URL ?? "http://localhost:3000",
  BACKEND_PUBLIC_URL: process.env.BACKEND_PUBLIC_URL ?? "http://localhost:4000",
  JWT_SECRET: process.env.JWT_SECRET ?? "dev-jwt-secret",

  ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY ?? "",
  ANTHROPIC_MODEL: process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-20250514",

  SHOPIFY_API_KEY: process.env.SHOPIFY_API_KEY ?? "",
  SHOPIFY_API_SECRET: process.env.SHOPIFY_API_SECRET ?? "",
  SHOPIFY_SCOPES: process.env.SHOPIFY_SCOPES ?? "read_products,write_products,read_orders,write_orders,read_inventory,write_inventory,read_customers,write_themes,write_content",
  SHOPIFY_REDIRECT_URI: process.env.SHOPIFY_REDIRECT_URI ?? "http://localhost:4000/api/shopify/callback",
  SHOPIFY_PARTNER_API_TOKEN: process.env.SHOPIFY_PARTNER_API_TOKEN ?? "",
  SHOPIFY_PARTNER_ORG_ID: process.env.SHOPIFY_PARTNER_ORG_ID ?? "",

  ALIEXPRESS_API_KEY: process.env.ALIEXPRESS_API_KEY ?? "",
  ALIEXPRESS_API_SECRET: process.env.ALIEXPRESS_API_SECRET ?? "",
  CJDROPSHIPPING_API_KEY: process.env.CJDROPSHIPPING_API_KEY ?? "",
  ZENDROP_API_KEY: process.env.ZENDROP_API_KEY ?? "",

  FACEBOOK_APP_ID: process.env.FACEBOOK_APP_ID ?? "",
  FACEBOOK_APP_SECRET: process.env.FACEBOOK_APP_SECRET ?? "",
  GOOGLE_ADS_CLIENT_ID: process.env.GOOGLE_ADS_CLIENT_ID ?? "",
  GOOGLE_ADS_CLIENT_SECRET: process.env.GOOGLE_ADS_CLIENT_SECRET ?? "",
  GOOGLE_ADS_DEVELOPER_TOKEN: process.env.GOOGLE_ADS_DEVELOPER_TOKEN ?? "",
  TIKTOK_APP_ID: process.env.TIKTOK_APP_ID ?? "",
  TIKTOK_APP_SECRET: process.env.TIKTOK_APP_SECRET ?? "",

  GOOGLE_TRENDS_API_KEY: process.env.GOOGLE_TRENDS_API_KEY ?? "",
};
