import Bull, { Queue, QueueOptions } from "bull";
import { env } from "./env.js";

const baseOpts: QueueOptions = {
  redis: env.REDIS_URL,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 5_000 },
    removeOnComplete: 1000,
    removeOnFail: 500,
  },
};

export const queues = {
  productImport: new Bull("product-import", baseOpts),
  orderFulfillment: new Bull("order-fulfillment", baseOpts),
  trackingSync: new Bull("tracking-sync", baseOpts),
  adBudgetMonitor: new Bull("ad-budget-monitor", baseOpts),
  storeBuilder: new Bull("store-builder", baseOpts),
  productResearch: new Bull("product-research", baseOpts),
  supplierScrape: new Bull("supplier-scrape", baseOpts),
  dailyTips: new Bull("daily-tips", baseOpts),
} as const;

export type QueueName = keyof typeof queues;

export async function closeQueues() {
  await Promise.all(Object.values(queues).map((q: Queue) => q.close()));
}
