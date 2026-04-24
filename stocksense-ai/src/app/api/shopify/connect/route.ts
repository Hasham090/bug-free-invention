import { NextResponse } from "next/server";

const SCOPES = ["read_products", "read_orders", "read_inventory"];

export async function GET(req: Request) {
  const url = new URL(req.url);
  const shop = url.searchParams.get("shop");
  const apiKey = process.env.SHOPIFY_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "Shopify not configured. Set SHOPIFY_API_KEY and SHOPIFY_API_SECRET." },
      { status: 400 }
    );
  }
  if (!shop || !shop.endsWith(".myshopify.com")) {
    return NextResponse.json({ error: "Invalid shop domain" }, { status: 400 });
  }

  const redirect = `${url.origin}/api/shopify/callback`;
  const state = crypto.randomUUID();
  const authUrl =
    `https://${shop}/admin/oauth/authorize?` +
    new URLSearchParams({
      client_id: apiKey,
      scope: SCOPES.join(","),
      redirect_uri: redirect,
      state,
    }).toString();

  const res = NextResponse.redirect(authUrl);
  res.cookies.set("shopify_oauth_state", state, { httpOnly: true, secure: true, sameSite: "lax", maxAge: 600 });
  return res;
}
