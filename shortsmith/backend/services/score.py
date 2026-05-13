"""
Claude-powered viral moment scoring.
Chunks the transcript into semantic windows and asks Claude to rate each.
"""
import json
import logging
import re
from typing import Callable

import anthropic
from pydantic import BaseModel

from backend.config import get_settings
from backend.services.transcribe import TranscriptResult, Word

logger = logging.getLogger(__name__)

SCORING_PROMPT = """\
You are a YouTube Shorts virality analyst with expert-level knowledge of short-form
video performance data, audience psychology, and the YouTube algorithm.

Your task: evaluate timestamped transcript segments from a longer video and identify
the best candidates for standalone viral YouTube Shorts (15–60 seconds).

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SCORING DIMENSIONS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Rate each candidate on these 7 dimensions (1–10 each):

1. hook_strength
   The first 3 seconds determine algorithmic fate. 30%+ drop-off at 3s = algorithm
   suppresses distribution. Score HIGH for:
   - Pattern interrupt: unexpected statement, mid-action entry, violated expectation
   - Curiosity gap: open loop that's uncomfortable to leave unresolved
   - Direct viewer address: "you", "are you", "have you ever"
   - Negative hook: "Stop doing X" / "You're doing this wrong"
   - Counter-intuitive claim that demands resolution
   Score LOW for: starting with "So", "Um", "Like", "Basically", "In this video",
   greetings, transitions ("As I was saying"), or context-setting that delays the point.

2. payoff
   Does the clip FULLY DELIVER on what the hook implied? Does it end with genuine
   resolution — a completed thought, a revealed answer, a landing? Score HIGH for clips
   that give the viewer the exact thing the opening promised. Score LOW for clips that
   trail off, require the full video for resolution, or end mid-sentence.

3. self_containment
   Can this clip stand completely alone with zero prior context? Score LOW if:
   - Pronouns without antecedents: "he said," "that's why," "after what happened"
   - Requires knowing who/what was discussed earlier
   - References "earlier in the video," "as I mentioned," "going back to"
   - Punchline or insight depends on setup that isn't in this segment
   Score HIGH if a viewer who has never seen the source video would fully understand
   and benefit from this clip.

4. emotional_peak
   Does it trigger a strong, shareable emotion? Ranked by virality yield:
   - Awe/surprise: highest share trigger (score 9-10)
   - Humor/amusement: 30% more shares than serious content (score 7-9)
   - Fear/urgency: strong retention, lower shares (score 6-8)
   - Relatability: consistent but low peak ceiling (score 5-7)
   - Neutral information delivery: low viral potential (score 1-4)

5. quotability
   Is there a single sentence someone would screenshot, tweet, or repeat to a friend?
   Score HIGH for: short (<15 words), memorable, expresses something the viewer
   couldn't have said as well themselves, or reframes something they already knew.
   Score LOW for: facts that can't be excerpted, procedural content, hedged statements.

6. retention_shape
   Does interest BUILD across the clip, or does it decay? Ideal shape:
   - Hook in first 3s → rising stakes or intrigue → peak insight/payoff at the end
   Score HIGH for: escalating reveals, building tension with resolution.
   Score LOW for: front-loaded content that trails off, filler in the middle,
   restatements of the same idea, long ramp-up before the actual point.

7. novelty
   Is this information, perspective, or delivery that surprises an average viewer?
   Score HIGH for: counterintuitive claims, violated expectations, insider information,
   format-breaking delivery, data that contradicts common belief.
   Score LOW for: restating conventional wisdom, generic advice, well-known facts.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ANTI-PATTERNS — DISQUALIFIERS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Apply heavy penalties (overall score ≤ 35) if ANY of these are present:

✗ Opens with a transition word or filler: "So,", "Um,", "Like,", "Basically,", "And,"
✗ First sentence is a greeting, intro, or housekeeping ("Welcome back", "Don't forget to subscribe")
✗ Requires the viewer to have watched the surrounding video to understand the point
✗ The clip is entirely setup with no payoff within the segment
✗ Speaker is still doing context-setting at 10+ seconds with no hook established
✗ Clip is primarily recapping something that already happened vs. delivering a live moment
✗ The only payoff is a vague summary: "And that's basically it", "Which is really interesting"
✗ Segment length exceeds 60 seconds AND content density doesn't justify it

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FEW-SHOT EXAMPLES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

EXAMPLE 1 — HIGH SCORE (overall: 87)

Transcript segment:
[142.3 --> 174.8]
"Nobody tells you this, but the number one reason startups fail isn't running out of
money — it's running out of courage. Money is just a symptom. I've watched founders
quit when they had eighteen months of runway left because they stopped believing.
That's the real clock. Not your bank account."

Result:
{
  "start": 142.3, "end": 174.8, "score": 87,
  "title": "The Real Reason Startups Die (It's Not Money)",
  "hook_line": "Nobody tells you this, but the number one reason startups fail isn't running out of money",
  "why_it_works": "Opens with 'nobody tells you this' — an instant credibility and curiosity gap combo. Delivers a counterintuitive reframe immediately (courage vs money), then crystallizes into a quotable line. Fully self-contained, no context needed. Perfect retention shape: hook → evidence → memorable conclusion.",
  "suggested_hashtags": ["startups", "entrepreneurship", "founders", "businessadvice", "motivation", "venturecapital", "startup"],
  "scores": {"hook_strength": 9, "payoff": 9, "self_containment": 10, "emotional_peak": 8, "quotability": 9, "retention_shape": 8, "novelty": 8},
  "warning": null
}

EXAMPLE 2 — LOW SCORE (overall: 22)

Transcript segment:
[87.1 --> 112.4]
"So as I was saying earlier about the marketing strategy we discussed, um, the key
thing to understand is — and I mentioned this before — John had already done the
analysis and what he found was, and I'll get to the numbers in a second, basically
the conversion rates were higher. Which is what we expected. So that's pretty
interesting if you think about it."

Result:
{
  "start": 87.1, "end": 112.4, "score": 22,
  "title": "Conversion Rates Analysis",
  "hook_line": "So as I was saying earlier about the marketing strategy",
  "why_it_works": "WEAK: Opens with 'So' and immediately references prior context. No hook, no payoff, vague conclusion. Pronoun 'John' has no antecedent for a new viewer.",
  "suggested_hashtags": ["marketing", "business"],
  "scores": {"hook_strength": 1, "payoff": 2, "self_containment": 1, "emotional_peak": 1, "quotability": 1, "retention_shape": 2, "novelty": 1},
  "warning": "Multiple disqualifiers: opens with 'So', references prior context, vague payoff"
}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
OUTPUT FORMAT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Return a JSON array. Each element:

{
  "start": <float, seconds>,
  "end": <float, seconds>,
  "score": <int, 1-100, weighted: hook_strength×2 + payoff×2 + self_containment + emotional_peak + quotability + retention_shape + novelty, then normalized to 100>,
  "title": <string, under 60 chars, written as a hook/tease not a summary>,
  "hook_line": <exact quote from transcript — the strongest opening line in the segment>,
  "why_it_works": <2-3 sentences for the creator: what makes this work and what to watch for>,
  "suggested_hashtags": [<5-8 strings, no # prefix>],
  "scores": {
    "hook_strength": <1-10>,
    "payoff": <1-10>,
    "self_containment": <1-10>,
    "emotional_peak": <1-10>,
    "quotability": <1-10>,
    "retention_shape": <1-10>,
    "novelty": <1-10>
  },
  "warning": <string or null>
}

Rules:
- Return 5–15 candidates ordered by score descending
- Only include clips with overall score ≥ 55
- Do NOT pad with weak clips to reach the minimum — fewer high-quality clips beats more weak ones
- Prefer 20-45 second segments over 45-60 second ones when both cover the same content
- Do not overlap segments
- Return a JSON object with a single key "clips" containing the array: {"clips": [...]}
- No preamble, no markdown fences, no text outside the JSON object

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TRANSCRIPT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Source video: {video_title}
Duration: {duration_minutes:.1f} minutes

Transcript (format: [START --> END] text):

{transcript_text}
"""


