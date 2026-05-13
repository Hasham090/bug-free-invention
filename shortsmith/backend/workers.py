"""
Pipeline orchestration. Each job runs: ingest → transcribe → score → render clips.
Per-clip errors are isolated — failed clips don't abort the job.
"""
import asyncio
import logging
from datetime import datetime
from pathlib import Path
from typing import Callable
from uuid import UUID

from sqlmodel import Session, select

from backend.database import get_engine
from backend.models import Job, JobStatus, Clip, ClipStatus, WordEntry
from backend.config import get_settings
from backend.services import ingest, transcribe, score, detect, render

logger = logging.getLogger(__name__)

# In-memory SSE queues: job_id → list of async queues (one per connected client)
_sse_queues: dict[str, list[asyncio.Queue]] = {}


def register_sse_queue(job_id: str) -> asyncio.Queue:
    q: asyncio.Queue = asyncio.Queue(maxsize=500)
    _sse_queues.setdefault(job_id, []).append(q)
    return q


def unregister_sse_queue(job_id: str, q: asyncio.Queue) -> None:
    if job_id in _sse_queues:
        try:
            _sse_queues[job_id].remove(q)
        except ValueError:
            pass


def _broadcast(job_id: str, event: dict) -> None:
    for q in _sse_queues.get(job_id, []):
        try:
            q.put_nowait(event)
        except asyncio.QueueFull:
            pass


def _update_job(session: Session, job: Job, **kwargs) -> None:
    for k, v in kwargs.items():
        setattr(job, k, v)
    job.updated_at = datetime.utcnow()
    session.add(job)
    session.commit()
    session.refresh(job)


def _make_progress(job_id: str, session: Session, job: Job):
    def on_progress(pct: float, msg: str) -> None:
        job.progress_pct = pct
        job.progress_stage = msg
        _update_job(session, job)
        _broadcast(job_id, {"type": "progress", "stage": msg, "pct": pct})
    return on_progress


