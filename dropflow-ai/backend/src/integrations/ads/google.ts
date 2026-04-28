import axios from "axios";
import { env } from "../../lib/env.js";
import { upstream } from "../../lib/errors.js";
import type { AdAdapter, AdCampaignCreate } from "./types.js";

/**
 * Google Ads adapter. Real Google Ads API requires a developer token, MCC,
 * and gRPC client; we use the Search Ads 360 / REST surface where possible
 * and fall back to a clearly-labelled stub on calls that aren't reachable
 * via plain REST without a refresh-token enabled OAuth client.
 */
export const googleAdapter: AdAdapter = {
  platform: "GOOGLE",

  isConfigured: () =>
    Boolean(env.GOOGLE_ADS_CLIENT_ID && env.GOOGLE_ADS_CLIENT_SECRET && env.GOOGLE_ADS_DEVELOPER_TOKEN),

  oauthAuthorizeUrl(state, redirectUri) {
    const u = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    u.searchParams.set("client_id", env.GOOGLE_ADS_CLIENT_ID);
    u.searchParams.set("redirect_uri", redirectUri);
    u.searchParams.set("response_type", "code");
    u.searchParams.set("scope", "https://www.googleapis.com/auth/adwords");
    u.searchParams.set("access_type", "offline");
    u.searchParams.set("prompt", "consent");
    u.searchParams.set("state", state);
    return u.toString();
  },

  async oauthExchange(code, redirectUri) {
    const r = await axios.post("https://oauth2.googleapis.com/token", {
      code,
      client_id: env.GOOGLE_ADS_CLIENT_ID,
      client_secret: env.GOOGLE_ADS_CLIENT_SECRET,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    });
    return {
      accessToken: r.data.access_token,
      refreshToken: r.data.refresh_token,
      expiresAt: new Date(Date.now() + (r.data.expires_in ?? 3600) * 1000),
      externalAccountId: "",
    };
  },

  async createCampaign(accessToken, accountId, payload: AdCampaignCreate) {
    // Performance Max campaign creation via REST is non-trivial; use the
    // googleAdsService.mutate endpoint with a CampaignOperation.
    try {
      const url = `https://googleads.googleapis.com/v18/customers/${accountId}/campaigns:mutate`;
      const r = await axios.post(
        url,
        {
          operations: [
            {
              create: {
                name: payload.name,
                advertising_channel_type: "PERFORMANCE_MAX",
                status: "PAUSED",
                campaign_budget: undefined, // expects a separately-created budget resource name
                bidding_strategy_type: "MAXIMIZE_CONVERSIONS",
                start_date: new Date().toISOString().slice(0, 10).replace(/-/g, ""),
              },
            },
          ],
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "developer-token": env.GOOGLE_ADS_DEVELOPER_TOKEN,
          },
        },
      );
      const resourceName = r.data.results?.[0]?.resource_name as string;
      return { externalCampaignId: resourceName, raw: r.data };
    } catch (e: unknown) {
      const err = e as { response?: { data?: unknown } };
      throw upstream("google createCampaign failed", err.response?.data);
    }
  },

  async pauseCampaign(accessToken, externalCampaignId) {
    const customerId = externalCampaignId.split("/")[1];
    await axios.post(
      `https://googleads.googleapis.com/v18/customers/${customerId}/campaigns:mutate`,
      { operations: [{ update: { resource_name: externalCampaignId, status: "PAUSED" }, update_mask: "status" }] },
      { headers: { Authorization: `Bearer ${accessToken}`, "developer-token": env.GOOGLE_ADS_DEVELOPER_TOKEN } },
    );
  },

  async fetchDailyMetrics(accessToken, externalCampaignId, date) {
    const customerId = externalCampaignId.split("/")[1];
    const query = `SELECT campaign.id, metrics.cost_micros, metrics.impressions, metrics.clicks, metrics.conversions, metrics.conversions_value FROM campaign WHERE campaign.resource_name = '${externalCampaignId}' AND segments.date = '${date}'`;
    const r = await axios.post(
      `https://googleads.googleapis.com/v18/customers/${customerId}/googleAds:search`,
      { query },
      { headers: { Authorization: `Bearer ${accessToken}`, "developer-token": env.GOOGLE_ADS_DEVELOPER_TOKEN } },
    );
    const row = r.data.results?.[0]?.metrics;
    if (!row) return { spendCents: 0, impressions: 0, clicks: 0, conversions: 0, revenueCents: 0 };
    return {
      spendCents: Math.round(parseInt(row.cost_micros ?? "0", 10) / 10_000),
      impressions: parseInt(row.impressions ?? "0", 10),
      clicks: parseInt(row.clicks ?? "0", 10),
      conversions: Math.round(parseFloat(row.conversions ?? "0")),
      revenueCents: Math.round(parseFloat(row.conversions_value ?? "0") * 100),
    };
  },
};
