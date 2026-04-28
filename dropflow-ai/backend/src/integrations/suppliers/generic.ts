import { chromium } from "playwright";
import { logger } from "../../lib/logger.js";
import { badRequest } from "../../lib/errors.js";
import type { SupplierAdapter, SupplierProductDTO } from "./types.js";

const log = logger("generic-scraper");

/**
 * Generic supplier adapter: takes any product listing/category URL and tries to
 * extract product cards using common heuristics + JSON-LD product schema.
 *
 * It cannot place real orders — placeOrder/getTracking throw because there's no
 * supplier-specific cart flow. Use this adapter for product discovery and
 * manual fulfillment.
 */
export const genericAdapter: SupplierAdapter = {
  kind: "GENERIC_SCRAPED",
  name: "Generic supplier (scraped)",
  isConfigured: () => true,

  async searchProducts({ query }) {
    if (!query.startsWith("http")) {
      throw badRequest("generic adapter expects a URL as the query");
    }
    const browser = await chromium.launch({ headless: true });
    try {
      const ctx = await browser.newContext({ userAgent: "Mozilla/5.0 DropFlow/1.0" });
      const page = await ctx.newPage();
      await page.goto(query, { waitUntil: "domcontentloaded", timeout: 30_000 });

      // Try JSON-LD first.
      const jsonLd = await page.$$eval('script[type="application/ld+json"]', (els) =>
        els.map((e) => e.textContent ?? ""),
      );
      const products: SupplierProductDTO[] = [];
      for (const blob of jsonLd) {
        try {
          const data = JSON.parse(blob);
          const items = Array.isArray(data) ? data : [data];
          for (const item of items) {
            const arr = item["@graph"] ?? [item];
            for (const x of arr) {
              if (x["@type"] === "Product" || (Array.isArray(x["@type"]) && x["@type"].includes("Product"))) {
                products.push({
                  externalId: x.sku ?? x.productID ?? x.url ?? x.name,
                  title: x.name,
                  description: typeof x.description === "string" ? x.description : undefined,
                  images: Array.isArray(x.image) ? x.image : x.image ? [x.image] : [],
                  costCents: Math.round(parseFloat(x.offers?.price ?? x.offers?.[0]?.price ?? "0") * 100),
                  currency: x.offers?.priceCurrency ?? "USD",
                  rating: x.aggregateRating?.ratingValue ? parseFloat(x.aggregateRating.ratingValue) : undefined,
                  reviewCount: x.aggregateRating?.reviewCount ? parseInt(x.aggregateRating.reviewCount, 10) : undefined,
                  raw: x,
                });
              }
            }
          }
        } catch {
          /* ignore malformed JSON-LD */
        }
      }

      // DOM heuristic fallback.
      if (products.length === 0) {
        const cards = await page.$$eval('a[href*="product"], div[class*="product"]', (els) =>
          els.slice(0, 30).map((el) => {
            const text = el.textContent?.trim().slice(0, 200) ?? "";
            const img = el.querySelector("img")?.getAttribute("src") ?? "";
            const priceMatch = text.match(/\$\s?(\d+(?:\.\d{2})?)/);
            return { text, img, price: priceMatch ? priceMatch[1] : null, href: (el as HTMLAnchorElement).href ?? "" };
          }),
        );
        for (const c of cards) {
          if (!c.price) continue;
          products.push({
            externalId: c.href || c.text.slice(0, 80),
            title: c.text.split("\n")[0] || "Product",
            images: c.img ? [c.img] : [],
            costCents: Math.round(parseFloat(c.price) * 100),
            currency: "USD",
            raw: c,
          });
        }
      }

      log.info(`scraped ${products.length} products from ${query}`);
      return products;
    } finally {
      await browser.close();
    }
  },

  async getProduct(externalId) {
    return this.searchProducts({ query: externalId }).then((arr) => {
      if (!arr[0]) throw badRequest("no product found at URL");
      return arr[0];
    });
  },

  async placeOrder() {
    throw badRequest("generic scraped supplier cannot place orders programmatically");
  },

  async getTracking() {
    throw badRequest("generic scraped supplier cannot fetch tracking");
  },
};
