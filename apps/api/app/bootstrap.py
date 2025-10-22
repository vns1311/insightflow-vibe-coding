from __future__ import annotations

from datetime import datetime
from typing import Iterable, Sequence

from sqlalchemy import select
from sqlalchemy.orm import Session

from . import models
from .database import SessionLocal
from .services.insight_engine import generate_mock_payload


def _create_sources(session: Session, project: models.Project) -> Sequence[models.Source]:
    sources_data = [
        {
            "title": "North America Market Trends",
            "uri": "data/uploads/demo-market-trends.txt",
            "content_ptr": "data/uploads/demo-market-trends.txt",
            "tags": ["market", "trend"],
            "kind": "document",
        },
        {
            "title": "Voice of Customer Synthesis",
            "uri": "data/uploads/demo-customer-voices.txt",
            "content_ptr": "data/uploads/demo-customer-voices.txt",
            "tags": ["customer", "feedback"],
            "kind": "document",
        },
    ]

    created: list[models.Source] = []
    for payload in sources_data:
        source = models.Source(
            project_id=project.id,
            title=payload["title"],
            uri=payload["uri"],
            content_ptr=payload["content_ptr"],
            tags=payload["tags"],
            kind=payload["kind"],
        )
        session.add(source)
        created.append(source)

    session.flush()
    return created


def _create_insight_run(session: Session, project: models.Project, sources: Iterable[models.Source]) -> models.InsightRun:
    sources_list = list(sources)
    payload = generate_mock_payload(project, sources_list)
    run = models.InsightRun(
        project_id=project.id,
        status="completed",
        payload=payload,
        created_at=datetime.utcnow(),
    )
    session.add(run)
    session.flush()

    for theme_entry in payload.get("themes", []):
        theme = models.Theme(
            id=theme_entry["id"],
            insight_run_id=run.id,
            title=theme_entry["title"],
            summary=theme_entry.get("summary"),
            confidence=theme_entry.get("confidence", 0.0),
        )
        session.add(theme)
        session.flush()

        for claim_entry in theme_entry.get("claims", []):
            claim = models.Claim(
                id=claim_entry["id"],
                theme_id=theme.id,
                statement=claim_entry["statement"],
                confidence=claim_entry.get("confidence", 0.0),
            )
            session.add(claim)
            session.flush()

            for citation_entry in claim_entry.get("citations", []):
                source_id = citation_entry.get("source_id")
                if not source_id:
                    continue
                session.add(
                    models.Citation(
                        id=citation_entry["id"],
                        claim_id=claim.id,
                        source_id=source_id,
                        quote=citation_entry.get("quote"),
                        location=citation_entry.get("location"),
                    )
                )

    session.flush()
    return run


def ensure_demo_data(force: bool = False) -> None:
    """Bootstrap demo records so the UI has data out of the box."""
    with SessionLocal() as session:
        existing_demo = session.scalars(
            select(models.Project).where(models.Project.name == "InsightFlow Demo Project")
        ).first()

        if existing_demo and not force:
            return

        if existing_demo and force:
            return

        project = models.Project(
            name="InsightFlow Demo Project",
            description="Explore how InsightFlow organizes research, insights, and follow-up.",
        )
        session.add(project)
        session.flush()

        sources = _create_sources(session, project)
        _create_insight_run(session, project, sources)

        session.commit()
