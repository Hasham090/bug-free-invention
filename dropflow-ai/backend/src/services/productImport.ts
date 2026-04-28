import { runClaudeJSON } from "../integrations/anthropic.js";
import { ShopifyAdmin, ShopifyProductCreate } from "../integrations/shopify.js";
import { adapterFor } from "../integrations/suppliers/index.js";
import { prisma } from "../lib/prisma.js";
import { logger } from "../lib/logger.js";
import { ProductStatus } from "@prisma/client";

const log = logger("product-import");

interface ListingCopy {
  title: string;
  description: string;
  tags: string[];
  collections: string[];
  recommendedPriceCents: number;
}

export async function generateListingCopy(input: {
  rawTitle: string;
  rawDescription?: string;
  category?: string;
  costCents: number;
  storeNiche?: string;
  storeId?: string | null;
}): Promise<ListingCopy> {
  const prompt = `Rewrite this dropshipping product into a high-converting Shopify listing.

Source title: ${JSON.stringify(input.rawTitle)}
Source description: ${JSON.stringify(input.rawDescription ?? "")}
Category: ${input.category ?? "unknown"}
Supplier cost (cents): ${input.costCents}
Store niche: ${input.storeNiche ?? "general"}

Return STRICT JSON:
{
  "title": "<SEO-optimized, ≤70 chars, includes primary keyword>",
  "description": "<HTML, benefit-led not feature-led, opens with hook, 3-5 bullet 'why you'll love it', short closing CTA paragraph>",
  "tags": ["6-10 tags"],
  "collections": ["2-4 storefront collection names"],
  "recommendedPriceCents": <integer, 2.5x-4x cost depending on category, ending in 99>
}`;
  return runClaudeJSON<ListingCopy>({
    prompt,
    kind: "PRODUCT_LISTING",
    storeId: input.storeId ?? null,
    maxTokens: 1500,
    temperature: 0.7,
  });
}

export async function importSupplierProductToStore(input: {
  storeId: string;
  supplierKind: "ALIEXPRESS" | "CJ_DROPSHIPPING" | "ZENDROP" | "GENERIC_SCRAPED" | "CSV_IMPORT";
  externalProductId: string;
  onProgress?: (step: string, pct: number) => void;
}) {
  const { storeId, supplierKind, externalProductId, onProgress } = input;
  const progress = onProgress ?? (() => {});

  progress("fetching supplier product", 5);
  const adapter = adapterFor(supplierKind);
  const supplierProduct = await adapter.getProduct(externalProductId);

  // Cache supplier product in DB (find or create supplier shell first).
  const supplier = await prisma.supplier.upsert({
    where: { id: `${supplierKind}-builtin` },
    update: {},
    create: { id: `${supplierKind}-builtin`, kind: supplierKind, name: adapter.name },
  });
  const cachedSupplierProduct = await prisma.supplierProduct.upsert({
    where: { supplierId_externalId: { supplierId: supplier.id, externalId: supplierProduct.externalId } },
    update: {
      title: supplierProduct.title,
      description: supplierProduct.description,
      images: supplierProduct.images,
      variants: (supplierProduct.variants as object) ?? null,
      cost: (supplierProduct.costCents / 100).toFixed(2),
      currency: supplierProduct.currency,
      shippingDays: supplierProduct.shippingDays,
      moq: supplierProduct.moq ?? 1,
      rating: supplierProduct.rating,
      reviewCount: supplierProduct.reviewCount,
      category: supplierProduct.category,
      raw: (supplierProduct.raw as object) ?? null,
      fetchedAt: new Date(),
    },
    create: {
      supplierId: supplier.id,
      externalId: supplierProduct.externalId,
      title: supplierProduct.title,
      description: supplierProduct.description,
      images: supplierProduct.images,
      variants: (supplierProduct.variants as object) ?? null,
      cost: (supplierProduct.costCents / 100).toFixed(2),
      currency: supplierProduct.currency,
      shippingDays: supplierProduct.shippingDays,
      moq: supplierProduct.moq ?? 1,
      rating: supplierProduct.rating,
      reviewCount: supplierProduct.reviewCount,
      category: supplierProduct.category,
      raw: (supplierProduct.raw as object) ?? null,
    },
  });

  progress("generating listing copy with Claude", 25);
  const store = await prisma.store.findUniqueOrThrow({ where: { id: storeId } });
  const copy = await generateListingCopy({
    rawTitle: supplierProduct.title,
    rawDescription: supplierProduct.description,
    category: supplierProduct.category,
    costCents: supplierProduct.costCents,
    storeNiche: store.niche ?? undefined,
    storeId,
  });

  progress("creating product on shopify", 60);
  const admin = new ShopifyAdmin(store.domain, store.accessToken);
  const variants = (supplierProduct.variants ?? [{ name: "Default", priceCents: copy.recommendedPriceCents, stock: 100 }]).map((v) => ({
    price: (copy.recommendedPriceCents / 100).toFixed(2),
    sku: v.sku,
    inventory_policy: "continue" as const,
    inventory_quantity: v.stock ?? 100,
    option1: v.options ? Object.values(v.options)[0] : v.name,
  }));
  const create: ShopifyProductCreate = {
    title: copy.title,
    body_html: copy.description,
    product_type: supplierProduct.category,
    tags: copy.tags.join(", "),
    status: "active",
    variants,
    images: supplierProduct.images.slice(0, 10).map((src) => ({ src })),
  };
  const created = await admin.createProduct(create);

  progress("persisting product", 90);
  const product = await prisma.product.create({
    data: {
      storeId,
      shopifyProductId: String(created.product.id),
      supplierProductId: cachedSupplierProduct.id,
      title: copy.title,
      description: copy.description,
      tags: copy.tags,
      images: supplierProduct.images,
      handle: created.product.handle,
      status: ProductStatus.ACTIVE,
      priceCents: copy.recommendedPriceCents,
      costCents: supplierProduct.costCents,
      marginPercent: ((copy.recommendedPriceCents - supplierProduct.costCents) / copy.recommendedPriceCents) * 100,
      variants: {
        create: created.product.variants.map((v) => ({
          shopifyVariantId: String(v.id),
          sku: v.sku,
          priceCents: copy.recommendedPriceCents,
          costCents: supplierProduct.costCents,
          inventoryQty: v.inventory_quantity,
        })),
      },
    },
  });

  progress("done", 100);
  log.info(`imported product ${product.id} -> shopify ${created.product.id}`);
  return product;
}
