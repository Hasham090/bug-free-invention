import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const body = await req.json();
  // In production this would: persist preferences, trigger initial inventory sync
  // from the selected platform (Shopify/Amazon/CSV), and schedule the first AI run.
  console.log("Onboarding received:", body);
  return NextResponse.json({ ok: true });
}
