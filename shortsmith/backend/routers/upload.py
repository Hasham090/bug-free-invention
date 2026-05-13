import shutil
import tempfile
from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, BackgroundTasks, Depends, File, HTTPException, UploadFile
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from sqlmodel import Session

from backend.database import get_session
from backend.models import Job, JobStatus
from backend.workers import process_job
from backend.services.ingest import save_upload

router = APIRouter(prefix="/api", tags=["upload"])

ALLOWED_MIMES = {
    "video/mp4", "video/quicktime", "video/x-matroska",
    "video/webm", "video/x-msvideo", "video/mpeg",
}
MAX_UPLOAD_BYTES = 4 * 60 * 60 * 1024 * 1024 // 8  # generous upper bound


class IngestURLRequest(BaseModel):
    url: str


@router.post("/upload")
async def upload_file(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    session: Session = Depends(get_session),
):
    if file.content_type and file.content_type not in ALLOWED_MIMES:
        # Be lenient — browser MIME sniffing is unreliable for video
        suffix = Path(file.filename or "").suffix.lower()
        if suffix not in {".mp4", ".mov", ".mkv", ".webm", ".avi", ".mpeg", ".mpg"}:
            raise HTTPException(400, "Unsupported file type")

    # Stream to temp file
    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=Path(file.filename or "video.mp4").suffix)
    try:
        shutil.copyfileobj(file.file, tmp)
        tmp.close()
        tmp_path = Path(tmp.name)

        video_path, title = await save_upload(tmp_path, file.filename or "upload.mp4")
    except Exception as exc:
        raise HTTPException(500, f"Upload failed: {exc}")

    job = Job(
        source_type="upload",
        source_ref=str(video_path),
        video_title=title,
        status=JobStatus.pending,
    )
    session.add(job)
    session.commit()
    session.refresh(job)

    job_id = str(job.id)
    background_tasks.add_task(process_job, job_id)

    return {"job_id": job_id, "title": title}


@router.post("/ingest-url")
async def ingest_url(
    req: IngestURLRequest,
    background_tasks: BackgroundTasks,
    session: Session = Depends(get_session),
):
    url = req.url.strip()
    if not url.startswith("http"):
        raise HTTPException(400, "Invalid URL")

    job = Job(
        source_type="youtube_url",
        source_ref=url,
        status=JobStatus.pending,
    )
    session.add(job)
    session.commit()
    session.refresh(job)

    job_id = str(job.id)
    background_tasks.add_task(process_job, job_id)

    return {"job_id": job_id}
