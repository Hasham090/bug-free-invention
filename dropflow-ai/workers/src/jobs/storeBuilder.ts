import Bull from "bull";
import { logger } from "../logger.js";
import { callInternal } from "../internalApi.js";
import { notify, progress } from "../notify.js";

const log = logger("job:store-builder");

interface Data { userId: string; storeId: string; niche: string; targetMarket?: string }

export function registerStoreBuilder(q: Bull.Queue<Data>) {
  q.process(2, async (job) => {
    const { userId, storeId, niche, targetMarket } = job.data;
    log.info(`building store ${storeId} for niche ${niche}`);
    progress(userId, String(job.id), "generating blueprint", 10);
    const { blueprint } = await callInternal<{ blueprint: object }>("/jobs/store-builder", { storeId, niche, targetMarket });
    progress(userId, String(job.id), "applying to shopify", 70);
    await callInternal("/jobs/store-builder/apply", { storeId, blueprint, niche });
    progress(userId, String(job.id), "done", 100);
    await notify(userId, "success", "Storefront generated", "Pages, copy, and brand applied.", { storeId });
    return { ok: true };
  });
}
