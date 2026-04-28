import axios from "axios";
import { env } from "../../lib/env.js";
import { upstream } from "../../lib/errors.js";
import { logger } from "../../lib/logger.js";
import type { AdAdapter, AdCampaignCreate } from "./types.js";

const log = logger("facebook-ads");
const FB_VERSION = "v21.0";
const FB = `https://graph.facebook.com/${FB_VERSION}`;

export const facebookAdapter: AdAdapter = {
  platform: "FACEBOOK",

  isConfigured: () => Boolean(env.FACEBOOK_APP_ID && env.FACEBOOK_APP_SECRET),

  oauthAuthorizeUrl(state, redirectUri) {
    const u = new URL(`https://www.facebook.com/${FB_VERSION}/dialog/oauth`);
    u.searchParams.set("client_id", env.FACEBOOK_APP_ID);
    u.searchParams.set("redirect_uri", redirectUri);
    u.searchParams.set("state", state);
    u.searchParams.set("scope", "ads_management,ads_read,business_management");
    return u.toString();
  },

  async oauthExchange(code, redirectUri) {
    const r = await axios.get(`${FB}/oauth/access_token`, {
      params: {
        client_id: env.FACEBOOK_APP_ID,
        client_secret: env.FACEBOOK_APP_SECRET,
        redirect_uri: redirectUri,
        code,
      },
    });
    const accessToken = r.data.access_token as string;
    // Long-lived exchange.
    const long = await axios.get(`${FB}/oauth/access_token`, {
      params: {
        grant_type: "fb_exchange_token",
        client_id: env.FACEBOOK_APP_ID,
        client_secret: env.FACEBOOK_APP_SECRET,
        fb_exchange_token: accessToken,
      },
    });
    const longLived = long.data.access_token as string;
    const accounts = await axios.get(`${FB}/me/adaccounts`, {
      params: { access_token: longLived, fields: "id,name" },
    });
    const externalAccountId = accounts.data.data?.[0]?.id ?? "";
    return {
      accessToken: longLived,
      expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
      externalAccountId,
    };
  },

  async createCampaign(accessToken, accountId, payload: AdCampaignCreate) {
    try {
      const camp = await axios.post(`${FB}/${accountId}/campaigns`, null, {
        params: {
          access_token: accessToken,
          name: payload.name,
          objective: "OUTCOME_SALES",
          status: "PAUSED",
          special_ad_categories: "[]",
        },
      });
      const campaignId = camp.data.id as string;
      const adset = await axios.post(`${FB}/${accountId}/adsets`, null, {
        params: {
          access_token: accessToken,
          name: `${payload.name} - default adset`,
          campaign_id: campaignId,
          daily_budget: payload.dailyBudgetCents,
          billing_event: "IMPRESSIONS",
          optimization_goal: "OFFSITE_CONVERSIONS",
          bid_strategy: "LOWEST_COST_WITHOUT_CAP",
          targeting: JSON.stringify({
            geo_locations: { countries: payload.targeting?.geo ?? ["US"] },
            age_min: payload.targeting?.ageMin ?? 18,
            age_max: payload.targeting?.ageMax ?? 65,
            interests: payload.targeting?.interests?.map((i) => ({ name: i })) ?? [],
          }),
          status: "PAUSED",
          start_time: new Date().toISOString(),
        },
      });
      const adsetId = adset.data.id as string;
      const creative = await axios.post(`${FB}/${accountId}/adcreatives`, null, {
        params: {
          access_token: accessToken,
          name: `${payload.name} creative`,
          object_story_spec: JSON.stringify({
            link_data: {
              message: payload.creatives.primaryText ?? payload.creatives.descriptions[0] ?? "",
              link: payload.productLandingUrl,
              name: payload.creatives.headlines[0] ?? payload.productTitle,
              description: payload.creatives.descriptions[0] ?? "",
              call_to_action: { type: payload.creatives.cta || "SHOP_NOW" },
              picture: payload.productImageUrl,
            },
          }),
        },
      });
      await axios.post(`${FB}/${accountId}/ads`, null, {
        params: {
          access_token: accessToken,
          name: `${payload.name} ad`,
          adset_id: adsetId,
          creative: JSON.stringify({ creative_id: creative.data.id }),
          status: "PAUSED",
        },
      });
      return { externalCampaignId: campaignId };
    } catch (e: unknown) {
      const err = e as { response?: { data?: unknown } };
      log.error("createCampaign", err.response?.data);
      throw upstream("facebook createCampaign failed", err.response?.data);
    }
  },

  async pauseCampaign(accessToken, externalCampaignId) {
    await axios.post(`${FB}/${externalCampaignId}`, null, {
      params: { access_token: accessToken, status: "PAUSED" },
    });
  },

  async fetchDailyMetrics(accessToken, externalCampaignId, date) {
    const r = await axios.get(`${FB}/${externalCampaignId}/insights`, {
      params: {
        access_token: accessToken,
        time_range: JSON.stringify({ since: date, until: date }),
        fields: "spend,impressions,clicks,actions,action_values",
      },
    });
    const row = r.data.data?.[0];
    if (!row) return { spendCents: 0, impressions: 0, clicks: 0, conversions: 0, revenueCents: 0 };
    const purchases = (row.actions ?? []).find((a: { action_type: string; value: string }) => a.action_type === "purchase");
    const purchaseVal = (row.action_values ?? []).find((a: { action_type: string; value: string }) => a.action_type === "purchase");
    return {
      spendCents: Math.round(parseFloat(row.spend ?? "0") * 100),
      impressions: parseInt(row.impressions ?? "0", 10),
      clicks: parseInt(row.clicks ?? "0", 10),
      conversions: purchases ? parseInt(purchases.value, 10) : 0,
      revenueCents: purchaseVal ? Math.round(parseFloat(purchaseVal.value) * 100) : 0,
    };
  },
};
