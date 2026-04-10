import 'dotenv/config';
import express from 'express';
import Anthropic from '@anthropic-ai/sdk';

const app = express();
app.use(express.json());

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

const SYSTEM_PROMPT = `You are a radical invention engine. Given a real-world problem, you generate a genuinely novel, bold, science-grounded invention that could actually work. Be specific, creative, and visionary — not generic. Think like a mix of Tesla, von Neumann, and Buckminster Fuller.

Respond ONLY with valid JSON, no markdown, no backticks:
{
  "name": "Name of the invention (catchy, 3-6 words)",
  "what": "What it is in 2 sentences. Be specific and vivid.",
  "how": "How it technically works. Reference real science/engineering principles. 3 sentences.",
  "why_novel": "Why this has never been done before. What's the key insight that unlocks it now. 2 sentences.",
  "impact": "Quantified world impact if deployed at scale. Be bold and specific. 2 sentences.",
  "build": "First 3 concrete steps to actually build this. Be actionable."
}`;

// Rate limiting
const requests = new Map();

function rateLimit(ip, maxRequests = 10, windowMs = 60000) {
  const now = Date.now();
  const record = requests.get(ip);
  if (!record || now > record.resetAt) {
    requests.set(ip, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (record.count >= maxRequests) return false;
  record.count++;
  return true;
}

app.post('/api/generate', async (req, res) => {
  const ip = req.ip || 'unknown';

  if (!rateLimit(ip)) {
    return res.status(429).json({ error: 'Too many requests. Please wait a moment.' });
  }

  const { problem } = req.body;
  if (!problem || typeof problem !== 'string' || problem.trim().length === 0) {
    return res.status(400).json({ error: 'Please provide a problem description.' });
  }

  if (problem.length > 2000) {
    return res.status(400).json({ error: 'Problem description too long (max 2000 characters).' });
  }

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      system: SYSTEM_PROMPT,
      messages: [
        { role: 'user', content: `Invent a groundbreaking solution for: ${problem.trim()}` },
      ],
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type');
    }

    const clean = content.text.replace(/```json|```/g, '').trim();
    const idea = JSON.parse(clean);

    res.json({ idea });
  } catch (err) {
    console.error('Generation error:', err.message);

    if (err.message?.includes('JSON')) {
      return res.status(500).json({ error: 'Failed to parse invention. Please try again.' });
    }

    res.status(500).json({ error: 'Invention failed. The future resists easy answers.' });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Breakthrough Engine API running on http://localhost:${PORT}`);
});
