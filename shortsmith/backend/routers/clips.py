import io
import zipfile
from pathlib import Path
from uuid import UUID

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from fastapi.responses import FileResponse, StreamingResponse
from pydantic import BaseModel
from sqlmodel import Session, select

from backend.database import get_session
from backend.models import Clip, ClipStatus, Job, WordEntry
from backend.workers import process_job

router = APIRouter(prefix="/api/clips", tags=["clips"])


@router.get("")
def list_clips(job_id: str, session: Session = Depends(get_session)):
    clips = session.exec(
        select(Clip).where(Clip.job_id == job_id).order_by(Clip.score.desc())
    ).all()
    return [_clip_dict(c) for c in clips]


@router.get("/{clip_id}")
def get_clip(clip_id: str, session: Session = Depends(get_session)):
    clip = session.get(Clip, clip_id)
    if not clip:
        raise HTTPException(404, "Clip not found")
    return _clip_dict(clip)


class ClipPatch(BaseModel):
    start: float | None = None
    end: float | None = None
    title: str | None = None


@router.patch("/{clip_id}")
def patch_clip(
    clip_id: str,
    patch: ClipPatch,
    session: Session = Depends(get_session),
):
    clip = session.get(Clip, clip_id)
    if not clip:
        raise HTTPException(404, "Clip not found")

    if patch.start is not None:
        clip.start = patch.start
    if patch.end is not None:
        clip.end = patch.end
    if patch.title is not None:
        clip.title = patch.title

    session.add(clip)
    session.commit()
    session.refresh(clip)
    return _clip_dict(clip)


@router.post("/{clip_id}/rerender")
async def rerender_clip(
    clip_id: str,
    background_tasks: BackgroundTasks,
    session: Session = Depends(get_session),
):
    clip = session.get(Clip, clip_id)
    if not clip:
        raise HTTPException(404, "Clip not found")

    clip.status = ClipStatus.pending
    clip.error = None
    session.add(clip)
    session.commit()

    # Trigger rerender as part of the parent job
    background_tasks.add_task(_rerender_single_clip, clip_id)
    return {"status": "queued"}


async def _rerender_single_clip(clip_id: str) -> None:
    from backend.database import get_engine
    from sqlmodel import Session as S
    from backend.services import transcribe, detect, render
    from backend.config import get_settings

    engine = get_engine()
    settings = get_settings()

    with S(engine) as session:
        clip = session.get(Clip, clip_id)
        if not clip:
            return
        job = session.get(Job, clip.job_id)
        if not job or not job.video_path:
            return

        words_db = session.exec(
            select(WordEntry).where(WordEntry.job_id == str(clip.job_id))
        ).all()
        clip_words = [
            transcribe.Word(start=w.start, end=w.end, word=w.word)
            for w in words_db
            if w.start >= clip.start - 0.1 and w.end <= clip.end + 0.1
        ]

        video_path = Path(job.video_path)
        clip_dir = settings.clips_dir / clip_id
        clip_dir.mkdir(exist_ok=True)
        out_path = clip_dir / "clip.mp4"
        thumb_path = settings.thumbnails_dir / f"{clip_id}.jpg"
        caption_config = settings.load_caption_config()

        try:
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
            )
            clip.output_path = str(out_path)
            clip.thumbnail_path = str(thumb_path)
            clip.status = ClipStatus.done
            clip.error = None
        except Exception as exc:
            clip.status = ClipStatus.failed
            clip.error = str(exc)[:500]

        session.add(clip)
        session.commit()


@router.get("/{clip_id}/download")
def download_clip(clip_id: str, session: Session = Depends(get_session)):
    clip = session.get(Clip, clip_id)
    if not clip or not clip.output_path:
        raise HTTPException(404, "Clip not ready")
    path = Path(clip.output_path)
    if not path.exists():
        raise HTTPException(404, "Clip file not found on disk")
    safe_title = "".join(c for c in clip.title if c.isalnum() or c in " _-")[:50]
    return FileResponse(
        path=str(path),
        media_type="video/mp4",
        filename=f"{safe_title}.mp4",
    )


@router.get("/{clip_id}/thumbnail")
def get_thumbnail(clip_id: str, session: Session = Depends(get_session)):
    clip = session.get(Clip, clip_id)
    if not clip or not clip.thumbnail_path:
        raise HTTPException(404, "Thumbnail not ready")
    path = Path(clip.thumbnail_path)
    if not path.exists():
        raise HTTPException(404, "Thumbnail not found")
    return FileResponse(path=str(path), media_type="image/jpeg")


@router.get("/job/{job_id}/download-all")
def download_all(job_id: str, session: Session = Depends(get_session)):
    clips = session.exec(
        select(Clip).where(Clip.job_id == job_id, Clip.status == ClipStatus.done)
    ).all()
    if not clips:
        raise HTTPException(404, "No completed clips found")

    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        for clip in clips:
            if not clip.output_path:
                continue
            p = Path(clip.output_path)
            if p.exists():
                safe_title = "".join(c for c in clip.title if c.isalnum() or c in " _-")[:50]
                zf.write(p, f"{safe_title}.mp4")
    buf.seek(0)

    return StreamingResponse(
        buf,
        media_type="application/zip",
        headers={"Content-Disposition": 'attachment; filename="shortsmith_clips.zip"'},
    )


def _clip_dict(clip: Clip) -> dict:
    return {
        "id": str(clip.id),
        "job_id": str(clip.job_id),
        "start": clip.start,
        "end": clip.end,
        "duration": clip.end - clip.start,
        "score": clip.score,
        "title": clip.title,
        "hook_line": clip.hook_line,
        "why_it_works": clip.why_it_works,
        "suggested_hashtags": clip.suggested_hashtags,
        "dimension_scores": clip.dimension_scores,
        "warning": clip.warning,
        "status": clip.status,
        "error": clip.error,
        "has_video": clip.output_path is not None,
        "has_thumbnail": clip.thumbnail_path is not None,
        "created_at": clip.created_at.isoformat(),
    }
