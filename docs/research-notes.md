# ShortSmith — Research Notes

_Compiled from parallel web-search agents, May 2026._

---

## 1. Key Dependency Versions

| Library | Version | Notes |
|---------|---------|-------|
| faster-whisper | 1.2.1 | Released Oct 31, 2025 |
| yt-dlp | 2026.3.17 | Check PyPI for latest |
| anthropic SDK | 0.101.0 | Released May 11, 2026 |
| mediapipe | 0.10.35 | Use new Tasks API, not legacy `solutions` |
| ultralytics (YOLO11) | latest | Installs cleanly, no gotchas |
| python-ffmpeg | latest | **Use this, not `ffmpeg-python`** (abandoned) |
| filterpy | latest | Kalman filter implementation |

---

## 2. Transcription: faster-whisper

### Model Choice
- **Use `large-v3-turbo`** not `large-v3`. It has 4 decoder layers vs 32, runs ~6x faster, with only minor accuracy regression on clean English. Offer `large-v3` as an opt-in in config for non-English / low-resource languages.
- No v4 exists as of May 2026.

### Word-Level Timestamps API
```python
from faster_whisper import WhisperModel
model = WhisperModel("large-v3-turbo", device="cuda", compute_type="float16")
segments, info = model.transcribe("audio.wav", word_timestamps=True)
for segment in segments:
    for word in segment.words:
        print(f"[{word.start:.2f}s -> {word.end:.2f}s] {word.word}")
```

### Known Gotchas
- Word timestamps are token-level interpolation, not forced alignment — can be ±100-300ms off on fast speech. For production-grade sync: wrap with **whisperX** (wav2vec2 forced alignment). Include as opt-in feature.
- Set `condition_on_previous_text=False` to reduce hallucinations on silent/music segments.
- VAD filter (built-in) helps on long audio with silences.
- GPU flags: `device="cuda", compute_type="float16"` for fp16; `"int8"` for CPU.

---

## 3. YouTube URL Ingestion: yt-dlp

### Best Download Options (MP4 ≤1080p)
```python
ydl_opts = {
    'format': 'bestvideo[height<=1080][ext=mp4]+bestaudio[ext=m4a]/best[height<=1080][ext=mp4]/best[height<=1080]',
    'merge_output_format': 'mp4',
    'format_sort': ['vcodec:h264', 'acodec:aac'],
    'progress_hooks': [progress_hook],
}
```

### Progress Hook
```python
def progress_hook(d):
    if d['status'] == 'downloading':
        pct = d.get('_percent_str', 'N/A')
        # push to SSE stream via asyncio queue
```
- `d` dict has: `downloaded_bytes`, `total_bytes`, `eta`, `_percent_str`, `_speed_str`
- **Do not combine** `progress_hooks` with `writesubtitles=True` — breaks in Python embedding.

---

## 4. Anthropic SDK

### Model & Structured Output
- Model ID: **`claude-opus-4-7`** (confirmed; no date suffix in Claude 4.x naming)
- Context: 200K input / 128K output tokens
- Use `client.messages.parse()` with `output_format=` and a Pydantic model — verified against SDK examples at `anthropics/anthropic-sdk-python/examples/structured_outputs.py`:
```python
import anthropic
from pydantic import BaseModel

client = anthropic.Anthropic()
parsed = client.messages.parse(
    model="claude-opus-4-7",
    max_tokens=4096,
    messages=[{"role": "user", "content": prompt}],
    output_format=ClipCandidates,  # Pydantic BaseModel subclass
)
result = parsed.parsed_output  # typed as ClipCandidates
```
- No beta header required — `parse()` is a first-class SDK method.
- Budget transcript chunks at ~3000 words max per API call to stay within output token limits.
- Rate limits (Tier 1): ~348K input tokens/min, ~80K output tokens/min. Adequate for single-user use.

---

## 5. FFmpeg Wrapper

