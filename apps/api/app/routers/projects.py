from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db, DATA_DIR

router = APIRouter()


@router.get("/", response_model=list[schemas.Project])
def list_projects(db: Session = Depends(get_db)) -> list[models.Project]:
    return db.query(models.Project).order_by(models.Project.created_at.desc()).all()


@router.post("/", response_model=schemas.Project, status_code=201)
def create_project(payload: schemas.ProjectCreate, db: Session = Depends(get_db)) -> models.Project:
    project = models.Project(**payload.dict())
    db.add(project)
    db.commit()
    db.refresh(project)
    return project


@router.get("/{project_id}", response_model=schemas.Project)
def get_project(project_id: str, db: Session = Depends(get_db)) -> models.Project:
    project = db.get(models.Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


@router.patch("/{project_id}", response_model=schemas.Project)
def update_project(project_id: str, payload: schemas.ProjectUpdate, db: Session = Depends(get_db)) -> models.Project:
    project = db.get(models.Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    update_data = payload.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(project, key, value)
    db.add(project)
    db.commit()
    db.refresh(project)
    return project


@router.delete("/{project_id}", status_code=204)
def delete_project(project_id: str, db: Session = Depends(get_db)) -> None:
    project = db.get(models.Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Clean up associated source files before deletion
    for source in project.sources:
        if source.uri:
            file_path = Path(DATA_DIR.parent, source.uri)
            if file_path.exists():
                file_path.unlink(missing_ok=True)
        if source.content_ptr:
            content_path = Path(DATA_DIR.parent, source.content_ptr)
            if content_path.exists():
                content_path.unlink(missing_ok=True)

    db.delete(project)
    db.commit()
