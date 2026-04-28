import Bull from "bull";
import { logger } from "../logger.js";
import { callInternal } from "../internalApi.js";

const log = logger("job:tracking-sync");

export function registerTrackingSync(q: Bull.Queue) {
  q.process(1, async () => {
    log.info("syncing tracking from suppliers → shopify");
    return callInternal("/jobs/tracking-sync");
  });
}
