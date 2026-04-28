import "dotenv/config";
import Bull from "bull";
import { registerProductImport } from "./jobs/productImport.js";
import { registerOrderFulfillment } from "./jobs/orderFulfillment.js";
import { registerTrackingSync } from "./jobs/trackingSync.js";
import { registerAdBudgetMonitor } from "./jobs/adBudgetMonitor.js";
import { registerStoreBuilder } from "./jobs/storeBuilder.js";
import { registerProductResearch } from "./jobs/productResearch.js";
import { registerDailyTips } from "./jobs/dailyTips.js";
import { logger } from "./logger.js";

const log = logger("workers");
const REDIS = process.env.REDIS_URL ?? "redis://localhost:6379";

const queues = {
  productImport: new Bull("product-import", REDIS),
  orderFulfillment: new Bull("order-fulfillment", REDIS),
  trackingSync: new Bull("tracking-sync", REDIS),
  adBudgetMonitor: new Bull("ad-budget-monitor", REDIS),
  storeBuilder: new Bull("store-builder", REDIS),
  productResearch: new Bull("product-research", REDIS),
  dailyTips: new Bull("daily-tips", REDIS),
};

registerProductImport(queues.productImport);
registerOrderFulfillment(queues.orderFulfillment);
registerTrackingSync(queues.trackingSync);
registerAdBudgetMonitor(queues.adBudgetMonitor);
registerStoreBuilder(queues.storeBuilder);
registerProductResearch(queues.productResearch);
registerDailyTips(queues.dailyTips);

// Recurring jobs.
queues.trackingSync.add({}, { repeat: { cron: "*/15 * * * *" }, jobId: "tracking-sync-cron" });
queues.adBudgetMonitor.add({}, { repeat: { cron: "0 * * * *" }, jobId: "ad-budget-cron" });
queues.dailyTips.add({}, { repeat: { cron: "0 9 * * *" }, jobId: "daily-tips-cron" });

log.info(`workers online (redis=${REDIS})`);

process.on("SIGTERM", async () => {
  log.info("SIGTERM — closing queues");
  await Promise.all(Object.values(queues).map((q) => q.close()));
  process.exit(0);
});
