import axios from "axios";
import { env } from "../../lib/env.js";
import { upstream } from "../../lib/errors.js";
import type { AdAdapter, AdCampaignCreate } from "./types.js";

const TT = "https://business-api.tiktok.com/open_api/v1.3";

export const tiktokAdapter: AdAdapter = {
  platform: "TIKTOK",

  isConfigured: () => Boolean(env.TIKTOK_APP_ID && env.TIKTOK_APP_SECRET),

  oauthAuthorizeUrl(state, redirectUri) {
    const u = new URL("https://business-api.tiktok.com/portal/auth");
    u.searchParams.set("app_id", env.TIKTOK_APP_ID);
    u.searchParams.set("redirect_uri", redirectUri);
    u.searchParams.set("state", state);
    return u.toString();
  },

  async oauthExchange(code) {
    const r = await axios.post(`${TT}/oauth2/access_token/`, {
      app_id: env.TIKTOK_APP_ID,
      secret: env.TIKTOK_APP_SECRET,
      auth_code: code,
    });
    if (r.data.code !== 0) throw upstream("tiktok token exchange failed", r.data);
    const data = r.data.data;
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: data.access_token_expire_time ? new Date(data.access_token_expire_time * 1000) : undefined,
      externalAccountId: data.advertiser_ids?.[0] ?? "",
    };
  },

  async createCampaign(accessToken, accountId, payload: AdCampaignCreate) {
    try {
      const r = await axios.post(
        `${TT}/campaign/create/`,
        {
          advertiser_id: accountId,
          campaign_name: payload.name,
          objective_type: "CONVERSIONS",
          budget_mode: "BUDGET_MODE_DAY",
          budget: payload.dailyBudgetCents / 100,
          operation_status: "DISABLE",
        },
        { headers: { "Access-Token": accessToken } },
      );
      if (r.data.code !== 0) throw upstream("tiktok createCampaign failed", r.data);
      return { externalCampaignId: r.data.data.campaign_id, raw: r.data };
    } catch (e: unknown) {
      const err = e as { response?: { data?: unknown } };
      throw upstream("tiktok createCampaign failed", err.response?.data);
    }
  },

  async pauseCampaign(accessToken, externalCampaignId) {
    await axios.post(
      `${TT}/campaign/status/update/`,
      { campaign_ids: [externalCampaignId], operation_status: "DISABLE" },
      { headers: { "Access-Token": accessToken } },
    );
  },

  async fetchDailyMetrics(accessToken, externalCampaignId, date) {
    const r = await axios.get(`${TT}/report/integrated/get/`, {
      headers: { "Access-Token": accessToken },
      params: {
        report_type: "BASIC",
        data_level: "AUDITING_LEVEL_CAMPAIGN",
        dimensions: JSON.stringify(["campaign_id"]),
        metrics: JSON.stringify(["spend", "impressions", "clicks", "conversion", "total_complete_payment_rate"]),
        start_date: date,
        end_date: date,
        filtering: JSON.stringify([{ field_name: "campaign_id", filter_type: "IN", filter_value: JSON.stringify([externalCampaignId]) }]),
      },
    });
    const row = r.data.data?.list?.[0]?.metrics;
    if (!row) return { spendCents: 0, impressions: 0, clicks: 0, conversions: 0, revenueCents: 0 };
    return {
      spendCents: Math.round(parseFloat(row.spend ?? "0") * 100),
      impressions: parseInt(row.impressions ?? "0", 10),
      clicks: parseInt(row.clicks ?? "0", 10),
      conversions: parseInt(row.conversion ?? "0", 10),
      revenueCents: 0,
    };
  },
};
