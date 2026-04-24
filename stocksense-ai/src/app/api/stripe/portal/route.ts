import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";

export async function POST(req: Request) {
  if (!stripe) {
    return NextResponse.json({ demo: true, message: "Stripe not configured" });
  }
  const origin = req.headers.get("origin") ?? "http://localhost:3000";
  const customerId = process.env.STRIPE_DEMO_CUSTOMER_ID;
  if (!customerId) {
    return NextResponse.json({ error: "No Stripe customer on file for this user." }, { status: 400 });
  }
  const portal = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${origin}/dashboard/settings`,
  });
  return NextResponse.json({ url: portal.url });
}
