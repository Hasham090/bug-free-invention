import OpenAI from "openai";
import type { ActionType, ProductWithIntel } from "./types";

const apiKey = process.env.OPENAI_API_KEY;
const openai = apiKey ? new OpenAI({ apiKey }) : null;

export const aiEnabled = Boolean(openai);

export interface AIResponse {
  actionType: ActionType;
  explanation: string;
  expectedOutcome: string;
  confidenceScore: number;
  dollarImpact: number;
}

const SYSTEM_PROMPT = `You are StockSense AI, a dead-inventory decision engine for e-commerce sellers.

Your job: given a single product's data, return ONE specific action the seller should take.

Rules:
- Never just describe data. Always recommend a decision.
- Use plain English. Sellers are not data scientists.
- Include specific dollar amounts, dates, or percentages.
- Be direct and confident.

Return ONLY valid JSON with this shape:
{
  "actionType": "DISCOUNT" | "BUNDLE" | "LIQUIDATE" | "REORDER_PAUSE" | "PROMOTE",
  "explanation": "plain English, 1-2 sentences, specific",
  "expectedOutcome": "quantified outcome with $ or units",
  "confidenceScore": 0-100,
  "dollarImpact": number (expected revenue recovered or cost avoided)
}`;

export async function generateRecommendation(p: ProductWithIntel): Promise<AIResponse> {
  if (!openai) return fallback(p);

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      temperature: 0.4,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: JSON.stringify({
            name: p.name,
            sku: p.sku,
            category: p.category,
            unitsInStock: p.unitsInStock,
            daysSinceLastSale: p.daysSinceLastSale,
            sellingPrice: p.sellingPrice,
            costPrice: p.costPrice,
            marginPct: Math.round(p.marginPct),
            velocity30d: p.velocity30d,
            inventoryValue: p.inventoryValue,
          }),
        },
      ],
    });

    const raw = completion.choices[0]?.message.content;
    if (!raw) return fallback(p);

    const parsed = JSON.parse(raw);
    return {
      actionType: parsed.actionType,
      explanation: String(parsed.explanation),
      expectedOutcome: String(parsed.expectedOutcome),
      confidenceScore: Number(parsed.confidenceScore),
      dollarImpact: Number(parsed.dollarImpact ?? 0),
    };
  } catch (err) {
    console.error("OpenAI error, using fallback:", err);
    return fallback(p);
  }
}

function fallback(p: ProductWithIntel): AIResponse {
  if (p.recommendation) {
    return {
      actionType: p.recommendation.actionType,
      explanation: p.recommendation.explanation,
      expectedOutcome: p.recommendation.expectedOutcome,
      confidenceScore: p.recommendation.confidenceScore,
      dollarImpact: p.recommendation.dollarImpact,
    };
  }
  // Rule-based backup if no pre-seeded rec exists
  if (p.daysSinceLastSale >= 60) {
    const recovery = Math.round(p.inventoryValue * 0.35);
    return {
      actionType: "LIQUIDATE",
      explanation: `${p.name} is dead stock tying up $${p.inventoryValue.toFixed(0)} of capital.`,
      expectedOutcome: `Recover ~$${recovery} by liquidating this week.`,
      confidenceScore: 88,
      dollarImpact: recovery,
    };
  }
  return {
    actionType: "DISCOUNT",
    explanation: `${p.name} needs a price nudge to regain velocity.`,
    expectedOutcome: `Projected sell-through: 70% in 14 days at 25% off.`,
    confidenceScore: 75,
    dollarImpact: Math.round(p.unitsInStock * p.sellingPrice * 0.5),
  };
}
