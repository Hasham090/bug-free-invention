"""
Transcription via faster-whisper with word-level timestamps.
Results cached to disk so re-runs are instant.
"""
import asyncio
import hashlib
import json
import logging
from dataclasses import dataclass, asdict
from pathlib import Path
from typing import Callable

from backend.config import get_settings

logger = logging.getLogger(__name__)


@dataclass
class Word:
    start: float
    end: float
    word: str


@dataclass
class TranscriptResult:
    words: list[Word]
    language: str
    duration: float


def _compute_hash(video_path: Path) -> str:
    h = hashlib.sha256()
    with open(video_path, "rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()[:16]


def _load_cache(cache_path: Path) -> TranscriptResult | None:
    if not cache_path.exists():
        return None
    try:
        data = json.loads(cache_path.read_text())
        return TranscriptResult(
            words=[Word(**w) for w in data["words"]],
            language=data["language"],
            duration=data["duration"],
        )
    except Exception:
        return None


def _save_cache(cache_path: Path, result: TranscriptResult) -> None:
    cache_path.write_text(
        json.dumps(
            {
                "words": [asdict(w) for w in result.words],
                "language": result.language,
                "duration": result.duration,
            },
            indent=2,
        )
    )


def _detect_device(requested: str) -> tuple[str, str]:
    """Return (device, compute_type) based on availability."""
    if requested != "auto":
        settings = get_settings()
        return requested, settings.whisper_compute_type

    try:
        import torch
        if torch.cuda.is_available():
            logger.info("GPU detected: using CUDA")
            return "cuda", "float16"
    except ImportError:
        pass

    logger.warning("No GPU found — transcription will be slow on CPU")
    return "cpu", "int8"


def _run_transcribe(video_path: Path, on_progress: Callable[[float, str], None] | None) -> TranscriptResult:
    from faster_whisper import WhisperModel

    settings = get_settings()
    device, compute_type = _detect_device(settings.whisper_device)

    if on_progress:
        on_progress(0.05, f"Loading Whisper {settings.whisper_model} on {device}...")

    model = WhisperModel(settings.whisper_model, device=device, compute_type=compute_type)

    if on_progress:
        on_progress(0.15, "Starting transcription...")

    segments, info = model.transcribe(
        str(video_path),
        word_timestamps=True,
        condition_on_previous_text=False,
        vad_filter=True,
    )

    words: list[Word] = []
    total_duration = info.duration or 1.0

    for segment in segments:
        if segment.words:
            for w in segment.words:
                words.append(Word(start=w.start, end=w.end, word=w.word))
        if on_progress and words:
            pct = min(0.15 + (words[-1].end / total_duration) * 0.80, 0.95)
            on_progress(pct, f"Transcribed {words[-1].end:.0f}s / {total_duration:.0f}s")

    if settings.use_whisperx and words:
        words = _apply_whisperx(video_path, words, info.language, device, on_progress)

    return TranscriptResult(words=words, language=info.language, duration=total_duration)


def _apply_whisperx(
    video_path: Path,
    words: list[Word],
    language: str,
    device: str,
    on_progress: Callable | None,
) -> list[Word]:
    """Forced alignment via whisperX for frame-accurate word timestamps."""
    try:
        import whisperx

        if on_progress:
            on_progress(0.92, "Applying forced alignment (whisperX)...")

        audio = whisperx.load_audio(str(video_path))
        align_model, metadata = whisperx.load_align_model(language_code=language, device=device)

        # whisperX expects segments in its own format
        segments = [{"text": " ".join(w.word for w in words), "words": [
            {"word": w.word, "start": w.start, "end": w.end} for w in words
        ]}]

        aligned = whisperx.align(segments, align_model, metadata, audio, device)
        aligned_words = []
        for seg in aligned.get("segments", []):
            for w in seg.get("words", []):
                aligned_words.append(Word(
                    start=w.get("start", 0),
                    end=w.get("end", 0),
                    word=w.get("word", ""),
                ))
        return aligned_words if aligned_words else words
    except Exception as exc:
        logger.warning(f"whisperX alignment failed, using faster-whisper timestamps: {exc}")
        return words


async def transcribe(
    video_path: Path,
    on_progress: Callable[[float, str], None] | None = None,
) -> TranscriptResult:
    settings = get_settings()
    video_hash = _compute_hash(video_path)
    cache_path = settings.transcripts_dir / f"{video_hash}.json"

    cached = _load_cache(cache_path)
    if cached:
        logger.info(f"Transcript cache hit: {cache_path}")
        if on_progress:
            on_progress(1.0, "Loaded from cache")
        return cached

    loop = asyncio.get_event_loop()
    result = await loop.run_in_executor(None, _run_transcribe, video_path, on_progress)

    _save_cache(cache_path, result)
    if on_progress:
        on_progress(1.0, f"Transcription complete ({len(result.words)} words)")

    return result
