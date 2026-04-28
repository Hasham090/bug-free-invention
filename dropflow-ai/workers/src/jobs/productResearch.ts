import Bull from "bull";
import { logger } from "../logger.js";
import { callInternal } from "../internalApi.js";
import { notify } from "../notify.js";

const log = logger("job:product-research");

interface Data { userId: string; niche: string; targetMarket?: string; budgetCents?: number }

export function registerProductResearch(q: Bull.Queue<Data>) {
  q.process(2, async (job) => {
    log.info(`researching products for ${job.data.niche}`);
    const result = await callInternal<{ products: { externalId: string; title: string }[] }>("/jobs/product-research", job.data);
    await notify(job.data.userId, "info", "Product research ready", `Found ${result.products.length} candidates for "${job.data.niche}".`);
    return result;
  });
}
