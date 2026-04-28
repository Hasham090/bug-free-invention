import Bull from "bull";
import { logger } from "../logger.js";
import { callInternal } from "../internalApi.js";
import { notify, progress } from "../notify.js";

const log = logger("job:product-import");

interface Data {
  storeId: string;
  supplierKind: "ALIEXPRESS" | "CJ_DROPSHIPPING" | "ZENDROP" | "GENERIC_SCRAPED" | "CSV_IMPORT";
  externalProductId: string;
  userId: string;
}

export function registerProductImport(q: Bull.Queue<Data>) {
  q.process(2, async (job) => {
    const { userId, storeId, supplierKind, externalProductId } = job.data;
    log.info(`importing ${supplierKind}/${externalProductId} → store ${storeId}`);
    progress(userId, String(job.id), "starting", 1);
    const result = await callInternal<{ product: { id: string; title: string } }>("/jobs/product-import", {
      storeId, supplierKind, externalProductId,
    });
    progress(userId, String(job.id), "done", 100);
    await notify(userId, "success", "Product imported", `${result.product.title} is live in your store.`, { productId: result.product.id });
    return result;
  });
}
