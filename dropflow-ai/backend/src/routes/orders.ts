import { Router } from "express";
import { z } from "zod";
import { requireAuth, AuthedRequest } from "../middleware/auth.js";
import { prisma } from "../lib/prisma.js";
import { notFound } from "../lib/errors.js";
import { queues } from "../lib/queues.js";

const r = Router();

r.get("/", requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const storeId = z.string().optional().parse(req.query.storeId);
    const stage = z.string().optional().parse(req.query.stage);
    const where: any = { store: { userId: req.userId } };
    if (storeId) where.storeId = storeId;
    if (stage) where.stage = stage;
    const orders = await prisma.order.findMany({
      where,
      include: { items: true, supplierOrders: { include: { supplier: true } } },
      orderBy: { receivedAt: "desc" },
      take: 200,
    });
    res.json({ orders });
  } catch (e) { next(e); }
});

r.get("/:id", requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const order = await prisma.order.findFirst({
      where: { id: req.params.id, store: { userId: req.userId } },
      include: { items: { include: { product: true } }, supplierOrders: { include: { supplier: true } } },
    });
    if (!order) throw notFound();
    res.json({ order });
  } catch (e) { next(e); }
});

r.post("/:id/refulfill", requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const order = await prisma.order.findFirst({ where: { id: req.params.id, store: { userId: req.userId } } });
    if (!order) throw notFound();
    const job = await queues.orderFulfillment.add({ orderId: order.id, force: true }, {});
    res.json({ jobId: job.id });
  } catch (e) { next(e); }
});

export default r;
