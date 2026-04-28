export interface AdCreative {
  headlines: string[];
  descriptions: string[];
  cta: string;
  primaryText?: string;
}

export interface AdCampaignCreate {
  name: string;
  dailyBudgetCents: number;
  productIds: string[];
  productTitle: string;
  productImageUrl?: string;
  productLandingUrl: string;
  targeting?: { interests?: string[]; ageMin?: number; ageMax?: number; geo?: string[] };
  creatives: AdCreative;
}

export interface AdAdapter {
  platform: "FACEBOOK" | "GOOGLE" | "TIKTOK";
  isConfigured(): boolean;
  createCampaign(accessToken: string, accountId: string, payload: AdCampaignCreate): Promise<{ externalCampaignId: string; raw?: unknown }>;
  pauseCampaign(accessToken: string, externalCampaignId: string): Promise<void>;
  fetchDailyMetrics(accessToken: string, externalCampaignId: string, date: string): Promise<{ spendCents: number; impressions: number; clicks: number; conversions: number; revenueCents: number }>;
  oauthAuthorizeUrl(state: string, redirectUri: string): string;
  oauthExchange(code: string, redirectUri: string): Promise<{ accessToken: string; refreshToken?: string; expiresAt?: Date; externalAccountId: string }>;
}
