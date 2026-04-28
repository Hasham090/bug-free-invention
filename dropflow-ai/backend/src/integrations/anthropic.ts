import Anthropic from "@anthropic-ai/sdk";
import { env } from "../lib/env.js";
import { logger } from "../lib/logger.js";
import { prisma } from "../lib/prisma.js";

const log = logger("anthropic");

let client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY is not set");
  }
  if (!client) client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  return client;
}

interface RunOpts {
  system?: string;
  prompt: string;
  maxTokens?: number;
  temperature?: number;
  storeId?: string | null;
  kind: "STORE_BUILDER" | "PRODUCT_LISTING" | "AD_COPY" | "DAILY_TIPS" | "PRODUCT_RESEARCH";
}

/**
 * Calls Claude with a JSON-output contract and persists each run for cost auditing.
 * Caller passes a JSON-shape instruction in the prompt; we strip code fences.
 */
export async function runClaudeJSON<T>({ system, prompt, maxTokens = 2048, temperature = 0.7, storeId, kind }: RunOpts): Promise<T> {
  const c = getClient();
  const start = Date.now();
  const run = await prisma.aIRun.create({
    data: { kind, model: env.ANTHROPIC_MODEL, input: { system, prompt }, storeId: storeId ?? null },
  });
  try {
    const res = await c.messages.create({
      model: env.ANTHROPIC_MODEL,
      max_tokens: maxTokens,
      temperature,
      system: system ?? "You are an expert ecommerce strategist. Always respond with strict JSON, no prose.",
      messages: [{ role: "user", content: prompt }],
    });
    const text = res.content
      .filter((b) => b.type === "text")
      .map((b) => (b as { type: "text"; text: string }).text)
      .join("\n");
    const cleaned = text.replace(/^```(?:json)?\s*|\s*```$/g, "").trim();
    let parsed: T;
    try {
      parsed = JSON.parse(cleaned);
    } catch (e) {
      throw new Error(`Claude returned non-JSON: ${cleaned.slice(0, 240)}`);
    }
    const tokensIn = res.usage.input_tokens;
    const tokensOut = res.usage.output_tokens;
    // claude-sonnet-4 list price: $3/MTok in, $15/MTok out (illustrative — adjust for billing).
    const costUsd = (tokensIn / 1_000_000) * 3 + (tokensOut / 1_000_000) * 15;
    await prisma.aIRun.update({
      where: { id: run.id },
      data: { output: parsed as object, tokensIn, tokensOut, costUsd },
    });
    log.info(`run ${kind} ok in ${Date.now() - start}ms tokens=${tokensIn}/${tokensOut}`);
    return parsed;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await prisma.aIRun.update({ where: { id: run.id }, data: { error: msg } });
    log.error(`run ${kind} failed`, msg);
    throw err;
  }
}
