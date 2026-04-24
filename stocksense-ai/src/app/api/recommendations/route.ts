import { NextResponse } from "next/server";
import { updateRecommendationStatus, getPendingRecommendations } from "@/lib/data";

export async function GET() {
  return NextResponse.json({ recommendations: getPendingRecommendations() });
}

export async function PATCH(req: Request) {
  const { id, status } = await req.json();
  if (!id || !status) return NextResponse.json({ error: "id and status required" }, { status: 400 });
  if (!["PENDING", "DONE", "DISMISSED"].includes(status)) {
    return NextResponse.json({ error: "invalid status" }, { status: 400 });
  }
  const rec = updateRecommendationStatus(id, status);
  if (!rec) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json(rec);
}
