from __future__ import annotations

from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import models
from ..database import get_db

router = APIRouter()


@router.get("/{project_id}.md")
def daily_digest(project_id: str, date: str | None = None, db: Session = Depends(get_db)) -> str:
    project = db.get(models.Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    try:
        target_date = datetime.fromisoformat(date).date() if date else datetime.utcnow().date()
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="Invalid date format. Use ISO format (YYYY-MM-DD).") from exc

    start_of_day = datetime.combine(target_date, datetime.min.time())
    end_of_day = start_of_day + timedelta(days=1)

    new_sources = (
        db.query(models.Source)
        .filter(models.Source.project_id == project_id)
        .filter(models.Source.created_at >= start_of_day, models.Source.created_at < end_of_day)
        .order_by(models.Source.created_at.desc())
        .all()
    )

    decisions = (
        db.query(models.Decision)
        .filter(models.Decision.project_id == project_id)
        .filter(models.Decision.created_at >= start_of_day - timedelta(days=7))
        .order_by(models.Decision.created_at.desc())
        .all()
    )

    recent_tasks = (
        db.query(models.Task)
        .filter(models.Task.project_id == project_id)
        .filter(models.Task.created_at >= start_of_day - timedelta(days=7))
        .order_by(models.Task.created_at.desc())
        .all()
    )

    insight_runs = (
        db.query(models.InsightRun)
        .filter(models.InsightRun.project_id == project_id)
        .filter(models.InsightRun.created_at >= start_of_day - timedelta(days=1))
        .order_by(models.InsightRun.created_at.desc())
        .all()
    )

    lines: list[str] = [
        f"# Daily Digest — {project.name}",
        f"_Date: {target_date.isoformat()}_",
        "",
    ]

    lines.append("## Fresh Sources")
    lines.append("")
    if new_sources:
        for source in new_sources:
            lines.append(f"- {source.title or source.uri} (`{source.kind}`)")
    else:
        lines.append("- No new sources captured today.")
    lines.append("")

    lines.append("## Insight Run Highlights")
    lines.append("")
    if insight_runs:
        run = insight_runs[0]
        lines.append(f"- Run {run.id} completed with status **{run.status}**")
        if run.payload and isinstance(run.payload, dict):
            themes = run.payload.get("themes", [])
            for theme in themes[:3]:
                title = theme.get("title", "Theme")
                summary = theme.get("summary", "")
                lines.append(f"  - **{title}** — {summary}")
    else:
        lines.append("- No recent insight runs.")
    lines.append("")

    lines.append("## Decision Updates")
    lines.append("")
    if decisions:
        for decision in decisions:
            lines.append(f"- **{decision.title}** ({decision.created_at.date().isoformat()})")
            if decision.rationale:
                lines.append(f"  - Rationale: {decision.rationale}")
            if decision.pros:
                lines.append(f"  - Pros: {decision.pros}")
            if decision.cons:
                lines.append(f"  - Cons: {decision.cons}")
            if decision.risks:
                lines.append(f"  - Risks: {decision.risks}")
    else:
        lines.append("- No decisions logged in the past week.")
    lines.append("")

    lines.append("## Task Snapshot")
    lines.append("")
    if recent_tasks:
        by_status: dict[str, list[models.Task]] = {"todo": [], "in_progress": [], "done": []}
        for task in recent_tasks:
            bucket = by_status.setdefault(task.status, [])
            bucket.append(task)
        for status, items in by_status.items():
            if not items:
                continue
            lines.append(f"- **{status.replace('_', ' ').title()}**")
            for task in items:
                owner = f" (owner: {task.owner})" if task.owner else ""
                lines.append(f"  - {task.title}{owner}")
    else:
        lines.append("- No tasks updated recently.")
    lines.append("")

    return "\n".join(lines).strip() + "\n"
