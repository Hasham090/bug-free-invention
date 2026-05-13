import asyncio
import shutil
import uuid
from pathlib import Path
from typing import Callable, AsyncIterator
import yt_dlp

from backend.config import get_settings


async def download_youtube(
    url: str,
    on_progress: Callable[[float, str], None] | None = None,
) -> tuple[Path, str, float]:
    """Download a YouTube video. Returns (video_path, title, duration_seconds)."""
    settings = get_settings()
    job_id = uuid.uuid4().hex
    out_dir = settings.uploads_dir / job_id
    out_dir.mkdir(parents=True, exist_ok=True)

    title_holder: list[str] = [""]
    duration_holder: list[float] = [0.0]

    def progress_hook(d: dict) -> None:
        if d["status"] == "downloading":
            pct_str = d.get("_percent_str", "0%").strip().rstrip("%")
            try:
                pct = float(pct_str) / 100.0
            except ValueError:
                pct = 0.0
            speed = d.get("_speed_str", "")
            if on_progress:
                on_progress(pct * 0.9, f"Downloading {pct_str}% {speed}")
        elif d["status"] == "finished":
            if on_progress:
                on_progress(0.95, "Merging streams...")

    ydl_opts = {
        "format": (
            "bestvideo[height<=1080][ext=mp4]+bestaudio[ext=m4a]"
            "/best[height<=1080][ext=mp4]"
            "/best[height<=1080]"
        ),
        "merge_output_format": "mp4",
        "format_sort": ["vcodec:h264", "acodec:aac"],
        "outtmpl": str(out_dir / "source.%(ext)s"),
        "progress_hooks": [progress_hook],
        "quiet": True,
        "no_warnings": True,
    }

    loop = asyncio.get_event_loop()

    def _download() -> None:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=True)
            title_holder[0] = info.get("title", "Untitled")
            duration_holder[0] = float(info.get("duration", 0))

    await loop.run_in_executor(None, _download)

    candidates = list(out_dir.glob("source.*"))
    if not candidates:
        raise RuntimeError("yt-dlp produced no output file")
    video_path = candidates[0]

    if on_progress:
        on_progress(1.0, "Download complete")

    return video_path, title_holder[0], duration_holder[0]


async def save_upload(tmp_path: Path, original_filename: str) -> tuple[Path, str]:
    """Move an uploaded temp file to persistent storage. Returns (video_path, title)."""
    settings = get_settings()
    job_id = uuid.uuid4().hex
    out_dir = settings.uploads_dir / job_id
    out_dir.mkdir(parents=True, exist_ok=True)

    suffix = Path(original_filename).suffix or ".mp4"
    dest = out_dir / f"source{suffix}"

    loop = asyncio.get_event_loop()
    await loop.run_in_executor(None, shutil.move, str(tmp_path), str(dest))

    title = Path(original_filename).stem
    return dest, title


def get_video_duration(video_path: Path) -> float:
    """Use ffprobe to get duration in seconds."""
    import subprocess
    import json as _json

    result = subprocess.run(
        [
            "ffprobe", "-v", "quiet",
            "-print_format", "json",
            "-show_format",
            str(video_path),
        ],
        capture_output=True,
        text=True,
        timeout=30,
    )
    data = _json.loads(result.stdout)
    return float(data["format"]["duration"])
