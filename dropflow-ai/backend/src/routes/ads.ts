import { Router } from "express";
import { z } from "zod";
import crypto from "node:crypto";
import { requireAuth, AuthedRequest } from "../middleware/auth.js";
import { adAdapterFor, adAdapters } from "../integrations/ads/index.js";
import { launchCampaign, generateCreatives } from "../services/adManager.js";
import { prisma } from "../lib/prisma.js";
import { badRequest, notFound } from "../lib/errors.js";
import { env } from "../lib/env.js";

const r = Router();

const oauthStates = new Map<string, { userId: string; platform: "FACEBOOK" | "GOOGLE" | "TIKTOK"; expiresAt: number }>();

r.get("/platforms", requireAuth, async (_req, res, next) => {
  try {
    res.json({ platforms: adAdapters.map((a) => ({ platform: a.platform, configured: a.isConfigured() })) });
  } catch (e) { next(e); }
});

r.get("/oauth/:platform/start", requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const platform = z.enum(["FACEBOOK", "GOOGLE", "TIKTOK"]).parse(req.params.platform.toUpperCase());
    const adapter = adAdapterFor(platform);
    const state = crypto.randomBytes(16).toString("hex");
    oauthStates.set(state, { userId: req.userId!, platform, expiresAt: Date.now() + 10 * 60_000 });
    const redirectUri = `${env.BACKEND_PUBLIC_URL}/api/ads/oauth/${platform.toLowerCase()}/callback`;
    res.json({ url: adapter.oauthAuthorizeUrl(state, redirectUri) });
  } catch (e) { next(e); }
});

r.get("/oauth/:platform/callback", async (req, res, next) => {
  try {
    const platform = z.enum(["FACEBOOK", "GOOGLE", "TIKTOK"]).parse(req.params.platform.toUpperCase());
    const code = z.string().parse(req.query.code);
    const state = z.string().parse(req.query.state);
    const ctx = oauthStates.get(state);
    if (!ctx || ctx.expiresAt < Date.now() || ctx.platform !== platform) throw badRequest("invalid state");
    oauthStates.delete(state);

    const adapter = adAdapterFor(platform);
    const redirectUri = `${env.BACKEND_PUBLIC_URL}/api/ads/oauth/${platform.toLowerCase()}/callback`;
    const tokens = await adapter.oauthExchange(code, redirectUri);
    await prisma.adAccount.upsert({
      where: { userId_platform_externalId: { userId: ctx.userId, platform, externalId: tokens.externalAccountId } },
      update: { accessToken: tokens.accessToken, refreshToken: tokens.refreshToken, tokenExpiresAt: tokens.expiresAt },
      create: {
        userId: ctx.userId,
        platform,
        externalId: tokens.externalAccountId,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        tokenExpiresAt: tokens.expiresAt,
      },
    });
    res.redirect(`${env.FRONTEND_URL}/campaigns?connected=${platform}`);
  } catch (e) { next(e); }
});

r.get("/accounts", requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const accounts = await prisma.adAccount.findMany({ where: { userId: req.userId } });
    res.json({ accounts });
  } catch (e) { next(e); }
});

r.get("/campaigns", requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const campaigns = await prisma.adCampaign.findMany({
      where: { store: { userId: req.userId } },
      include: { adAccount: true, metrics: { orderBy: { date: "desc" }, take: 30 } },
      orderBy: { createdAt: "desc" },
    });
    res.json({ campaigns });
  } catch (e) { next(e); }
});

r.post("/campaigns", requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const body = z.object({
      storeId: z.string(),
      adAccountId: z.string(),
      productIds: z.array(z.string()).min(1),
      monthlyBudgetCents: z.number().int().positive(),
      name: z.string().optional(),
    }).parse(req.body);
    const store = await prisma.store.findFirst({ where: { id: body.storeId, userId: req.userId } });
    if (!store) throw notFound("store not found");
    const c = await launchCampaign(body);
    res.json({ campaign: c });
  } catch (e) { next(e); }
});

r.post("/campaigns/:id/pause", requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const c = await prisma.adCampaign.findFirst({
      where: { id: req.params.id, store: { userId: req.userId } },
      include: { adAccount: true },
    });
    if (!c || !c.externalCampaignId) throw notFound();
    const adapter = adAdapterFor(c.platform);
    await adapter.pauseCampaign(c.adAccount.accessToken, c.externalCampaignId);
    await prisma.adCampaign.update({ where: { id: c.id }, data: { status: "PAUSED" } });
    res.json({ ok: true });
  } catch (e) { next(e); }
});

r.post("/preview-creatives", requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const body = z.object({
      storeId: z.string(),
      productId: z.string(),
      platform: z.enum(["FACEBOOK", "GOOGLE", "TIKTOK"]),
    }).parse(req.body);
    const product = await prisma.product.findFirst({ where: { id: body.productId, store: { userId: req.userId } }, include: { store: true } });
    if (!product) throw notFound();
    const creatives = await generateCreatives({
      productTitle: product.title,
      productDescription: product.description ?? undefined,
      niche: product.store.niche ?? "general",
      platform: body.platform,
      storeId: body.storeId,
    });
    res.json({ creatives });
  } catch (e) { next(e); }
});

export default r;
