from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db

router = APIRouter()


@router.get("/", response_model=list[schemas.Claim])
def list_claims(theme_id: str | None = None, db: Session = Depends(get_db)) -> list[models.Claim]:
    query = db.query(models.Claim)
    if theme_id:
        query = query.filter(models.Claim.theme_id == theme_id)
    return query.order_by(models.Claim.confidence.desc()).all()


@router.get("/{claim_id}", response_model=schemas.Claim)
def get_claim(claim_id: str, db: Session = Depends(get_db)) -> models.Claim:
    claim = db.get(models.Claim, claim_id)
    if not claim:
        raise HTTPException(status_code=404, detail="Claim not found")
    return claim
