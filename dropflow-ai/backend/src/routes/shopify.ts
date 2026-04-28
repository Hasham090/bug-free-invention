import express, { Router } from "express";
import { z } from "zod";
import crypto from "node:crypto";
import { prisma } from "../lib/prisma.js";
import { badRequest, notFound } from "../lib/errors.js";
import { requireAuth, AuthedRequest } from "../middleware/auth.js";
import {
  buildShopifyAuthUrl,
  exchangeCodeForToken,
  ShopifyAdmin,
  bootstrapWebhooks,
  verifyShopifyHmac,
  verifyShopifyWebhook,
  createDevelopmentStore,
} from "../integrations/shopify.js";
import { queues } from "../lib/queues.js";
import { logger } from "../lib/logger.js";
import { OrderStage } from "@prisma/client";
import { env } from "../lib/env.js";

const r = Router();
const log = logger("shopify-routes");

// in-memory state→userId map for OAuth flow (small enough; could move to Redis)
const stateStore = new Map<string, { userId: string; shop: string; expiresAt: number }>();

r.get("/install", requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const shop = z.string().regex(/^[a-z0-9-]+\.myshopify\.com$/).parse(req.query.shop);
    const state = crypto.randomBytes(16).toString("hex");
    stateStore.set(state, { userId: req.userId!, shop, expiresAt: Date.now() + 10 * 60_000 });
    res.json({ url: buildShopifyAuthUrl(shop, state) });
  } catch (e) {
    next(e);
  }
});

r.get("/callback", async (req, res, next) => {
  try {
    const q = req.query as Record<string, string>;
    if (!verifyShopifyHmac(q)) throw badRequest("invalid hmac");
    const ctx = stateStore.get(q.state);
    if (!ctx || ctx.expiresAt < Date.now()) throw badRequest("invalid or expired state");
    stateStore.delete(q.state);
    if (q.shop !== ctx.shop) throw badRequest("shop mismatch");

    const { access_token, scope } = await exchangeCodeForToken(ctx.shop, q.code);
    const admin = new ShopifyAdmin(ctx.shop, access_token);
    const info = await admin.shopInfo();

    const store = await prisma.store.upsert({
      where: { domain: ctx.shop },
      update: { accessToken: access_token, scope, isActive: true },
      create: {
        userId: ctx.userId,
        platform: "SHOPIFY",
        name: info.shop.name,
        domain: ctx.shop,
        accessToken: access_token,
        scope,
      },
    });

    await bootstrapWebhooks(admin);

    res.redirect(`${env.FRONTEND_URL}/stores/${store.id}?installed=1`);
  } catch (e) {
    next(e);
  }
});

r.post("/partner-create-store", requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const body = z.object({ storeName: z.string().min(2) }).parse(req.body);
    const result = await createDevelopmentStore({ storeName: body.storeName });
    res.json(result);
  } catch (e) {
    next(e);
  }
});

// ───── Webhooks ─────
// Must use raw body for HMAC validation; we mount the raw parser on this router only.

const rawJson = express.raw({ type: "application/json", limit: "5mb" });

const webhookHandler = (topic: string) =>
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      const hmac = req.header("x-shopify-hmac-sha256") ?? "";
      const shop = req.header("x-shopify-shop-domain") ?? "";
      if (!verifyShopifyWebhook(req.body as Buffer, hmac)) {
        log.warn(`invalid webhook hmac for ${topic} ${shop}`);
        return res.status(401).end();
      }
      const payload = JSON.parse((req.body as Buffer).toString("utf8"));
      const store = await prisma.store.findUnique({ where: { domain: shop } });
      if (!store) return res.status(404).end();

      switch (topic) {
        case "orders/create":
          await handleOrderCreate(store.id, payload);
          break;
        case "orders/updated":
          await handleOrderUpdate(store.id, payload);
          break;
        case "orders/cancelled":
          await prisma.order.updateMany({ where: { storeId: store.id, shopifyOrderId: String(payload.id) }, data: { stage: OrderStage.CANCELLED } });
          break;
        case "refunds/create":
          await prisma.order.updateMany({ where: { storeId: store.id, shopifyOrderId: String(payload.order_id) }, data: { stage: OrderStage.REFUNDED } });
          break;
        case "inventory_levels/update":
          // could decrement local cache here
          break;
        case "products/update":
          break;
      }

      res.status(200).end();
    } catch (e) {
      next(e);
    }
  };

async function handleOrderCreate(storeId: string, payload: any) {
  const order = await prisma.order.upsert({
    where: { shopifyOrderId: String(payload.id) },
    update: {},
    create: {
      storeId,
      shopifyOrderId: String(payload.id),
      orderNumber: String(payload.name ?? payload.order_number ?? payload.id),
      customerEmail: payload.email,
      customerName: payload.customer ? `${payload.customer.first_name ?? ""} ${payload.customer.last_name ?? ""}`.trim() : null,
      shippingAddress: payload.shipping_address ?? {},
      totalCents: Math.round(parseFloat(payload.total_price ?? "0") * 100),
      currency: payload.currency ?? "USD",
      items: {
        create: (payload.line_items ?? []).map((li: any) => ({
          shopifyVariantId: String(li.variant_id),
          title: li.title,
          quantity: li.quantity,
          priceCents: Math.round(parseFloat(li.price ?? "0") * 100),
          productId: undefined,
        })),
      },
    },
  });

  // Link items to internal products by shopify variant id, where possible.
  const items = await prisma.orderItem.findMany({ where: { orderId: order.id, productId: null } });
  for (const item of items) {
    if (!item.shopifyVariantId) continue;
    const v = await prisma.productVariant.findUnique({ where: { shopifyVariantId: item.shopifyVariantId } });
    if (v) await prisma.orderItem.update({ where: { id: item.id }, data: { productId: v.productId } });
  }

  await queues.orderFulfillment.add({ orderId: order.id }, { delay: 5_000 });
  log.info(`queued fulfillment for order ${order.id}`);
}

async function handleOrderUpdate(storeId: string, payload: any) {
  await prisma.order.updateMany({
    where: { storeId, shopifyOrderId: String(payload.id) },
    data: {
      totalCents: Math.round(parseFloat(payload.total_price ?? "0") * 100),
      stage: payload.cancelled_at ? OrderStage.CANCELLED : undefined,
    },
  });
}

const TOPICS = ["orders/create", "orders/updated", "orders/cancelled", "refunds/create", "inventory_levels/update", "products/update"];
for (const t of TOPICS) {
  r.post(`/webhooks/${t.replace("/", "-")}`, rawJson, webhookHandler(t));
}

// ───── Stores list/detail ─────

r.get("/stores", requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const stores = await prisma.store.findMany({ where: { userId: req.userId } });
    res.json({ stores });
  } catch (e) { next(e); }
});

r.get("/stores/:id", requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const store = await prisma.store.findFirst({ where: { id: req.params.id, userId: req.userId } });
    if (!store) throw notFound();
    res.json({ store });
  } catch (e) { next(e); }
});

export default r;
