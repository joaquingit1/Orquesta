"""SQLModel schema for codemetrics backend."""

from __future__ import annotations

import os
from datetime import datetime
from typing import Optional

from sqlmodel import Field, SQLModel, create_engine, Session


class Project(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    slug: str = Field(index=True, unique=True)
    name: str
    quality_score: Optional[float] = None
    quality_summary: Optional[str] = None
    last_scanned_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)


class Engineer(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    email: str = Field(index=True, unique=True)
    name: str = ""
    avatar_url: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)


class Commit(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    sha: str = Field(index=True, unique=True)
    subject: str = ""
    project_id: int = Field(foreign_key="project.id", index=True)
    engineer_id: int = Field(foreign_key="engineer.id", index=True)
    committed_at: datetime
    additions: int = 0
    deletions: int = 0
    files_changed: int = 0
    input_tokens: int = 0
    output_tokens: int = 0
    cache_creation_input_tokens: int = 0
    cache_read_input_tokens: int = 0
    total_tokens: int = 0
    events: int = 0
    model: str = ""
    cost_usd: float = 0.0
    quality_score: Optional[float] = None
    quality_summary: Optional[str] = None
    quality_issues_json: Optional[str] = None
    diff_patch: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)


DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./codemetrics.db")
engine = create_engine(DATABASE_URL, echo=False, connect_args={"check_same_thread": False})


def init_db() -> None:
    SQLModel.metadata.create_all(engine)


def get_session() -> Session:
    return Session(engine)
