import Bull from "bull";
import { logger } from "../logger.js";
import { callInternal } from "../internalApi.js";

const log = logger("job:daily-tips");

export function registerDailyTips(q: Bull.Queue) {
  q.process(1, async () => {
    log.info("generating daily tips for all users");
    return callInternal("/jobs/daily-tips");
  });
}
