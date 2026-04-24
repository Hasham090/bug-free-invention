import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

export async function POST(req: Request) {
  if (!stripe || !webhookSecret) {
    return NextResponse.json({ ok: true, skipped: "Stripe not configured" });
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) return NextResponse.json({ error: "Missing signature" }, { status: 400 });

  const body = await req.text();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error("Webhook signature invalid:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        console.log("Checkout completed:", {
          sub: session.subscription,
          customer: session.customer,
          plan: session.metadata?.plan,
        });
        // Production: upsert Subscription row tied to user, set plan = session.metadata.plan
        break;
      }
      case "customer.subscription.updated":
      case "customer.subscription.created": {
        const sub = event.data.object as Stripe.Subscription;
        console.log("Subscription updated:", sub.id, sub.status);
        // Production: update Subscription.status + currentPeriodEnd
        break;
      }
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        console.log("Subscription canceled:", sub.id);
        // Production: mark Subscription.status = CANCELED, downgrade User.plan = STARTER
        break;
      }
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        console.log("Payment failed:", invoice.id);
        // Production: mark Subscription.status = PAST_DUE, notify user
        break;
      }
      default:
        console.log("Unhandled Stripe event:", event.type);
    }
  } catch (err) {
    console.error("Webhook handler failed:", err);
    return NextResponse.json({ error: "Handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