class DimensionScores(BaseModel):
    hook_strength: int
    payoff: int
    self_containment: int
    emotional_peak: int
    quotability: int
    retention_shape: int
    novelty: int


class ClipCandidate(BaseModel):
    start: float
    end: float
    score: int
    title: str
    hook_line: str
    why_it_works: str
    suggested_hashtags: list[str]
    scores: DimensionScores
    warning: str | None = None


class ClipCandidates(BaseModel):
    clips: list[ClipCandidate]


def _build_transcript_text(words: list[Word], max_words: int = 3000) -> str:
    """Format words as timestamped lines, chunked into sentence groups."""
    lines = []
    current_line_words: list[Word] = []
    sentence_enders = {".", "!", "?", "...", "—"}

    for word in words[:max_words]:
        current_line_words.append(word)
        stripped = word.word.strip()
        if any(stripped.endswith(e) for e in sentence_enders) or len(current_line_words) >= 15:
            if current_line_words:
                start = current_line_words[0].start
                end = current_line_words[-1].end
                text = " ".join(w.word for w in current_line_words).strip()
                lines.append(f"[{start:.1f} --> {end:.1f}] {text}")
                current_line_words = []

    if current_line_words:
        start = current_line_words[0].start
        end = current_line_words[-1].end
        text = " ".join(w.word for w in current_line_words).strip()
        lines.append(f"[{start:.1f} --> {end:.1f}] {text}")

    return "\n".join(lines)


