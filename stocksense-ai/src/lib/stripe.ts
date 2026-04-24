import Stripe from "stripe";

const key = process.env.STRIPE_SECRET_KEY;

export const stripe = key
  ? new Stripe(key, { apiVersion: "2025-02-24.acacia" })
  : null;

export const stripeEnabled = Boolean(stripe);

export const PLANS = {
  STARTER: {
    id: "STARTER" as const,
    name: "Starter",
    priceUsd: 49,
    priceId: process.env.STRIPE_PRICE_STARTER ?? "",
    skuLimit: 500,
    stores: 1,
    features: [
      "Up to 500 SKUs",
      "Basic AI actions (5 types)",
      "1 store connection",
      "Email alerts for dead stock",
      "CSV export",
    ],
  },
  GROWTH: {
    id: "GROWTH" as const,
    name: "Growth",
    priceUsd: 149,
    priceId: process.env.STRIPE_PRICE_GROWTH ?? "",
    skuLimit: 5000,
    stores: 2,
    features: [
      "Up to 5,000 SKUs",
      "Full AI action engine",
      "2 store connections",
      "30/60/90 day forecasting",
      "Bundle recommendations",
      "Priority email support",
    ],
    popular: true,
  },
  ENTERPRISE: {
    id: "ENTERPRISE" as const,
    name: "Enterprise",
    priceUsd: 499,
    priceId: process.env.STRIPE_PRICE_ENTERPRISE ?? "",
    skuLimit: Infinity,
    stores: 5,
    features: [
      "Unlimited SKUs",
      "All AI features",
      "5 store connections",
      "PDF reports & white-label",
      "Dedicated success manager",
      "API access",
      "Slack alerts",
    ],
  },
};

export type PlanKey = keyof typeof PLANS;
