import { NextResponse } from "next/server";
import { stripe, PLANS, type PlanKey } from "@/lib/stripe";

export async function POST(req: Request) {
  const { plan } = (await req.json()) as { plan: PlanKey };

  if (!stripe) {
    return NextResponse.json({ demo: true, message: "Stripe not configured — plan switched locally." });
  }
  const tier = PLANS[plan];
  if (!tier?.priceId) {
    return NextResponse.json({ error: `No Stripe price ID configured for ${plan}` }, { status: 400 });
  }

  const origin = req.headers.get("origin") ?? "http://localhost:3000";
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price: tier.priceId, quantity: 1 }],
    success_url: `${origin}/dashboard/settings?checkout=success`,
    cancel_url: `${origin}/dashboard/settings?checkout=cancel`,
    subscription_data: { metadata: { plan } },
    allow_promotion_codes: true,
  });

  return NextResponse.json({ url: session.url });
}
