import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";
import { env } from "../lib/env.js";
import { unauthorized } from "../lib/errors.js";
import { importSupplierProductToStore } from "../services/productImport.js";
import { fulfillOrder, syncTracking } from "../services/orderFulfillment.js";
import { monitorBudgets } from "../services/adManager.js";
import { generateStoreBlueprint, applyBlueprintToShopify } from "../services/storeBuilder.js";
import { researchProducts } from "../services/productResearch.js";
import { generateDailyTips } from "../services/dashboard.js";
import { prisma } from "../lib/prisma.js";

const r = Router();
const SECRET = process.env.INTERNAL_API_SECRET ?? env.JWT_SECRET;

r.use((req: Request, _res: Response, next: NextFunction) => {
  if (req.header("x-internal-secret") !== SECRET) return next(unauthorized("internal: bad secret"));
  next();
});

r.post("/jobs/product-import", async (req, res, next) => {
  try {
    const body = z.object({
      storeId: z.string(),
      supplierKind: z.enum(["ALIEXPRESS", "CJ_DROPSHIPPING", "ZENDROP", "GENERIC_SCRAPED", "CSV_IMPORT"]),
      externalProductId: z.string(),
    }).parse(req.body);
    const product = await importSupplierProductToStore(body);
    res.json({ product });
  } catch (e) { next(e); }
});

r.post("/jobs/fulfill-order", async (req, res, next) => {
  try {
    const body = z.object({ orderId: z.string() }).parse(req.body);
    const order = await fulfillOrder(body.orderId);
    res.json({ ok: true, order });
  } catch (e) { next(e); }
});

r.post("/jobs/tracking-sync", async (_req, res, next) => {
  try {
    await syncTracking();
    res.json({ ok: true });
  } catch (e) { next(e); }
});

r.post("/jobs/ad-budget-monitor", async (_req, res, next) => {
  try {
    await monitorBudgets();
    res.json({ ok: true });
  } catch (e) { next(e); }
});

r.post("/jobs/store-builder", async (req, res, next) => {
  try {
    const body = z.object({ storeId: z.string(), niche: z.string(), targetMarket: z.string().optional() }).parse(req.body);
    const blueprint = await generateStoreBlueprint({ niche: body.niche, targetMarket: body.targetMarket, storeId: body.storeId });
    res.json({ blueprint });
  } catch (e) { next(e); }
});

r.post("/jobs/store-builder/apply", async (req, res, next) => {
  try {
    const body = z.object({ storeId: z.string(), blueprint: z.any(), niche: z.string().optional() }).parse(req.body);
    if (body.niche) await prisma.store.update({ where: { id: body.storeId }, data: { niche: body.niche } });
    const result = await applyBlueprintToShopify(body.storeId, body.blueprint);
    res.json(result);
  } catch (e) { next(e); }
});

r.post("/jobs/product-research", async (req, res, next) => {
  try {
    const body = z.object({ niche: z.string(), targetMarket: z.string().optional(), budgetCents: z.number().int().optional() }).parse(req.body);
    const products = await researchProducts(body);
    res.json({ products });
  } catch (e) { next(e); }
});

r.post("/jobs/daily-tips", async (_req, res, next) => {
  try {
    const users = await prisma.user.findMany({ select: { id: true } });
    let total = 0;
    for (const u of users) {
      try {
        const tips = await generateDailyTips(u.id);
        for (const t of tips) {
          await prisma.notification.create({
            data: { userId: u.id, level: t.level, title: t.title, body: t.body, meta: (t.action as object) ?? null },
          });
        }
        total += tips.length;
      } catch (e) {
        // continue across users
      }
    }
    res.json({ ok: true, total });
  } catch (e) { next(e); }
});

export default r;