**Critical: `ffmpeg-python` (kkroening) is effectively abandoned.** Last release was 2020. Has known incompatibility with FFmpeg 7.x (issue #875).

**Use `python-ffmpeg` instead** (`pip install python-ffmpeg`):
```python
import ffmpeg

@ffmpeg.on('stderr')
def on_stderr(line):
    # parse progress from FFmpeg stderr
    pass
```
Has native async/event-based stderr handling — ideal for streaming progress.

For subprocess control where needed, use direct `subprocess.Popen` with FFmpeg args built as lists.

---

## 6. Face Detection & Active Speaker Tracking

### Architecture Decision: YOLO11n-face + MediaPipe FaceMesh + Kalman

**Why not MediaPipe face detector?**
- MediaPipe face detector (BlazeFace) is fast (~200fps) but accuracy lags on multi-face, varied-distance, and occlusion scenarios.
- For panels/podcasts with multiple speakers, YOLO11-face is more reliable.

**Detection: YOLO11n-face** (`pip install ultralytics`)
- WIDERFACE Easy/Med/Hard AP: 0.942 / 0.921 / 0.810
- Outperforms YOLOv12 and MTCNN on benchmarks
- Weights available via HuggingFace (`AdamCodd/YOLOv11n-face-detection`) or akanametov/yolo-face repo

**Lip Movement (active speaker selection): MediaPipe FaceMesh** (Tasks API)
- 478 landmarks including precise lip points (indices 61, 291, 13, 14 for outer lip corners + top/bottom)
- Compute vertical mouth aperture per frame; moving-average above threshold → active speaker
- Only run FaceMesh on the detected faces, not the full frame (saves compute)

**Smoothing: Kalman Filter** (`pip install filterpy`)
- Filter on (cx, cy, crop_width) independently
- Process noise Q ≈ 0.01, measurement noise R ≈ 5-10px
- Cap max velocity at 5% of frame width per frame
- EMA causes visible rubber-banding on fast head turns; Kalman handles missed detections gracefully

### Linux Gotchas
- MediaPipe requires `libGL`: install `libgl1` or `libgl1-mesa-glx`
- Use **Python 3.9-3.12** — MediaPipe does not support Python 3.13
- Use the new Tasks API (`mediapipe.tasks.python.vision`), not the deprecated `mediapipe.solutions`

---

## 7. YouTube Shorts Virality — Evidence-Based Scoring Criteria

### Scoring Dimensions (ordered by weight)

1. **Hook Strength** (highest weight) — First 3 seconds determine algorithmic fate. 30%+ drop at 3s = algorithm suppresses. Patterns: pattern interrupt, curiosity gap, direct viewer address, negative hook ("Stop doing X" outperforms positive).

2. **Completion Likelihood by Length**
   - 15-30s targets 80-90%+ completion — highest algorithmic yield
   - 30-60s viable only at very high content density
   - A 20s Short at 90% completion outperforms a 60s Short at 70% completion
   - Penalize segments > 45s unless every second is load-bearing

3. **Emotional Peak** — Rank: Awe/surprise > Humor > Fear/urgency > Relatability. Anger/outrage has high engagement but platform moderation risk.

4. **Self-Containment** — Most common failure mode when auto-clipping. Fail if: pronouns without antecedents, reference to prior context, punchline requires setup not in segment.

5. **Information Density** — Penalize filler phrases, ramp-up time, restatements.

6. **Novelty** — Counterintuitive claims and violated expectations score high. (Source: "Understanding Virality" paper researched by subagent — verify arXiv ID independently before citing.)

7. **Re-watch Trigger** — Hidden detail, fast insight, visual gag. Drives loop behavior which YouTube weighs positively.

---

## 8. ASS Subtitle Styling for 1080×1920

### Typography
- **Font:** Arial Black or Montserrat Black, bold
- **Size:** 90-100px at PlayResY: 1920 (ASS units)
- **Line width:** 1-3 words maximum per line for word-by-word reveal

### Colors
- **Base word:** White (`&H00FFFFFF`)
- **Active/highlighted word:** **Yellow** (`&H0000FFFF` in ASS / `#FFFF00`) — clear winner across OpusClip, Captions.ai, top creators
- **Outline:** 3-4px solid black (`&H00000000`)
- **Shadow:** 1.5px semi-transparent black (`&H80000000`)

### Safe Zone
- YouTube Shorts UI occupies bottom ~350-450px
- Keep captions **above Y=1470** (at PlayResY 1920)
- **Recommended position:** center-screen, Y ≈ 900-1200 (alignment=5, center)
- Right margin: 120px (like/share buttons), Left margin: 60px

### ASS Implementation Strategy
- Use **one `Dialogue` event per word** with precise in/out timestamps (not `\k` karaoke tags)
- Per-word events allow per-word color override `\1c&H...` for the active word
- Set `ScaledBorderAndShadow: yes` in Script Info — otherwise borders render incorrectly

### FFmpeg/libass Gotchas
- `\kf` sweep effects can stutter at low framerates — render at 30fps minimum
- For custom fonts: `ffmpeg -vf "ass=captions.ass:fontsdir=/path/to/fonts"`
- Mismatched video timebases cause subtitle timing drift — always verify with test render
- Always set `ScaledBorderAndShadow: yes` explicitly in the ASS Script Info header

### Reference ASS Style Line
```
Style: Word,Arial Black,90,&H00FFFFFF,&H0000FFFF,&H00000000,&H80000000,-1,0,0,0,100,100,0,0,1,3,1.5,5,60,60,200,1
```
(Primary white, Secondary yellow for active, Outline black, Shadow semi-transparent black, Bold, Outline=3, Shadow=1.5, Alignment=5/center)

---

## 9. Technology Decisions Summary

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Frontend | SvelteKit | SSE for real-time progress is trivial; stores make per-clip state elegant; smaller bundle than Next.js |
| FFmpeg wrapper | python-ffmpeg | ffmpeg-python is abandoned and incompatible with FFmpeg 7.x |
| Face detection | YOLO11n-face | Best multi-face accuracy in 2025-2026 |
| Lip detection | MediaPipe FaceMesh (Tasks API) | 478-point landmarks, pip-installable |
| Smoothing | filterpy Kalman | Handles missed detections, no rubber-banding |
| Whisper model | large-v3-turbo | 6x faster than large-v3, minor accuracy loss |
| JSON output | anthropic `response_format` + Pydantic | Grammar-constrained, cleaner than tool use for extraction |
