from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db

router = APIRouter()


@router.get("/", response_model=list[schemas.Theme])
def list_themes(run_id: str | None = None, db: Session = Depends(get_db)) -> list[models.Theme]:
    query = db.query(models.Theme)
    if run_id:
        query = query.filter(models.Theme.insight_run_id == run_id)
    return query.order_by(models.Theme.confidence.desc()).all()


@router.get("/{theme_id}", response_model=schemas.Theme)
def get_theme(theme_id: str, db: Session = Depends(get_db)) -> models.Theme:
    theme = db.get(models.Theme, theme_id)
    if not theme:
        raise HTTPException(status_code=404, detail="Theme not found")
    return theme
