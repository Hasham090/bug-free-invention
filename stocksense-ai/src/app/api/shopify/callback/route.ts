import { NextResponse } from "next/server";
import crypto from "node:crypto";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const shop = url.searchParams.get("shop");
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const hmac = url.searchParams.get("hmac");

  const apiKey = process.env.SHOPIFY_API_KEY;
  const apiSecret = process.env.SHOPIFY_API_SECRET;
  if (!apiKey || !apiSecret) {
    return NextResponse.json({ error: "Shopify not configured" }, { status: 400 });
  }
  if (!shop || !code || !state) return NextResponse.json({ error: "Invalid callback" }, { status: 400 });

  // Verify HMAC
  if (hmac) {
    const params = Object.fromEntries(url.searchParams.entries());
    delete params.hmac;
    delete params.signature;
    const message = Object.keys(params)
      .sort()
      .map((k) => `${k}=${params[k]}`)
      .join("&");
    const digest = crypto.createHmac("sha256", apiSecret).update(message).digest("hex");
    if (digest !== hmac) {
      return NextResponse.json({ error: "HMAC verification failed" }, { status: 400 });
    }
  }

  // Exchange authorization code for permanent access token
  const tokenRes = await fetch(`https://${shop}/admin/oauth/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ client_id: apiKey, client_secret: apiSecret, code }),
  });
  if (!tokenRes.ok) return NextResponse.json({ error: "Token exchange failed" }, { status: 400 });
  const { access_token } = (await tokenRes.json()) as { access_token: string };

  // Production: persist Store { platform: SHOPIFY, storeDomain: shop, accessToken: access_token }
  console.log("Shopify connected:", shop, access_token.slice(0, 8) + "…");

  return NextResponse.redirect(new URL("/dashboard?connected=shopify", url.origin));
}
