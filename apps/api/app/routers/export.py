from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session

from .. import models
from ..database import get_db

router = APIRouter()


@router.get("/{project_id}.md")
def export_project_markdown(project_id: str, db: Session = Depends(get_db)) -> Response:
    project = db.get(models.Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    insight_run = (
        db.query(models.InsightRun)
        .filter(models.InsightRun.project_id == project_id)
        .order_by(models.InsightRun.created_at.desc())
        .first()
    )

    if not insight_run:
        raise HTTPException(status_code=400, detail="No insight runs available for export")

    themes = (
        db.query(models.Theme)
        .filter(models.Theme.insight_run_id == insight_run.id)
        .order_by(models.Theme.confidence.desc())
        .all()
    )
    claims = (
        db.query(models.Claim)
        .filter(models.Claim.theme_id.in_([theme.id for theme in themes]))
        .all()
    )

    claim_map = {claim.id: claim for claim in claims}
    citations = (
        db.query(models.Citation)
        .filter(models.Citation.claim_id.in_(claim_map.keys()))
        .all()
    )
    citation_sources = {
        citation.id: db.get(models.Source, citation.source_id)
        for citation in citations
    }

    decisions = (
        db.query(models.Decision)
        .filter(models.Decision.project_id == project_id)
        .order_by(models.Decision.created_at.desc())
        .all()
    )
    tasks = (
        db.query(models.Task)
        .filter(models.Task.project_id == project_id)
        .order_by(models.Task.created_at.asc())
        .all()
    )

    markdown_lines: list[str] = [
        f"# Insight Export — {project.name}",
        "",
        f"_Generated from run {insight_run.id}_",
        "",
        "## Themes & Claims",
        "",
    ]

    footnotes: dict[str, int] = {}
    footnote_lines: list[str] = []

    for theme in themes:
        markdown_lines.append(f"### {theme.title} ({theme.confidence:.0%} confidence)")
        if theme.summary:
            markdown_lines.append(theme.summary)
        markdown_lines.append("")
        theme_claims = [claim for claim in claims if claim.theme_id == theme.id]
        if not theme_claims:
            markdown_lines.append("_No claims available._")
            markdown_lines.append("")
            continue

        for claim in theme_claims:
            line = f"- {claim.statement} ({claim.confidence:.0%} confidence)"
            claim_citations = [c for c in citations if c.claim_id == claim.id]
            if claim_citations:
                footnote_refs: list[str] = []
                for citation in claim_citations:
                    citation_index = footnotes.get(citation.id)
                    if citation_index is None:
                        source = citation_sources.get(citation.id)
                        citation_index = len(footnotes) + 1
                        footnotes[citation.id] = citation_index
                        if source:
                            display_title = source.title or source.uri or source.kind
                        else:
                            display_title = "Reference"
                        footnote_lines.append(f"[^{citation_index}]: {display_title}")
                        if citation.quote:
                            footnote_lines.append(f"> {citation.quote.strip()}")
                        if citation.location:
                            footnote_lines.append(f"Location: {citation.location}")
                        footnote_lines.append("")
                    footnote_refs.append(f"[^{citation_index}]")
                line += " " + " ".join(footnote_refs)
            markdown_lines.append(line)
        markdown_lines.append("")

    markdown_lines.append("## Decisions")
    markdown_lines.append("")
    if decisions:
        for decision in decisions:
            markdown_lines.append(f"- **{decision.title}** — {decision.rationale or 'No rationale provided.'}")
            details: list[str] = []
            if decision.pros:
                details.append(f"  - Pros: {decision.pros}")
            if decision.cons:
                details.append(f"  - Cons: {decision.cons}")
            if decision.risks:
                details.append(f"  - Risks: {decision.risks}")
            if decision.confidence is not None:
                details.append(f"  - Confidence: {int(decision.confidence * 100)}%")
            if decision.linked_claim_ids:
                linked = ", ".join(decision.linked_claim_ids)
                details.append(f"  - Linked claims: {linked}")
            markdown_lines.extend(details)
    else:
        markdown_lines.append("_No decisions recorded._")
    markdown_lines.append("")

    markdown_lines.append("## Tasks")
    markdown_lines.append("")
    if tasks:
        for task in tasks:
            status = task.status.capitalize()
            detail_parts = [status]
            if task.owner:
                detail_parts.append(f"owner: {task.owner}")
            if task.due_date:
                detail_parts.append(f"due: {task.due_date.date().isoformat()}")
            if task.decision_id:
                detail_parts.append(f"decision: {task.decision_id}")
            details = ", ".join(detail_parts)
            markdown_lines.append(f"- **{task.title}** ({details})")
    else:
        markdown_lines.append("_No tasks recorded._")
    markdown_lines.append("")

    if footnote_lines:
        markdown_lines.append("## References")
        markdown_lines.append("")
        markdown_lines.extend(footnote_lines)

    markdown_content = "\n".join(markdown_lines).strip() + "\n"
    return Response(content=markdown_content, media_type="text/markdown")
