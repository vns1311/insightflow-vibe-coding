from __future__ import annotations

from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field


class ProjectBase(BaseModel):
    name: str
    description: Optional[str] = None


class ProjectCreate(ProjectBase):
    pass


class Project(ProjectBase):
    id: str
    created_at: datetime

    class Config:
        orm_mode = True


class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None


class SourceBase(BaseModel):
    project_id: str
    kind: str = Field(default="document")
    title: Optional[str] = None
    tags: List[str] = Field(default_factory=list)


class SourceCreate(SourceBase):
    pass


class Source(SourceBase):
    id: str
    uri: str
    content_ptr: str
    created_at: datetime

    class Config:
        orm_mode = True


class SourceUpdate(BaseModel):
    title: Optional[str] = None
    tags: List[str] = Field(default_factory=list)
    kind: Optional[str] = None


class ObsidianImportRequest(BaseModel):
    project_id: str
    folder: str = "."
    base_path: str | None = None
    limit: int | None = 100


class InsightRunBase(BaseModel):
    project_id: str


class CitationSnippet(BaseModel):
    id: str
    source_id: str
    quote: Optional[str] = None
    location: Optional[str] = None


class ClaimPayload(BaseModel):
    id: str
    statement: str
    confidence: float = 0.0
    citations: List[CitationSnippet] = Field(default_factory=list)


class ThemePayload(BaseModel):
    id: str
    title: str
    summary: Optional[str] = None
    confidence: float = 0.0
    claims: List[ClaimPayload] = Field(default_factory=list)


class InsightRunCreate(InsightRunBase):
    prompt: Optional[str] = None


class InsightRun(BaseModel):
    id: str
    project_id: str
    status: str
    created_at: datetime
    payload: Optional[dict] = None

    class Config:
        orm_mode = True


class InsightRunUpdate(BaseModel):
    status: Optional[str] = None
    payload: Optional[dict] = None


class Theme(BaseModel):
    id: str
    insight_run_id: str
    title: str
    summary: Optional[str]
    confidence: float

    class Config:
        orm_mode = True


class Claim(BaseModel):
    id: str
    theme_id: str
    statement: str
    confidence: float

    class Config:
        orm_mode = True


class Citation(BaseModel):
    id: str
    claim_id: str
    source_id: str
    quote: Optional[str]
    location: Optional[str]

    class Config:
        orm_mode = True


class DecisionBase(BaseModel):
    project_id: str
    title: str
    rationale: Optional[str] = None
    pros: Optional[str] = None
    cons: Optional[str] = None
    risks: Optional[str] = None
    confidence: Optional[float] = None


class DecisionCreate(DecisionBase):
    citation_source_ids: List[str] = Field(default_factory=list)
    linked_claim_ids: List[str] = Field(default_factory=list)


class Decision(DecisionBase):
    id: str
    created_at: datetime
    linked_claim_ids: List[str] = Field(default_factory=list)

    class Config:
        orm_mode = True


class TaskBase(BaseModel):
    project_id: str
    title: str
    status: str = "todo"
    owner: Optional[str] = None
    due_date: Optional[datetime] = None
    decision_id: Optional[str] = None


class TaskCreate(TaskBase):
    pass


class Task(TaskBase):
    id: str
    created_at: datetime

    class Config:
        orm_mode = True


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    status: Optional[str] = None
    owner: Optional[str] = None
    due_date: Optional[datetime] = None
    decision_id: Optional[str] = None
