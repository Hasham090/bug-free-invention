import { CampaignStatus, OrderStage } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { runClaudeJSON } from "../integrations/anthropic.js";

export interface DashboardSnapshot {
  revenue: { todayCents: number; weekCents: number; monthCents: number };
  orders: { pending: number; processing: number; fulfilled: number };
  adSpend: { todayCents: number; weekCents: number; monthCents: number };
  profitMonthCents: number;
  topProducts: { id: string; title: string; revenueCents: number; orderCount: number }[];
  pipeline: { stage: OrderStage; count: number }[];
}

export async function dashboardSnapshot(userId: string): Promise<DashboardSnapshot> {
  const stores = await prisma.store.findMany({ where: { userId }, select: { id: true } });
  const storeIds = stores.map((s) => s.id);
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfWeek = new Date(now); startOfWeek.setDate(now.getDate() - 7);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const ordersInRange = (since: Date) =>
    prisma.order.aggregate({
      _sum: { totalCents: true },
      where: { storeId: { in: storeIds }, receivedAt: { gte: since }, stage: { notIn: [OrderStage.CANCELLED, OrderStage.REFUNDED] } },
    });

  const [today, week, month, pending, processing, fulfilled, pipelineRows] = await Promise.all([
    ordersInRange(startOfDay),
    ordersInRange(startOfWeek),
    ordersInRange(startOfMonth),
    prisma.order.count({ where: { storeId: { in: storeIds }, stage: OrderStage.RECEIVED } }),
    prisma.order.count({ where: { storeId: { in: storeIds }, stage: { in: [OrderStage.ORDERED_FROM_SUPPLIER, OrderStage.SHIPPED] } } }),
    prisma.order.count({ where: { storeId: { in: storeIds }, stage: OrderStage.DELIVERED } }),
    prisma.order.groupBy({ by: ["stage"], where: { storeId: { in: storeIds } }, _count: true }),
  ]);

  const adsInRange = async (since: Date) => {
    const r = await prisma.adMetricDaily.aggregate({
      _sum: { spendCents: true },
      where: { date: { gte: since }, campaign: { storeId: { in: storeIds } } },
    });
    return r._sum.spendCents ?? 0;
  };
  const [adToday, adWeek, adMonth] = await Promise.all([adsInRange(startOfDay), adsInRange(startOfWeek), adsInRange(startOfMonth)]);

  const top = await prisma.orderItem.groupBy({
    by: ["productId"],
    where: {
      productId: { not: null },
      order: { storeId: { in: storeIds }, receivedAt: { gte: startOfMonth } },
    },
    _sum: { priceCents: true, quantity: true },
    orderBy: { _sum: { priceCents: "desc" } },
    take: 5,
  });
  const topProductDetails = await prisma.product.findMany({
    where: { id: { in: top.map((t) => t.productId!).filter(Boolean) } },
    select: { id: true, title: true },
  });
  const topProducts = top.map((t) => ({
    id: t.productId!,
    title: topProductDetails.find((p) => p.id === t.productId)?.title ?? "Untitled",
    revenueCents: t._sum.priceCents ?? 0,
    orderCount: t._sum.quantity ?? 0,
  }));

  const monthRev = month._sum.totalCents ?? 0;
  return {
    revenue: { todayCents: today._sum.totalCents ?? 0, weekCents: week._sum.totalCents ?? 0, monthCents: monthRev },
    orders: { pending, processing, fulfilled },
    adSpend: { todayCents: adToday, weekCents: adWeek, monthCents: adMonth },
    profitMonthCents: monthRev - adMonth,
    topProducts,
    pipeline: pipelineRows.map((r) => ({ stage: r.stage, count: r._count })),
  };
}

export interface DailyTip {
  level: "info" | "warn" | "success";
  title: string;
  body: string;
  action?: { label: string; href: string };
}

export async function generateDailyTips(userId: string): Promise<DailyTip[]> {
  const snapshot = await dashboardSnapshot(userId);
  const lowInventory = await prisma.productVariant.findMany({
    where: { product: { store: { userId } }, inventoryQty: { lt: 10 } },
    take: 5,
    include: { product: { select: { id: true, title: true, storeId: true } } },
  });
  const underperformingAds = await prisma.adCampaign.findMany({
    where: { store: { userId }, status: CampaignStatus.ACTIVE },
    include: { metrics: { take: 30, orderBy: { date: "desc" } } },
    take: 5,
  });

  const adContext = underperformingAds.map((c) => {
    const spend = c.metrics.reduce((s, m) => s + m.spendCents, 0);
    const revenue = c.metrics.reduce((s, m) => s + m.revenueCents, 0);
    return { id: c.id, name: c.name, spend, revenue, roas: spend > 0 ? revenue / spend : 0 };
  });

  const prompt = `You are an ecommerce performance coach producing 3-5 punchy, actionable tips for the merchant's dashboard.

Snapshot JSON:
${JSON.stringify({ snapshot, lowInventory: lowInventory.map((v) => ({ productId: v.product.id, productTitle: v.product.title, qty: v.inventoryQty })), ads: adContext }, null, 2)}

Return STRICT JSON: { "tips": Tip[] } where Tip = {
  "level": "info"|"warn"|"success",
  "title": "<≤60 chars>",
  "body":  "<≤200 chars, specific & actionable>",
  "action": { "label": "<button>", "href": "/products|/orders|/campaigns|/suppliers" } | null
}`;
  const out = await runClaudeJSON<{ tips: DailyTip[] }>({
    prompt,
    kind: "DAILY_TIPS",
    maxTokens: 1200,
    temperature: 0.6,
  });
  return out.tips;
}
