#!/usr/bin/env python3
"""
Vertical Slice POC — ShortSmith
================================
Usage:
  python scripts/poc_crop_caption.py <video_path> [--start 30] [--duration 30] [--out out.mp4]

Takes a video, runs face detection + Kalman crop + ASS captions + FFmpeg encode.
Extracts 3 frames to verify crop smoothness. Run this before building the full UI.

Requirements: pip install shortsmith[dev] (or the full deps)
"""
import argparse
import subprocess
import sys
import tempfile
from pathlib import Path

# Allow running from repo root without install
sys.path.insert(0, str(Path(__file__).parent.parent))

import asyncio
import json
import logging

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
logger = logging.getLogger("poc")


async def run(video_path: Path, start: float, duration: float, out_path: Path) -> None:
    from backend.services.transcribe import transcribe, Word
    from backend.services.detect import detect_crops, FrameCrop
    from backend.services.captions import generate_ass
    from backend.services.render import render_clip, _get_video_info
    from backend.config import get_settings

    settings = get_settings()
    caption_config = settings.load_caption_config()

    end = start + duration
    logger.info(f"Processing: {video_path} [{start:.1f}s → {end:.1f}s]")

    # Step 1: Transcribe
    logger.info("Step 1/3: Transcribing...")

    def on_progress(pct: float, msg: str) -> None:
        logger.info(f"  [{pct*100:.0f}%] {msg}")

    transcript = await transcribe(video_path, on_progress=on_progress)
    logger.info(f"  → {len(transcript.words)} words transcribed")

    clip_words = [w for w in transcript.words if w.start >= start - 0.1 and w.end <= end + 0.1]
    logger.info(f"  → {len(clip_words)} words in clip window")

    if not clip_words:
        logger.warning("No words found in clip window — captions will be empty")

    # Step 2: Face detection
    logger.info("Step 2/3: Detecting faces and computing crop window...")
    crops = await detect_crops(video_path, start, end)
    logger.info(f"  → {len(crops)} frame crops computed")

    if crops:
        sample = crops[len(crops) // 2]
        logger.info(f"  → Midpoint crop center: ({sample.cx:.0f}, {sample.cy:.0f})")

    # Step 3: Render
    logger.info("Step 3/3: Rendering with FFmpeg...")

    def on_render(pct: float, msg: str) -> None:
        logger.info(f"  [{pct*100:.0f}%] {msg}")

    await render_clip(
        video_path=video_path,
        start=start,
        end=end,
        crops=crops,
        words=clip_words,
        output_path=out_path,
        thumbnail_path=out_path.with_suffix(".thumb.jpg"),
        caption_config=caption_config,
        on_progress=on_render,
    )

    logger.info(f"✓ Output: {out_path}")
    logger.info(f"  Size: {out_path.stat().st_size / 1024 / 1024:.1f} MB")

    # Extract 3 verification frames
    frame_dir = out_path.parent / "frames"
    frame_dir.mkdir(exist_ok=True)
    logger.info(f"Extracting 3 frames to {frame_dir}/ for visual verification...")

    for i, t in enumerate([0.5, duration / 2, duration - 1.0]):
        t = max(0, min(t, duration - 0.1))
        frame_path = frame_dir / f"frame_{i+1:02d}_t{t:.1f}s.png"
        subprocess.run(
            ["ffmpeg", "-y", "-ss", str(t), "-i", str(out_path),
             "-frames:v", "1", str(frame_path)],
            capture_output=True,
        )
        if frame_path.exists():
            logger.info(f"  → {frame_path} ({frame_path.stat().st_size // 1024}KB)")

    logger.info("\nVerification: open the 3 frames to check crop smoothness and caption sync.")
    logger.info("If crop is off-center or captions are misaligned, tune the Kalman Q/R in detect.py")


def main():
    parser = argparse.ArgumentParser(description="ShortSmith POC — single clip test")
    parser.add_argument("video", type=Path, help="Input video path")
    parser.add_argument("--start", type=float, default=30.0, help="Clip start (seconds)")
    parser.add_argument("--duration", type=float, default=30.0, help="Clip duration (seconds)")
    parser.add_argument("--out", type=Path, default=Path("poc_output.mp4"), help="Output path")
    args = parser.parse_args()

    if not args.video.exists():
        print(f"Error: {args.video} not found", file=sys.stderr)
        sys.exit(1)

    asyncio.run(run(args.video, args.start, args.duration, args.out))


if __name__ == "__main__":
    main()
