import { Router } from "express";
import { z } from "zod";
import { requireAuth, AuthedRequest } from "../middleware/auth.js";
import { applyBlueprintToShopify, generateStoreBlueprint } from "../services/storeBuilder.js";
import { prisma } from "../lib/prisma.js";
import { notFound } from "../lib/errors.js";

const r = Router();

r.post("/blueprint", requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const body = z.object({
      niche: z.string().min(2),
      targetMarket: z.string().optional(),
      storeId: z.string().optional(),
    }).parse(req.body);
    const blueprint = await generateStoreBlueprint({ ...body, storeId: body.storeId ?? null });
    res.json({ blueprint });
  } catch (e) { next(e); }
});

r.post("/apply", requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const body = z.object({ storeId: z.string(), blueprint: z.any(), niche: z.string().optional() }).parse(req.body);
    const store = await prisma.store.findFirst({ where: { id: body.storeId, userId: req.userId } });
    if (!store) throw notFound("store not found");
    if (body.niche) await prisma.store.update({ where: { id: store.id }, data: { niche: body.niche } });
    const result = await applyBlueprintToShopify(body.storeId, body.blueprint);
    res.json(result);
  } catch (e) { next(e); }
});

export default r;
