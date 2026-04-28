import Bull from "bull";
import { logger } from "../logger.js";
import { callInternal } from "../internalApi.js";
import { prisma } from "../prisma.js";
import { notify } from "../notify.js";

const log = logger("job:order-fulfillment");

interface Data { orderId: string; force?: boolean }

export function registerOrderFulfillment(q: Bull.Queue<Data>) {
  q.process(4, async (job) => {
    const { orderId } = job.data;
    log.info(`fulfilling order ${orderId}`);
    const result = await callInternal<{ ok: true; order: { id: string; storeId: string } }>("/jobs/fulfill-order", { orderId });
    const store = await prisma.store.findUnique({ where: { id: result.order.storeId }, select: { userId: true } });
    if (store) {
      await notify(store.userId, "info", "Order placed with supplier", `Order ${orderId.slice(0, 6)} sent to supplier.`, { orderId });
    }
    return result;
  });
}
