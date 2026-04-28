import { runClaudeJSON } from "../integrations/anthropic.js";
import { ShopifyAdmin } from "../integrations/shopify.js";
import { logger } from "../lib/logger.js";
import { prisma } from "../lib/prisma.js";

const log = logger("store-builder");

export interface StoreBlueprint {
  storeNames: string[];
  brandPalette: { primary: string; secondary: string; accent: string; bg: string; text: string };
  typography: { headingFont: string; bodyFont: string };
  themeRecommendation: { name: string; reason: string };
  homepage: { heroHeadline: string; heroSubheadline: string; trustBadges: string[]; featuredCollections: string[] };
  pages: {
    aboutUs: { title: string; bodyHtml: string };
    returnPolicy: { title: string; bodyHtml: string };
    faq: { title: string; bodyHtml: string };
  };
  navigation: { main: string[]; footer: string[] };
}

export async function generateStoreBlueprint(input: { niche: string; targetMarket?: string; storeId?: string | null }): Promise<StoreBlueprint> {
  const prompt = `Design a complete dropshipping storefront for the niche "${input.niche}"${input.targetMarket ? ` targeting ${input.targetMarket}` : ""}.

Return STRICT JSON matching exactly this TypeScript type:
{
  "storeNames": string[5],
  "brandPalette": { "primary": "#hex", "secondary": "#hex", "accent": "#hex", "bg": "#hex", "text": "#hex" },
  "typography": { "headingFont": "<Google Font name>", "bodyFont": "<Google Font name>" },
  "themeRecommendation": { "name": "Dawn|Sense|Refresh|Crave|Studio", "reason": "<1 sentence>" },
  "homepage": { "heroHeadline": "<8 words max>", "heroSubheadline": "<20 words>", "trustBadges": ["badge1","badge2","badge3"], "featuredCollections": ["col1","col2","col3"] },
  "pages": {
    "aboutUs":      { "title": "About Us",     "bodyHtml": "<p>...</p>" },
    "returnPolicy": { "title": "Return Policy","bodyHtml": "<p>...</p>" },
    "faq":          { "title": "FAQ",          "bodyHtml": "<p>...</p>" }
  },
  "navigation": { "main": ["Home","Shop","About","Contact"], "footer": ["Privacy","Terms","Returns","Contact"] }
}

Constraints:
- Palette must be cohesive and modern (not the default Shopify green).
- Brand voice: confident, benefit-led, no clichés.
- HTML for pages must be production-ready (semantic, no inline styles).`;

  return runClaudeJSON<StoreBlueprint>({
    prompt,
    kind: "STORE_BUILDER",
    storeId: input.storeId ?? null,
    maxTokens: 3000,
    temperature: 0.8,
  });
}

export async function applyBlueprintToShopify(storeId: string, blueprint: StoreBlueprint) {
  const store = await prisma.store.findUniqueOrThrow({ where: { id: storeId } });
  const admin = new ShopifyAdmin(store.domain, store.accessToken);

  // Create the standard pages.
  const pages = [blueprint.pages.aboutUs, blueprint.pages.returnPolicy, blueprint.pages.faq];
  for (const p of pages) {
    try {
      await admin.createPage({ title: p.title, body_html: p.bodyHtml });
      log.info(`created page ${p.title} on ${store.domain}`);
    } catch (e) {
      log.warn(`page create failed: ${(e as Error).message}`);
    }
  }

  await prisma.store.update({
    where: { id: storeId },
    data: {
      brandPalette: blueprint.brandPalette,
      typography: blueprint.typography,
    },
  });

  return { ok: true };
}
