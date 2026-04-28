import { adapters } from "../integrations/suppliers/index.js";
import type { SupplierAdapter, SupplierProductDTO } from "../integrations/suppliers/index.js";
import { estimateCompetition } from "../integrations/trends.js";
import { logger } from "../lib/logger.js";

const log = logger("product-research");

export interface ScoredProduct extends SupplierProductDTO {
  supplierKind: SupplierAdapter["kind"];
  recommendedPriceCents: number;
  marginPercent: number;
  estimatedMonthlyRevenueCents: number;
  competition: { score: number; trend: "rising" | "flat" | "falling" };
  overallScore: number;
}

/**
 * Aggregate products across configured suppliers and rank by composite score.
 *
 * Score components (0-1, higher is better):
 *  - margin:       (1 - cost/price) clipped
 *  - shipping:     1 if ≤15 days, else falls off
 *  - rating:       (rating-3.5)/1.5, clipped
 *  - competition:  1 - competition.score
 *  - trend bump:   +0.1 if rising, −0.1 if falling
 */
export async function researchProducts(input: {
  niche: string;
  targetMarket?: string;
  budgetCents?: number;
  limit?: number;
}): Promise<ScoredProduct[]> {
  const limit = input.limit ?? 24;
  const results: ScoredProduct[] = [];

  for (const adapter of adapters) {
    if (!adapter.isConfigured()) continue;
    if (adapter.kind === "GENERIC_SCRAPED") continue; // requires explicit URL
    try {
      const items = await adapter.searchProducts({ query: input.niche, limit });
      for (const item of items) {
        const recPrice = recommendPrice(item.costCents, item.category);
        if (input.budgetCents && recPrice > input.budgetCents) continue;
        const margin = (recPrice - item.costCents) / recPrice;
        const competition = await estimateCompetition(`${input.niche} ${item.title}`);
        const score = compositeScore({ margin, item, competition });
        const monthlyVolume = Math.round(50 + (1 - competition.score) * 250);
        results.push({
          ...item,
          supplierKind: adapter.kind,
          recommendedPriceCents: recPrice,
          marginPercent: Math.round(margin * 100),
          estimatedMonthlyRevenueCents: monthlyVolume * recPrice,
          competition,
          overallScore: score,
        });
      }
    } catch (e) {
      log.warn(`adapter ${adapter.kind} search failed: ${(e as Error).message}`);
    }
  }

  results.sort((a, b) => b.overallScore - a.overallScore);
  return results.slice(0, limit);
}

function compositeScore(args: {
  margin: number;
  item: SupplierProductDTO;
  competition: { score: number; trend: "rising" | "flat" | "falling" };
}): number {
  const margin = clamp(args.margin, 0, 1);
  const ship = args.item.shippingDays
    ? args.item.shippingDays <= 15
      ? 1
      : Math.max(0, 1 - (args.item.shippingDays - 15) / 30)
    : 0.5;
  const rating = args.item.rating ? clamp((args.item.rating - 3.5) / 1.5, 0, 1) : 0.5;
  const compInv = 1 - args.competition.score;
  const trendBump = args.competition.trend === "rising" ? 0.1 : args.competition.trend === "falling" ? -0.1 : 0;
  return clamp(margin * 0.4 + ship * 0.2 + rating * 0.2 + compInv * 0.2 + trendBump, 0, 1);
}

function recommendPrice(costCents: number, category?: string): number {
  // 2.5x–4x supplier cost; high-AOV apparel 3x, electronics 2.5x, novelty 4x.
  const lower = (category ?? "").toLowerCase();
  let mult = 3;
  if (lower.includes("electron")) mult = 2.5;
  else if (lower.includes("apparel") || lower.includes("clothing")) mult = 3;
  else if (lower.includes("novelty") || lower.includes("gift")) mult = 4;
  const raw = costCents * mult;
  // round to nearest .99
  return Math.max(99, Math.round(raw / 100) * 100 - 1);
}

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}
