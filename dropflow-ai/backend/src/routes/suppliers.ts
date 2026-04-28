import express, { Router } from "express";
import { z } from "zod";
import { requireAuth, AuthedRequest } from "../middleware/auth.js";
import { adapters, adapterFor } from "../integrations/suppliers/index.js";
import { CsvAdapter } from "../integrations/suppliers/csv.js";
import { prisma } from "../lib/prisma.js";
import { badRequest } from "../lib/errors.js";

const r = Router();

r.get("/", requireAuth, async (_req, res, next) => {
  try {
    res.json({
      adapters: adapters.map((a) => ({ kind: a.kind, name: a.name, configured: a.isConfigured() })),
    });
  } catch (e) { next(e); }
});

r.post("/search", requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const body = z.object({
      kind: z.enum(["ALIEXPRESS", "CJ_DROPSHIPPING", "ZENDROP", "GENERIC_SCRAPED"]),
      query: z.string().min(1),
      limit: z.number().int().min(1).max(48).optional(),
    }).parse(req.body);
    const adapter = adapterFor(body.kind);
    const products = await adapter.searchProducts({ query: body.query, limit: body.limit });
    res.json({ products });
  } catch (e) { next(e); }
});

r.post("/csv-import", requireAuth, express.text({ type: "text/csv", limit: "5mb" }), async (req: AuthedRequest, res, next) => {
  try {
    if (!req.body || typeof req.body !== "string") throw badRequest("expected text/csv body");
    const products = CsvAdapter.parse(req.body);
    const supplier = await prisma.supplier.upsert({
      where: { id: `csv-${req.userId}` },
      update: {},
      create: { id: `csv-${req.userId}`, kind: "CSV_IMPORT", name: "Manual CSV import" },
    });
    for (const p of products) {
      await prisma.supplierProduct.upsert({
        where: { supplierId_externalId: { supplierId: supplier.id, externalId: p.externalId } },
        update: {
          title: p.title, description: p.description, images: p.images,
          cost: (p.costCents / 100).toFixed(2), currency: p.currency,
          shippingDays: p.shippingDays, moq: p.moq ?? 1, category: p.category,
        },
        create: {
          supplierId: supplier.id, externalId: p.externalId,
          title: p.title, description: p.description, images: p.images,
          cost: (p.costCents / 100).toFixed(2), currency: p.currency,
          shippingDays: p.shippingDays, moq: p.moq ?? 1, category: p.category,
        },
      });
    }
    res.json({ count: products.length });
  } catch (e) { next(e); }
});

export default r;
