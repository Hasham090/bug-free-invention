import Bull from "bull";
import { logger } from "../logger.js";
import { callInternal } from "../internalApi.js";

const log = logger("job:ad-budget-monitor");

export function registerAdBudgetMonitor(q: Bull.Queue) {
  q.process(1, async () => {
    log.info("monitoring ad budgets / pausing underperformers");
    return callInternal("/jobs/ad-budget-monitor");
  });
}
