from datetime import datetime
from enum import Enum
from typing import Optional
from uuid import UUID, uuid4
from sqlmodel import SQLModel, Field, Column, JSON


class JobStatus(str, Enum):
    pending = "pending"
    ingesting = "ingesting"
    transcribing = "transcribing"
    scoring = "scoring"
    rendering = "rendering"
    done = "done"
    failed = "failed"


class ClipStatus(str, Enum):
    pending = "pending"
    rendering = "rendering"
    done = "done"
    failed = "failed"


class Job(SQLModel, table=True):
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    status: JobStatus = Field(default=JobStatus.pending)
    source_type: str  # "upload" | "youtube_url"
    source_ref: str   # filename or URL
    video_path: Optional[str] = None
    transcript_path: Optional[str] = None
    video_title: Optional[str] = None
    duration_seconds: Optional[float] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    error: Optional[str] = None
    progress_pct: float = 0.0
    progress_stage: str = ""


class Clip(SQLModel, table=True):
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    job_id: UUID = Field(foreign_key="job.id", index=True)
    start: float
    end: float
    score: int
    title: str
    hook_line: str
    why_it_works: str
    suggested_hashtags: list[str] = Field(default_factory=list, sa_column=Column(JSON))
    dimension_scores: dict = Field(default_factory=dict, sa_column=Column(JSON))
    warning: Optional[str] = None
    output_path: Optional[str] = None
    thumbnail_path: Optional[str] = None
    status: ClipStatus = Field(default=ClipStatus.pending)
    error: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)


class WordEntry(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    job_id: UUID = Field(foreign_key="job.id", index=True)
    start: float
    end: float
    word: str
    segment_idx: int = 0
