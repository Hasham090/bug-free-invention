"""
FFmpeg rendering pipeline: crop → scale → captions → encode.
Uses direct subprocess for complex filter graphs (python-ffmpeg for simple ops).
HW acceleration: auto-detect nvenc (NVIDIA) or videotoolbox (macOS), fallback libx264.
"""
import asyncio
import logging
import subprocess
import shutil
import tempfile
from pathlib import Path
from typing import Callable

from backend.services.detect import FrameCrop, compute_crop_params
from backend.services.transcribe import Word
from backend.services.captions import generate_ass
from backend.config import get_settings

logger = logging.getLogger(__name__)

TARGET_W = 1080
TARGET_H = 1920
TARGET_FPS = 30


def _detect_hw_accel(preference: str) -> tuple[str, str]:
    """Return (vcodec, extra_args_str) for encoding."""
    if preference == "none":
        return "libx264", ""

    if preference == "nvenc" or preference == "auto":
        result = subprocess.run(
            ["ffmpeg", "-hide_banner", "-encoders"],
            capture_output=True, text=True, timeout=10
        )
        if "h264_nvenc" in result.stdout:
            logger.info("Using NVIDIA h264_nvenc")
            return "h264_nvenc", "-preset p4 -tune hq"

    if preference == "videotoolbox" or preference == "auto":
        result = subprocess.run(
            ["ffmpeg", "-hide_banner", "-encoders"],
            capture_output=True, text=True, timeout=10
        )
        if "h264_videotoolbox" in result.stdout:
            logger.info("Using Apple VideoToolbox")
            return "h264_videotoolbox", "-q:v 65"

    logger.info("Using software libx264")
    return "libx264", "-preset fast -crf 23"


def _build_crop_filter(
    crops: list[FrameCrop],
    source_w: int,
    source_h: int,
    start_frame: int,
    fps: float,
) -> str:
    """
    Build a sendcmd filter string that animates the crop position over time.
    Falls back to static center crop if crops list is empty.
    """
    if not crops:
        x, y, w, h = compute_crop_params(
            FrameCrop(frame_idx=0, cx=source_w / 2, cy=source_h / 2),
            source_w, source_h, TARGET_W, TARGET_H
        )
        return f"crop={w}:{h}:{x}:{y},scale={TARGET_W}:{TARGET_H}"

    # Build a static crop per detection stride — good enough at 30fps with Kalman smoothing
    # For simplicity, we compute the crop at the midpoint of the clip
    mid = crops[len(crops) // 2]
    x, y, w, h = compute_crop_params(mid, source_w, source_h, TARGET_W, TARGET_H)
    return f"crop={w}:{h}:{x}:{y},scale={TARGET_W}:{TARGET_H}"


def _get_video_info(video_path: Path) -> tuple[int, int, float]:
    """Return (width, height, fps)."""
    import json as _json
    result = subprocess.run(
        ["ffprobe", "-v", "quiet", "-print_format", "json",
         "-show_streams", str(video_path)],
        capture_output=True, text=True, timeout=30
    )
    data = _json.loads(result.stdout)
    for s in data.get("streams", []):
        if s.get("codec_type") == "video":
            w = int(s["width"])
            h = int(s["height"])
            fps_str = s.get("r_frame_rate", "30/1")
            num, den = fps_str.split("/")
            fps = float(num) / float(den)
            return w, h, fps
    return 1920, 1080, 30.0


async def render_clip(
    video_path: Path,
    start: float,
    end: float,
    crops: list[FrameCrop],
    words: list[Word],
    output_path: Path,
    thumbnail_path: Path,
    caption_config: dict,
    on_progress: Callable[[float, str], None] | None = None,
) -> None:
    settings = get_settings()
    duration = end - start

    source_w, source_h, fps = _get_video_info(video_path)

    # Generate ASS captions
    ass_path = output_path.with_suffix(".ass")
    generate_ass(
        words=words,
        clip_start=start,
        clip_end=end,
        output_path=ass_path,
        config=caption_config,
        play_res_x=TARGET_W,
        play_res_y=TARGET_H,
    )

    crop_filter = _build_crop_filter(crops, source_w, source_h, int(start * fps), fps)
    vcodec, vcodec_opts = _detect_hw_accel(settings.ffmpeg_hw_accel)
    vcodec_args = vcodec_opts.split() if vcodec_opts else []

    # Build FFmpeg command
    # Escape ASS path for filter (backslashes on Windows would need escaping, Linux is fine)
    ass_escaped = str(ass_path).replace(":", "\\:")

    cmd = [
        "ffmpeg", "-y",
        "-ss", str(start),
        "-i", str(video_path),
        "-t", str(duration),
        "-vf", f"{crop_filter},fps={TARGET_FPS},ass={ass_escaped}",
        "-c:v", vcodec,
        *vcodec_args,
        "-c:a", "aac",
        "-b:a", "192k",
        "-ar", "44100",
        "-movflags", "+faststart",
        "-pix_fmt", "yuv420p",
        str(output_path),
    ]

    if on_progress:
        on_progress(0.1, "Starting FFmpeg render...")

    loop = asyncio.get_event_loop()

    def _run() -> None:
        process = subprocess.Popen(
            cmd,
            stderr=subprocess.PIPE,
            stdout=subprocess.DEVNULL,
            text=True,
        )
        assert process.stderr is not None
        for line in process.stderr:
            line = line.strip()
            if "time=" in line and on_progress:
                # Parse progress from FFmpeg stderr: time=HH:MM:SS.ms
                try:
                    time_part = line.split("time=")[1].split()[0]
                    h, m, s = time_part.split(":")
                    elapsed = float(h) * 3600 + float(m) * 60 + float(s)
                    pct = min(elapsed / duration, 0.95) if duration > 0 else 0.5
                    on_progress(pct, f"Rendering {elapsed:.1f}s / {duration:.1f}s")
                except Exception:
                    pass
        process.wait()
        if process.returncode != 0:
            raise RuntimeError(f"FFmpeg exited with code {process.returncode}")

    await loop.run_in_executor(None, _run)

    # Clean up ASS temp file
    ass_path.unlink(missing_ok=True)

    # Generate thumbnail: extract frame at start + 2s
    await _generate_thumbnail(video_path, start + 2.0, thumbnail_path, crops, source_w, source_h)

    if on_progress:
        on_progress(1.0, "Render complete")


async def _generate_thumbnail(
    video_path: Path,
    t: float,
    out_path: Path,
    crops: list[FrameCrop],
    source_w: int,
    source_h: int,
) -> None:
    crop_filter = _build_crop_filter(crops, source_w, source_h, 0, 30.0)
    thumb_w = 270  # 1/4 of 1080 for the grid

    cmd = [
        "ffmpeg", "-y",
        "-ss", str(t),
        "-i", str(video_path),
        "-frames:v", "1",
        "-vf", f"{crop_filter},scale={thumb_w}:-2",
        str(out_path),
    ]
    loop = asyncio.get_event_loop()
    await loop.run_in_executor(
        None,
        lambda: subprocess.run(cmd, capture_output=True, timeout=30)
    )
