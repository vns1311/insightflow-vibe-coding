from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db

router = APIRouter()


@router.get("/", response_model=list[schemas.Decision])
def list_decisions(project_id: str | None = None, db: Session = Depends(get_db)) -> list[models.Decision]:
    query = db.query(models.Decision)
    if project_id:
        query = query.filter(models.Decision.project_id == project_id)
    return query.order_by(models.Decision.created_at.desc()).all()


@router.get("/{decision_id}", response_model=schemas.Decision)
def get_decision(decision_id: str, db: Session = Depends(get_db)) -> models.Decision:
    decision = db.get(models.Decision, decision_id)
    if not decision:
        raise HTTPException(status_code=404, detail="Decision not found")
    return decision


@router.post("/", response_model=schemas.Decision, status_code=201)
def create_decision(payload: schemas.DecisionCreate, db: Session = Depends(get_db)) -> models.Decision:
    project = db.get(models.Project, payload.project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    decision = models.Decision(
        project_id=payload.project_id,
        title=payload.title,
        rationale=payload.rationale,
        pros=payload.pros,
        cons=payload.cons,
        risks=payload.risks,
        confidence=payload.confidence,
        linked_claim_ids=payload.linked_claim_ids or [],
    )
    db.add(decision)
    db.flush()

    if payload.citation_source_ids:
        existing_sources = (
            db.query(models.Source.id)
            .filter(models.Source.id.in_(payload.citation_source_ids))
            .all()
        )
        existing_ids = {row[0] for row in existing_sources}
        missing = set(payload.citation_source_ids) - existing_ids
        if missing:
            raise HTTPException(status_code=400, detail=f"Unknown sources for citations: {', '.join(missing)}")
        for source_id in existing_ids:
            db.add(
                models.DecisionCitation(
                    decision=decision,
                    source_id=source_id,
                    note=None,
                )
            )

    db.commit()
    db.refresh(decision)
    return decision


@router.put("/{decision_id}", response_model=schemas.Decision)
def update_decision(decision_id: str, payload: schemas.DecisionCreate, db: Session = Depends(get_db)) -> models.Decision:
    decision = db.get(models.Decision, decision_id)
    if not decision:
        raise HTTPException(status_code=404, detail="Decision not found")

    for field in ["title", "rationale", "pros", "cons", "risks", "confidence"]:
        setattr(decision, field, getattr(payload, field))
    decision.linked_claim_ids = payload.linked_claim_ids or []

    project = db.get(models.Project, payload.project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    decision.project_id = payload.project_id

    existing_sources = (
        db.query(models.Source.id)
        .filter(models.Source.id.in_(payload.citation_source_ids))
        .all()
    )
    existing_ids = {row[0] for row in existing_sources}

    decision.citations.clear()
    db.flush()

    for source_id in existing_ids:
        db.add(
            models.DecisionCitation(
                decision=decision,
                source_id=source_id,
                note=None,
            )
        )

    db.commit()
    db.refresh(decision)
    return decision


@router.delete("/{decision_id}", status_code=204)
def delete_decision(decision_id: str, db: Session = Depends(get_db)) -> None:
    decision = db.get(models.Decision, decision_id)
    if not decision:
        raise HTTPException(status_code=404, detail="Decision not found")

    tasks = (
        db.query(models.Task)
        .filter(models.Task.decision_id == decision_id)
        .all()
    )
    for task in tasks:
        task.decision_id = None
        db.add(task)

    db.delete(decision)
    db.commit()
