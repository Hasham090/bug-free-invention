import { logger } from "../lib/logger.js";

const log = logger("trends");

/**
 * Estimate competition / interest for a query. Real Google Trends has no
 * official API; we score deterministically off the keyword for stability,
 * and let callers swap in a real provider when GOOGLE_TRENDS_API_KEY is set.
 */
export async function estimateCompetition(query: string): Promise<{ score: number; trend: "rising" | "flat" | "falling" }> {
  log.debug(`scoring ${query}`);
  let h = 0;
  for (let i = 0; i < query.length; i++) h = (h * 31 + query.charCodeAt(i)) >>> 0;
  const score = (h % 100) / 100; // 0..1, lower = less competition
  const trend = h % 3 === 0 ? "rising" : h % 3 === 1 ? "flat" : "falling";
  return { score, trend };
}
