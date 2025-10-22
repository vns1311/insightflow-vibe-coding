import uuid
from datetime import datetime
from typing import List, Optional

from sqlalchemy import Column, DateTime, Float, ForeignKey, JSON, String, Text
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


def generate_uuid() -> str:
    return str(uuid.uuid4())


class Base(DeclarativeBase):
    pass


class Project(Base):
    __tablename__ = "projects"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text())
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)

    sources: Mapped[List["Source"]] = relationship("Source", back_populates="project", cascade="all, delete-orphan")
    insight_runs: Mapped[List["InsightRun"]] = relationship("InsightRun", back_populates="project", cascade="all, delete-orphan")
    decisions: Mapped[List["Decision"]] = relationship("Decision", back_populates="project", cascade="all, delete-orphan")
    tasks: Mapped[List["Task"]] = relationship("Task", back_populates="project", cascade="all, delete-orphan")


class Source(Base):
    __tablename__ = "sources"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    project_id: Mapped[str] = mapped_column(ForeignKey("projects.id"), nullable=False)
    kind: Mapped[str] = mapped_column(String(50), nullable=False)
    uri: Mapped[str] = mapped_column(String(512), nullable=False)
    title: Mapped[str] = mapped_column(String(255))
    tags: Mapped[List[str]] = mapped_column(JSON, default=list)
    content_ptr: Mapped[str] = mapped_column(String(512))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)

    project: Mapped["Project"] = relationship("Project", back_populates="sources")
    citations: Mapped[List["Citation"]] = relationship("Citation", back_populates="source")


class InsightRun(Base):
    __tablename__ = "insight_runs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    project_id: Mapped[str] = mapped_column(ForeignKey("projects.id"), nullable=False)
    status: Mapped[str] = mapped_column(String(50), default="pending")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    payload: Mapped[Optional[dict]] = mapped_column(JSON)

    project: Mapped["Project"] = relationship("Project", back_populates="insight_runs")
    themes: Mapped[List["Theme"]] = relationship("Theme", back_populates="insight_run", cascade="all, delete-orphan")


class Theme(Base):
    __tablename__ = "themes"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    insight_run_id: Mapped[str] = mapped_column(ForeignKey("insight_runs.id"), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    summary: Mapped[Optional[str]] = mapped_column(Text())
    confidence: Mapped[float] = mapped_column(Float, default=0.0)

    insight_run: Mapped["InsightRun"] = relationship("InsightRun", back_populates="themes")
    claims: Mapped[List["Claim"]] = relationship("Claim", back_populates="theme", cascade="all, delete-orphan")


class Claim(Base):
    __tablename__ = "claims"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    theme_id: Mapped[str] = mapped_column(ForeignKey("themes.id"), nullable=False)
    statement: Mapped[str] = mapped_column(Text(), nullable=False)
    confidence: Mapped[float] = mapped_column(Float, default=0.0)

    theme: Mapped["Theme"] = relationship("Theme", back_populates="claims")
    citations: Mapped[List["Citation"]] = relationship("Citation", back_populates="claim", cascade="all, delete-orphan")


class Citation(Base):
    __tablename__ = "citations"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    claim_id: Mapped[str] = mapped_column(ForeignKey("claims.id"), nullable=False)
    source_id: Mapped[str] = mapped_column(ForeignKey("sources.id"), nullable=False)
    quote: Mapped[Optional[str]] = mapped_column(Text())
    location: Mapped[Optional[str]] = mapped_column(String(255))

    claim: Mapped["Claim"] = relationship("Claim", back_populates="citations")
    source: Mapped["Source"] = relationship("Source", back_populates="citations")


class Decision(Base):
    __tablename__ = "decisions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    project_id: Mapped[str] = mapped_column(ForeignKey("projects.id"), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    rationale: Mapped[Optional[str]] = mapped_column(Text())
    pros: Mapped[Optional[str]] = mapped_column(Text())
    cons: Mapped[Optional[str]] = mapped_column(Text())
    risks: Mapped[Optional[str]] = mapped_column(Text())
    confidence: Mapped[Optional[float]] = mapped_column(Float, default=0.5)
    linked_claim_ids: Mapped[List[str]] = mapped_column(JSON, default=list)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)

    project: Mapped["Project"] = relationship("Project", back_populates="decisions")
    citations: Mapped[List["DecisionCitation"]] = relationship("DecisionCitation", back_populates="decision", cascade="all, delete-orphan")
    tasks: Mapped[List["Task"]] = relationship("Task", back_populates="decision")


class DecisionCitation(Base):
    __tablename__ = "decision_citations"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    decision_id: Mapped[str] = mapped_column(ForeignKey("decisions.id"), nullable=False)
    source_id: Mapped[str] = mapped_column(ForeignKey("sources.id"), nullable=False)
    note: Mapped[Optional[str]] = mapped_column(Text())

    decision: Mapped["Decision"] = relationship("Decision", back_populates="citations")
    source: Mapped["Source"] = relationship("Source")


class Task(Base):
    __tablename__ = "tasks"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    project_id: Mapped[str] = mapped_column(ForeignKey("projects.id"), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    status: Mapped[str] = mapped_column(String(50), default="todo")
    owner: Mapped[Optional[str]] = mapped_column(String(100))
    due_date: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    decision_id: Mapped[Optional[str]] = mapped_column(ForeignKey("decisions.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)

    project: Mapped["Project"] = relationship("Project", back_populates="tasks")
    decision: Mapped[Optional["Decision"]] = relationship("Decision", back_populates="tasks")
