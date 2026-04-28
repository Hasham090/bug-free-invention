import { OrderStage } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { logger } from "../lib/logger.js";
import { ShopifyAdmin } from "../integrations/shopify.js";
import { adapterFor } from "../integrations/suppliers/index.js";
import { notFound } from "../lib/errors.js";

const log = logger("order-fulfillment");

/**
 * Place each item of an order on its supplier and store the supplier order id.
 * Idempotent: skips items already linked to a placed SupplierOrder.
 */
export async function fulfillOrder(orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: { include: { product: { include: { supplierProduct: { include: { supplier: true } } } } } },
      supplierOrders: true,
    },
  });
  if (!order) throw notFound(`order ${orderId} not found`);

  const ship = order.shippingAddress as Record<string, string>;
  const customerName = `${ship.first_name ?? ""} ${ship.last_name ?? ""}`.trim() || (order.customerName ?? "Customer");

  for (const item of order.items) {
    const sp = item.product?.supplierProduct;
    if (!sp) {
      log.warn(`item ${item.id} has no supplier link — skipping auto-fulfillment`);
      continue;
    }
    if (order.supplierOrders.some((s) => s.supplierId === sp.supplierId)) continue;

    const adapter = adapterFor(sp.supplier.kind);
    if (!adapter.isConfigured()) {
      log.warn(`supplier ${sp.supplier.kind} not configured — manual fulfill required`);
      continue;
    }

    try {
      const placed = await adapter.placeOrder({
        externalProductId: sp.externalId,
        quantity: item.quantity,
        shipping: {
          name: customerName,
          line1: ship.address1 ?? "",
          line2: ship.address2 ?? undefined,
          city: ship.city ?? "",
          state: ship.province ?? ship.province_code,
          postalCode: ship.zip ?? "",
          country: ship.country_code ?? ship.country ?? "US",
          phone: ship.phone,
          email: order.customerEmail ?? undefined,
        },
      });
      await prisma.supplierOrder.create({
        data: {
          orderId: order.id,
          supplierId: sp.supplierId,
          externalOrderId: placed.externalOrderId,
          status: placed.status,
          payloadReceived: (placed.raw as object) ?? null,
          placedAt: new Date(),
        },
      });
    } catch (e) {
      log.error(`fulfill item ${item.id} failed: ${(e as Error).message}`);
    }
  }

  await prisma.order.update({
    where: { id: order.id },
    data: { stage: OrderStage.ORDERED_FROM_SUPPLIER },
  });
  return prisma.order.findUnique({ where: { id: order.id }, include: { supplierOrders: true } });
}

/**
 * For every supplier order that doesn't yet have tracking, ask the supplier
 * adapter; when tracking arrives, push it to Shopify and advance the stage.
 */
export async function syncTracking() {
  const pending = await prisma.supplierOrder.findMany({
    where: { trackingNumber: null, externalOrderId: { not: null } },
    include: {
      supplier: true,
      order: { include: { store: true } },
    },
    take: 100,
  });

  for (const so of pending) {
    const adapter = adapterFor(so.supplier.kind);
    if (!adapter.isConfigured()) continue;
    try {
      const t = await adapter.getTracking(so.externalOrderId!);
      if (!t.trackingNumber) continue;

      await prisma.supplierOrder.update({
        where: { id: so.id },
        data: { trackingNumber: t.trackingNumber, trackingUrl: t.trackingUrl ?? null, status: t.status },
      });

      // Push to Shopify.
      const admin = new ShopifyAdmin(so.order.store.domain, so.order.store.accessToken);
      const fulfillmentOrders = await admin.listFulfillmentOrders(parseInt(so.order.shopifyOrderId, 10));
      const open = fulfillmentOrders.fulfillment_orders.find((f) => f.status === "open");
      if (open) {
        await admin.updateOrderTracking(parseInt(so.order.shopifyOrderId, 10), open.id, {
          number: t.trackingNumber,
          url: t.trackingUrl,
        });
      }

      await prisma.order.update({
        where: { id: so.orderId },
        data: {
          stage: OrderStage.SHIPPED,
          trackingNumber: t.trackingNumber,
          trackingUrl: t.trackingUrl,
        },
      });
      log.info(`tracking pushed for order ${so.orderId} → ${t.trackingNumber}`);
    } catch (e) {
      log.warn(`tracking sync failed for ${so.id}: ${(e as Error).message}`);
    }
  }
}
