import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

export interface ContractSection {
  title: string;
  original_text: string;
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  plain_english_explanation: string;
  suggested_alternative_language: string;
}

export interface MissingProtection {
  clause_name: string;
  importance: 'recommended' | 'important' | 'critical';
  explanation: string;
  suggested_language: string;
}

export interface AnalysisResult {
  overall_risk_score: number;
  contract_type: string;
  summary: string;
  sections: ContractSection[];
  missing_protections: MissingProtection[];
}

const SYSTEM_PROMPT = `You are an expert contract analyst AI assistant working for ClauseGuard, a tool that helps freelancers and small businesses understand contracts. Your job is to analyze contracts thoroughly and return structured findings.

ANALYSIS FRAMEWORK - You must check for ALL of the following:

1. **Indemnification Clauses**: Who bears liability? Is indemnification mutual or one-sided? Are there carve-outs?
2. **Liability Caps**: Is there a cap on damages? Is it reasonable relative to the contract value? Does it exclude certain damages?
3. **IP Ownership**: Who owns work product? Is there a work-for-hire clause? Are pre-existing IP rights preserved? License grants?
4. **Termination Clauses**: What are the termination triggers? Notice period? What happens to work-in-progress and payments upon termination? Is there termination for convenience?
5. **Non-Compete / Non-Solicit**: Duration, geographic scope, and industry scope. Are they enforceable in the relevant jurisdiction?
6. **Payment Terms**: Payment schedule, late payment penalties, net terms. Are milestone payments defined? What about expenses?
7. **Confidentiality / NDA Scope**: Duration, what's covered, exceptions (publicly known, independently developed). Is it mutual?
8. **Governing Law & Jurisdiction**: Which state/country law governs? Where are disputes heard? Is this favorable to both parties?
9. **Dispute Resolution**: Arbitration vs litigation? Who pays? Mandatory mediation first? Class action waiver?
10. **Auto-Renewal**: Does the contract auto-renew? What's the opt-out window? Is it clearly disclosed?
11. **Force Majeure**: Is there a force majeure clause? What events are covered? Does it include pandemics?
12. **Data Privacy / GDPR**: Data handling obligations, breach notification requirements, data processor agreements.
13. **Scope of Work**: Is the scope clearly defined? Change order process? Scope creep protections?
14. **Warranties & Representations**: What warranties are given? Disclaimer of implied warranties?
15. **Assignment**: Can the contract be assigned? Does it require consent?
16. **Insurance Requirements**: Are there minimum insurance requirements? Are they reasonable?

RISK SCORING GUIDE:
- 1-25: Low risk - Standard, fair terms with minor suggestions
- 26-50: Moderate risk - Some concerning clauses that should be negotiated
- 51-75: High risk - Several problematic clauses that need attention
- 76-100: Critical risk - Dangerous terms that could cause significant harm

SECTION RISK LEVELS:
- low: Standard/fair language, no concerns
- medium: Slightly one-sided or vague, worth noting
- high: Clearly unfavorable, should be negotiated
- critical: Dangerous clause that could cause serious harm

IMPORTANT RULES:
- Write ALL explanations in plain English. No legal jargon.
- Be specific about WHY something is risky
- Always suggest concrete alternative language
- If a section is fine, still include it with risk_level "low" and explain why it's acceptable
- Identify the contract type (e.g., "Freelance Services Agreement", "NDA", "SaaS Terms of Service", etc.)
- The summary should be exactly 3 sentences: what the contract is, the biggest concern, and your overall recommendation
- Return VALID JSON only, no markdown code fences`;

const USER_PROMPT_TEMPLATE = `Analyze the following contract text and return a JSON object with this exact structure:

{
  "overall_risk_score": <number 1-100>,
  "contract_type": "<detected contract type>",
  "summary": "<3-sentence summary>",
  "sections": [
    {
      "title": "<section name>",
      "original_text": "<relevant excerpt from contract>",
      "risk_level": "<low|medium|high|critical>",
      "plain_english_explanation": "<plain English explanation>",
      "suggested_alternative_language": "<improved clause text or 'No changes needed' if low risk>"
    }
  ],
  "missing_protections": [
    {
      "clause_name": "<name of missing clause>",
      "importance": "<recommended|important|critical>",
      "explanation": "<why this matters>",
      "suggested_language": "<suggested clause text>"
    }
  ]
}

CONTRACT TEXT:
`;

function chunkText(text: string, maxChunkSize: number = 12000): string[] {
  const chunks: string[] = [];
  const paragraphs = text.split(/\n\n+/);
  let current = '';

  for (const para of paragraphs) {
    if ((current + '\n\n' + para).length > maxChunkSize && current.length > 0) {
      chunks.push(current.trim());
      current = para;
    } else {
      current = current ? current + '\n\n' + para : para;
    }
  }
  if (current.trim()) {
    chunks.push(current.trim());
  }

  return chunks.length > 0 ? chunks : [text];
}

async function analyzeChunk(text: string, chunkIndex: number, totalChunks: number): Promise<AnalysisResult> {
  const chunkContext = totalChunks > 1
    ? `\n\n[This is part ${chunkIndex + 1} of ${totalChunks} of the contract. Analyze this section thoroughly.]\n\n`
    : '';

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: USER_PROMPT_TEMPLATE + chunkContext + text,
      },
    ],
  });

  const content = response.content[0];
  if (content.type !== 'text') {
    throw new Error('Unexpected response type from Claude');
  }

  try {
    // Try to parse directly
    return JSON.parse(content.text);
  } catch {
    // Try to extract JSON from the response
    const jsonMatch = content.text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    throw new Error('Failed to parse AI response as JSON');
  }
}

function mergeResults(results: AnalysisResult[]): AnalysisResult {
  if (results.length === 1) return results[0];

  const allSections = results.flatMap(r => r.sections);
  const allMissing = results.flatMap(r => r.missing_protections);

  // Deduplicate missing protections by clause_name
  const uniqueMissing = allMissing.reduce((acc, mp) => {
    if (!acc.find(m => m.clause_name === mp.clause_name)) {
      acc.push(mp);
    }
    return acc;
  }, [] as MissingProtection[]);

  // Average risk score weighted by section count
  const avgScore = Math.round(
    results.reduce((sum, r) => sum + r.overall_risk_score, 0) / results.length
  );

  // Use the most common contract type
  const contractType = results[0].contract_type;

  // Combine summaries or use the first one
  const summary = results[0].summary;

  return {
    overall_risk_score: avgScore,
    contract_type: contractType,
    summary,
    sections: allSections,
    missing_protections: uniqueMissing,
  };
}

export async function analyzeContract(contractText: string): Promise<AnalysisResult> {
  const chunks = chunkText(contractText);

  if (chunks.length === 1) {
    return analyzeChunk(chunks[0], 0, 1);
  }

  // Analyze chunks in parallel (max 3 concurrent)
  const results: AnalysisResult[] = [];
  const batchSize = 3;

  for (let i = 0; i < chunks.length; i += batchSize) {
    const batch = chunks.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map((chunk, idx) => analyzeChunk(chunk, i + idx, chunks.length))
    );
    results.push(...batchResults);
  }

  return mergeResults(results);
}
