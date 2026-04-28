import { Router } from "express";
import { z } from "zod";
import { requireAuth, AuthedRequest } from "../middleware/auth.js";
import { prisma } from "../lib/prisma.js";
import { notFound } from "../lib/errors.js";
import { researchProducts } from "../services/productResearch.js";
import { queues } from "../lib/queues.js";

const r = Router();

r.get("/", requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const storeId = z.string().optional().parse(req.query.storeId);
    const where = storeId
      ? { storeId, store: { userId: req.userId } }
      : { store: { userId: req.userId } };
    const products = await prisma.product.findMany({
      where,
      include: { variants: true, supplierProduct: { include: { supplier: true } } },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
    res.json({ products });
  } catch (e) { next(e); }
});

r.get("/:id", requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const product = await prisma.product.findFirst({
      where: { id: req.params.id, store: { userId: req.userId } },
      include: { variants: true, supplierProduct: { include: { supplier: true } } },
    });
    if (!product) throw notFound();
    res.json({ product });
  } catch (e) { next(e); }
});

r.post("/research", requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const body = z.object({
      niche: z.string().min(2),
      targetMarket: z.string().optional(),
      budgetCents: z.number().int().positive().optional(),
      limit: z.number().int().min(1).max(48).optional(),
    }).parse(req.body);
    const results = await researchProducts(body);
    res.json({ products: results });
  } catch (e) { next(e); }
});

r.post("/import", requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const body = z.object({
      storeId: z.string(),
      supplierKind: z.enum(["ALIEXPRESS", "CJ_DROPSHIPPING", "ZENDROP", "GENERIC_SCRAPED", "CSV_IMPORT"]),
      externalProductId: z.string(),
    }).parse(req.body);
    // ownership check
    const store = await prisma.store.findFirst({ where: { id: body.storeId, userId: req.userId } });
    if (!store) throw notFound("store not found");
    const job = await queues.productImport.add({ ...body, userId: req.userId }, {});
    res.json({ jobId: job.id });
  } catch (e) { next(e); }
});

export default r;
