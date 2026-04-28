import { CampaignStatus, AdPlatform } from "@prisma/client";
import { runClaudeJSON } from "../integrations/anthropic.js";
import { adAdapterFor } from "../integrations/ads/index.js";
import { logger } from "../lib/logger.js";
import { prisma } from "../lib/prisma.js";
import { badRequest, notFound } from "../lib/errors.js";

const log = logger("ad-manager");

export interface CreativePack {
  headlines: string[];
  descriptions: string[];
  cta: string;
  primaryText: string;
  audiences: string[];
}

export async function generateCreatives(input: {
  productTitle: string;
  productDescription?: string;
  niche: string;
  platform: AdPlatform;
  storeId: string;
}): Promise<CreativePack> {
  const prompt = `Generate ${input.platform} ad creatives for this product.

Product: ${JSON.stringify(input.productTitle)}
Description: ${JSON.stringify(input.productDescription ?? "")}
Niche: ${input.niche}

Return STRICT JSON:
{
  "headlines":     ["3 headlines, ≤30 chars each, distinct angles"],
  "descriptions":  ["3 descriptions, ≤90 chars each"],
  "cta":           "SHOP_NOW|LEARN_MORE|GET_OFFER|SIGN_UP|ORDER_NOW",
  "primaryText":   "<2-3 sentences, scroll-stopping hook + benefit + CTA>",
  "audiences":     ["3-5 interest/audience names suited to ${input.platform}"]
}`;
  return runClaudeJSON<CreativePack>({
    prompt,
    kind: "AD_COPY",
    storeId: input.storeId,
    maxTokens: 1200,
    temperature: 0.85,
  });
}

export async function launchCampaign(input: {
  storeId: string;
  adAccountId: string;
  productIds: string[];
  monthlyBudgetCents: number;
  name?: string;
}) {
  if (input.productIds.length === 0) throw badRequest("at least one product required");

  const account = await prisma.adAccount.findUnique({ where: { id: input.adAccountId } });
  if (!account) throw notFound("ad account not found");
  const store = await prisma.store.findUnique({ where: { id: input.storeId } });
  if (!store) throw notFound("store not found");
  const product = await prisma.product.findFirst({
    where: { id: input.productIds[0], storeId: input.storeId },
  });
  if (!product) throw notFound("product not found in store");

  const adapter = adAdapterFor(account.platform);
  const dailyBudget = Math.floor(input.monthlyBudgetCents / 30);

  const creatives = await generateCreatives({
    productTitle: product.title,
    productDescription: product.description ?? undefined,
    niche: store.niche ?? "general",
    platform: account.platform,
    storeId: store.id,
  });

  const productLandingUrl = `https://${store.domain}/products/${product.handle ?? product.id}`;
  const result = await adapter.createCampaign(account.accessToken, account.externalId, {
    name: input.name ?? `${store.name} – ${product.title} – ${new Date().toISOString().slice(0, 10)}`,
    dailyBudgetCents: dailyBudget,
    productIds: input.productIds,
    productTitle: product.title,
    productImageUrl: product.images[0],
    productLandingUrl,
    targeting: { interests: creatives.audiences },
    creatives: { ...creatives },
  });

  const campaign = await prisma.adCampaign.create({
    data: {
      storeId: input.storeId,
      adAccountId: account.id,
      platform: account.platform,
      externalCampaignId: result.externalCampaignId,
      name: input.name ?? `${product.title}`,
      productIds: input.productIds,
      monthlyBudgetCents: input.monthlyBudgetCents,
      dailyBudgetCents: dailyBudget,
      status: CampaignStatus.ACTIVE,
      targeting: { interests: creatives.audiences } as object,
      creatives: creatives as unknown as object,
    },
  });
  log.info(`campaign ${campaign.id} launched on ${account.platform}`);
  return campaign;
}

/**
 * Pull metrics for active campaigns; pause if monthly spend exceeds budget,
 * or if performance is below threshold (< 1.5x ROAS after $30 spend).
 */
export async function monitorBudgets() {
  const campaigns = await prisma.adCampaign.findMany({
    where: { status: CampaignStatus.ACTIVE },
    include: { adAccount: true, metrics: true },
  });
  const today = new Date().toISOString().slice(0, 10);

  for (const c of campaigns) {
    if (!c.externalCampaignId) continue;
    const adapter = adAdapterFor(c.platform);
    if (!adapter.isConfigured()) continue;

    let metrics: Awaited<ReturnType<typeof adapter.fetchDailyMetrics>>;
    try {
      metrics = await adapter.fetchDailyMetrics(c.adAccount.accessToken, c.externalCampaignId, today);
    } catch (e) {
      log.warn(`metrics fetch failed for ${c.id}: ${(e as Error).message}`);
      continue;
    }

    await prisma.adMetricDaily.upsert({
      where: { campaignId_date: { campaignId: c.id, date: new Date(today) } },
      update: { ...metrics },
      create: { campaignId: c.id, date: new Date(today), ...metrics },
    });

    const all = await prisma.adMetricDaily.findMany({
      where: { campaignId: c.id, date: { gte: monthStart() } },
    });
    const monthSpend = all.reduce((s, m) => s + m.spendCents, 0);
    const monthRevenue = all.reduce((s, m) => s + m.revenueCents, 0);

    let pauseReason: string | null = null;
    if (monthSpend >= c.monthlyBudgetCents) pauseReason = "monthly budget exhausted";
    else if (monthSpend >= 3000 && (monthRevenue / Math.max(monthSpend, 1)) < 1.5) pauseReason = "ROAS below 1.5x after $30 spend";

    if (pauseReason) {
      try {
        await adapter.pauseCampaign(c.adAccount.accessToken, c.externalCampaignId);
        await prisma.adCampaign.update({ where: { id: c.id }, data: { status: CampaignStatus.PAUSED } });
        log.info(`paused campaign ${c.id}: ${pauseReason}`);
      } catch (e) {
        log.error(`pause failed for ${c.id}: ${(e as Error).message}`);
      }
    }
  }
}

function monthStart(): Date {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
