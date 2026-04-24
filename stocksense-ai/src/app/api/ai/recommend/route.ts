import { NextResponse } from "next/server";
import { generateRecommendation } from "@/lib/openai";
import { getProduct } from "@/lib/data";

export async function POST(req: Request) {
  const { productId } = await req.json();
  if (!productId) return NextResponse.json({ error: "productId required" }, { status: 400 });

  const product = getProduct(productId);
  if (!product) return NextResponse.json({ error: "Product not found" }, { status: 404 });

  const rec = await generateRecommendation(product);
  return NextResponse.json(rec);
}
