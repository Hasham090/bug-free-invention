import asyncio
import json
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlmodel import Session, select

from backend.database import get_session
from backend.models import Job, Clip
from backend.workers import register_sse_queue, unregister_sse_queue

router = APIRouter(prefix="/api/jobs", tags=["jobs"])


@router.get("/{job_id}")
def get_job(job_id: str, session: Session = Depends(get_session)):
    job = session.get(Job, job_id)
    if not job:
        raise HTTPException(404, "Job not found")
    clips = session.exec(select(Clip).where(Clip.job_id == job_id)).all()
    return {
        "id": str(job.id),
        "status": job.status,
        "source_type": job.source_type,
        "source_ref": job.source_ref,
        "video_title": job.video_title,
        "duration_seconds": job.duration_seconds,
        "progress_pct": job.progress_pct,
        "progress_stage": job.progress_stage,
        "error": job.error,
        "created_at": job.created_at.isoformat(),
        "clip_count": len(clips),
    }


@router.get("/{job_id}/stream")
async def stream_job_events(job_id: str, session: Session = Depends(get_session)):
    job = session.get(Job, job_id)
    if not job:
        raise HTTPException(404, "Job not found")

    q = register_sse_queue(job_id)

    async def event_generator():
        try:
            # Send current state immediately on connect
            yield _sse_event({"type": "connected", "status": job.status, "pct": job.progress_pct})

            while True:
                try:
                    event = await asyncio.wait_for(q.get(), timeout=25.0)
                    yield _sse_event(event)
                    if event.get("type") in ("done", "error"):
                        break
                except asyncio.TimeoutError:
                    yield ": keepalive\n\n"
        finally:
            unregister_sse_queue(job_id, q)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
        },
    )


def _sse_event(data: dict) -> str:
    return f"data: {json.dumps(data)}\n\n"