async def process_job(job_id: str) -> None:
    engine = get_engine()
    settings = get_settings()

    with Session(engine) as session:
        job = session.get(Job, job_id)
        if not job:
            logger.error(f"Job {job_id} not found")
            return

        try:
            # ── Stage 1: Ingest ──────────────────────────────────────────────
            _update_job(session, job, status=JobStatus.ingesting, progress_pct=0.0, progress_stage="Ingesting video...")
            _broadcast(job_id, {"type": "stage", "stage": "ingesting"})

            on_progress = _make_progress(job_id, session, job)

            if job.source_type == "youtube_url":
                video_path, title, duration = await ingest.download_youtube(
                    job.source_ref, on_progress=on_progress
                )
            else:
                video_path = Path(job.source_ref)
                title = job.video_title or video_path.stem
                try:
                    duration = ingest.get_video_duration(video_path)
                except Exception:
                    duration = 0.0

            _update_job(
                session, job,
                video_path=str(video_path),
                video_title=title,
                duration_seconds=duration,
            )
            _broadcast(job_id, {"type": "ingest_done", "title": title, "duration": duration})

            # ── Stage 2: Transcribe ──────────────────────────────────────────
            _update_job(session, job, status=JobStatus.transcribing, progress_pct=0.0, progress_stage="Transcribing audio...")
            _broadcast(job_id, {"type": "stage", "stage": "transcribing"})

            on_progress = _make_progress(job_id, session, job)
            transcript = await transcribe.transcribe(video_path, on_progress=on_progress)

            # Persist words to DB for future edits
            for idx, w in enumerate(transcript.words):
                word_entry = WordEntry(
                    job_id=job_id,
                    start=w.start,
                    end=w.end,
                    word=w.word,
                    segment_idx=idx,
                )
                session.add(word_entry)
            session.commit()
            _broadcast(job_id, {"type": "transcribe_done", "word_count": len(transcript.words)})

            # ── Stage 3: Score ───────────────────────────────────────────────
            _update_job(session, job, status=JobStatus.scoring, progress_pct=0.0, progress_stage="Scoring viral moments with Claude...")
            _broadcast(job_id, {"type": "stage", "stage": "scoring"})

            on_progress = _make_progress(job_id, session, job)
            candidates = await score.score_transcript(
                transcript,
                video_title=title,
                on_progress=on_progress,
            )

            clips: list[Clip] = []
            for c in candidates:
                clip = Clip(
                    job_id=job_id,
                    start=c.start,
                    end=c.end,
                    score=c.score,
                    title=c.title,
                    hook_line=c.hook_line,
                    why_it_works=c.why_it_works,
                    suggested_hashtags=c.suggested_hashtags,
                    dimension_scores=c.scores.model_dump(),
                    warning=c.warning,
                    status=ClipStatus.pending,
                )
                session.add(clip)
                clips.append(clip)
            session.commit()
            for clip in clips:
                session.refresh(clip)

            _broadcast(job_id, {"type": "score_done", "clip_count": len(clips)})

            # ── Stage 4: Render ──────────────────────────────────────────────
            _update_job(session, job, status=JobStatus.rendering, progress_pct=0.0, progress_stage=f"Rendering {len(clips)} clips...")
            _broadcast(job_id, {"type": "stage", "stage": "rendering"})

            caption_config = settings.load_caption_config()

            async def render_one(clip: Clip) -> None:
                clip_id = str(clip.id)
                try:
                    clip_words = [
                        transcribe.Word(start=w.start, end=w.end, word=w.word)
                        for w in transcript.words
                        if w.start >= clip.start - 0.1 and w.end <= clip.end + 0.1
                    ]

                    clip_dir = settings.clips_dir / clip_id
                    clip_dir.mkdir(exist_ok=True)
                    out_path = clip_dir / "clip.mp4"
                    thumb_path = settings.thumbnails_dir / f"{clip_id}.jpg"

                    def on_clip_progress(pct: float, msg: str) -> None:
                        _broadcast(job_id, {
                            "type": "clip_progress",
                            "clip_id": clip_id,
                            "pct": pct,
                            "msg": msg,
                        })

                    crops = await detect.detect_crops(video_path, clip.start, clip.end)

                    await render.render_clip(
                        video_path=video_path,
                        start=clip.start,
                        end=clip.end,
                        crops=crops,
                        words=clip_words,
                        output_path=out_path,
                        thumbnail_path=thumb_path,
                        caption_config=caption_config,
                        on_progress=on_clip_progress,
                    )

                    with Session(engine) as s:
                        db_clip = s.get(Clip, clip.id)
                        if db_clip:
                            db_clip.output_path = str(out_path)
                            db_clip.thumbnail_path = str(thumb_path)
                            db_clip.status = ClipStatus.done
                            s.add(db_clip)
                            s.commit()

                    _broadcast(job_id, {"type": "clip_done", "clip_id": clip_id})

                except Exception as exc:
                    logger.error(f"Clip {clip_id} failed: {exc}", exc_info=True)
                    with Session(engine) as s:
                        db_clip = s.get(Clip, clip.id)
                        if db_clip:
                            db_clip.status = ClipStatus.failed
                            db_clip.error = str(exc)[:500]
                            s.add(db_clip)
                            s.commit()
                    _broadcast(job_id, {"type": "clip_failed", "clip_id": clip_id, "error": str(exc)[:200]})

            # Render all clips concurrently (bounded by asyncio thread pool)
            await asyncio.gather(*[render_one(c) for c in clips])

            _update_job(session, job, status=JobStatus.done, progress_pct=1.0, progress_stage="All clips ready")
            _broadcast(job_id, {"type": "done"})

        except Exception as exc:
            logger.error(f"Job {job_id} failed: {exc}", exc_info=True)
            _update_job(session, job, status=JobStatus.failed, error=str(exc)[:1000])
            _broadcast(job_id, {"type": "error", "error": str(exc)[:300]})
