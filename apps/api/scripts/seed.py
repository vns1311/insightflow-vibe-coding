"""
Seed script for InsightFlow.

Usage:
    python -m scripts.seed
"""
from __future__ import annotations

import random
from datetime import datetime, timedelta
from pathlib import Path

from sqlalchemy.orm import Session

from app import models
from app.database import DATA_DIR, SessionLocal

SAMPLE_SOURCES = [
    {
        "filename": "market-overview.txt",
        "content": "The market shows a steady growth of 12% YoY with emerging opportunities in APAC.\n",
        "title": "Market Overview 2024",
        "tags": ["market", "outlook"],
    },
    {
        "filename": "customer-insights.md",
        "content": "# Customer Insights\n- Retention improved by 8%\n- NPS reached 45\n",
        "title": "Customer Insights",
        "tags": ["customer", "nps"],
    },
]


def ensure_uploads_dir() -> Path:
    upload_dir = DATA_DIR / "uploads"
    upload_dir.mkdir(parents=True, exist_ok=True)
    return upload_dir


def write_sample_file(filename: str, content: str) -> Path:
    upload_dir = ensure_uploads_dir()
    path = upload_dir / filename
    path.write_text(content, encoding="utf-8")
    return path


def seed(db: Session) -> None:
    project = models.Project(name="Sample Project", description="Demo project seeded with data.")
    db.add(project)
    db.flush()

    sources = []
    for sample in SAMPLE_SOURCES:
        saved_path = write_sample_file(sample["filename"], sample["content"])
        extracted_path = saved_path.with_suffix(".extracted.txt")
        extracted_path.write_text(sample["content"], encoding="utf-8")
        source = models.Source(
            project_id=project.id,
            kind="document",
            uri=str(saved_path.relative_to(DATA_DIR.parent)),
            title=sample["title"],
            tags=sample["tags"],
            content_ptr=str(extracted_path.relative_to(DATA_DIR.parent)),
        )
        db.add(source)
        sources.append(source)

    decision = models.Decision(
        project_id=project.id,
        title="Expand to APAC",
        rationale="Market trends suggest favorable growth in APAC over the next 18 months.",
        pros="Strong market tailwinds; existing customer demand signals",
        cons="Requires regional hiring and onboarding",
        risks="Delayed compliance approvals could slow rollout",
        confidence=0.7,
        linked_claim_ids=[],
    )
    db.add(decision)

    for source in sources:
        db.add(
            models.DecisionCitation(
                decision=decision,
                source_id=source.id,
                note="Supports APAC opportunity.",
            )
        )

    for idx in range(3):
        db.add(
            models.Task(
                project_id=project.id,
                title=f"Task {idx + 1}",
                status=random.choice(["todo", "in_progress", "done"]),
                owner="Research Team",
                due_date=datetime.utcnow() + timedelta(days=idx * 7),
                decision=decision,
            )
        )

    db.commit()
    print(f"Seeded project {project.id}")


if __name__ == "__main__":
    with SessionLocal() as session:
        seed(session)