def _parse_json_response(text: str) -> list[dict]:
    """Extract clip list from Claude response, handling both array and wrapped object."""
    text = text.strip()
    if text.startswith("```"):
        text = re.sub(r"^```[a-z]*\n?", "", text)
        text = re.sub(r"\n?```$", "", text)
        text = text.strip()
    parsed = json.loads(text)
    if isinstance(parsed, dict) and "clips" in parsed:
        return parsed["clips"]
    if isinstance(parsed, list):
        return parsed
    return []


async def score_transcript(
    transcript: TranscriptResult,
    video_title: str,
    on_progress: Callable[[float, str], None] | None = None,
) -> list[ClipCandidate]:
    settings = get_settings()
    client = anthropic.Anthropic(api_key=settings.anthropic_api_key)

    # Split long transcripts into overlapping chunks of ~3000 words
    # to stay within Claude's output budget
    chunk_size = 3000
    overlap = 200
    words = transcript.words
    all_candidates: list[ClipCandidate] = []

    chunks = []
    i = 0
    while i < len(words):
        chunk = words[i:i + chunk_size]
        chunks.append(chunk)
        i += chunk_size - overlap

    if on_progress:
        on_progress(0.05, f"Scoring {len(chunks)} transcript chunk(s) with Claude...")

    for chunk_idx, chunk_words in enumerate(chunks):
        transcript_text = _build_transcript_text(chunk_words)
        duration_minutes = transcript.duration / 60.0

        prompt = SCORING_PROMPT.format(
            video_title=video_title,
            duration_minutes=duration_minutes,
            transcript_text=transcript_text,
        )

        if on_progress:
            pct = 0.05 + (chunk_idx / len(chunks)) * 0.90
            on_progress(pct, f"Claude scoring chunk {chunk_idx + 1}/{len(chunks)}...")

        try:
            parsed = client.messages.parse(
                model=settings.claude_model,
                max_tokens=4096,
                messages=[{"role": "user", "content": prompt}],
                output_format=ClipCandidates,
            )
            result_obj = parsed.parsed_output
            if result_obj and result_obj.clips:
                all_candidates.extend(result_obj.clips)
            else:
                # Fallback: raw text parse if structured output returned nothing
                raw = parsed.content[0].text if parsed.content else ""
                if raw:
                    for item in _parse_json_response(raw):
                        try:
                            all_candidates.append(ClipCandidate.model_validate(item))
                        except Exception as exc:
                            logger.warning(f"Skipping invalid candidate: {exc}")

        except anthropic.RateLimitError:
            import asyncio
            logger.warning("Rate limit hit, waiting 30s...")
            await asyncio.sleep(30)
            # Retry once
            parsed = client.messages.parse(
                model=settings.claude_model,
                max_tokens=4096,
                messages=[{"role": "user", "content": prompt}],
                output_format=ClipCandidates,
            )
            result_obj = parsed.parsed_output
            if result_obj and result_obj.clips:
                all_candidates.extend(result_obj.clips)

    # Deduplicate overlapping candidates (same start within 2s)
    seen_starts: set[int] = set()
    unique: list[ClipCandidate] = []
    for c in sorted(all_candidates, key=lambda x: -x.score):
        key = int(c.start)
        if key not in seen_starts:
            seen_starts.add(key)
            unique.append(c)

    result = sorted(unique, key=lambda x: -x.score)[:15]

    if on_progress:
        on_progress(1.0, f"Identified {len(result)} viral candidates")

    return result
