from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db
from ..services.insight_engine import generate_mock_payload

router = APIRouter()


@router.get("/", response_model=list[schemas.InsightRun])
def list_runs(project_id: str | None = None, db: Session = Depends(get_db)) -> list[models.InsightRun]:
    query = db.query(models.InsightRun)
    if project_id:
        query = query.filter(models.InsightRun.project_id == project_id)
    return query.order_by(models.InsightRun.created_at.desc()).all()


@router.get("/{run_id}", response_model=schemas.InsightRun)
def get_run(run_id: str, db: Session = Depends(get_db)) -> models.InsightRun:
    run = db.get(models.InsightRun, run_id)
    if not run:
        raise HTTPException(status_code=404, detail="Insight run not found")
    return run


@router.post("/", response_model=schemas.InsightRun, status_code=201)
def create_run(payload: schemas.InsightRunCreate, db: Session = Depends(get_db)) -> models.InsightRun:
    project = db.get(models.Project, payload.project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    run = models.InsightRun(project_id=payload.project_id, status="processing")
    db.add(run)
    db.commit()
    db.refresh(run)

    sources = (
        db.query(models.Source)
        .filter(models.Source.project_id == payload.project_id)
        .order_by(models.Source.created_at.asc())
        .all()
    )
    payload_data = generate_mock_payload(project, sources)

    for theme_payload in payload_data["themes"]:
        theme = models.Theme(
            id=theme_payload["id"],
            insight_run_id=run.id,
            title=theme_payload["title"],
            summary=theme_payload.get("summary"),
            confidence=theme_payload.get("confidence", 0.0),
        )
        db.add(theme)
        for claim_payload in theme_payload["claims"]:
            claim = models.Claim(
                id=claim_payload["id"],
                theme=theme,
                statement=claim_payload["statement"],
                confidence=claim_payload.get("confidence", 0.0),
            )
            db.add(claim)
            for citation_payload in claim_payload["citations"]:
                if not citation_payload.get("source_id"):
                    continue
                citation = models.Citation(
                    id=citation_payload["id"],
                    claim=claim,
                    source_id=citation_payload["source_id"],
                    quote=citation_payload.get("quote"),
                    location=citation_payload.get("location"),
                )
                db.add(citation)

    run.status = "completed"
    run.payload = payload_data
    db.add(run)
    db.commit()
    db.refresh(run)
    return run


@router.patch("/{run_id}", response_model=schemas.InsightRun)
def update_run(run_id: str, payload: schemas.InsightRunUpdate, db: Session = Depends(get_db)) -> models.InsightRun:
    run = db.get(models.InsightRun, run_id)
    if not run:
        raise HTTPException(status_code=404, detail="Insight run not found")
    update_data = payload.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(run, key, value)
    db.add(run)
    db.commit()
    db.refresh(run)
    return run


@router.delete("/{run_id}", status_code=204)
def delete_run(run_id: str, db: Session = Depends(get_db)) -> None:
    run = db.get(models.InsightRun, run_id)
    if not run:
        raise HTTPException(status_code=404, detail="Insight run not found")
    db.delete(run)
    db.commit()
