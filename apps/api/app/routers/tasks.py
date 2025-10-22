from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db

router = APIRouter()


@router.get("/", response_model=list[schemas.Task])
def list_tasks(
    project_id: str | None = None,
    decision_id: str | None = None,
    db: Session = Depends(get_db),
) -> list[models.Task]:
    query = db.query(models.Task)
    if project_id:
        query = query.filter(models.Task.project_id == project_id)
    if decision_id:
        query = query.filter(models.Task.decision_id == decision_id)
    return query.order_by(models.Task.created_at.desc()).all()


@router.post("/", response_model=schemas.Task, status_code=201)
def create_task(payload: schemas.TaskCreate, db: Session = Depends(get_db)) -> models.Task:
    project = db.get(models.Project, payload.project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    due_date = payload.due_date
    if isinstance(due_date, str):
        try:
            due_date = datetime.fromisoformat(due_date)
        except ValueError as exc:
            raise HTTPException(status_code=400, detail="Invalid due_date format; expected ISO-8601") from exc

    decision_id = payload.decision_id
    if decision_id:
        decision = db.get(models.Decision, decision_id)
        if not decision or decision.project_id != payload.project_id:
            raise HTTPException(status_code=400, detail="Decision not found for project")
    task = models.Task(
        project_id=payload.project_id,
        title=payload.title,
        status=payload.status,
        owner=payload.owner,
        due_date=due_date,
        decision_id=payload.decision_id,
    )
    db.add(task)
    db.commit()
    db.refresh(task)
    return task


@router.patch("/{task_id}", response_model=schemas.Task)
def update_task(task_id: str, payload: schemas.TaskUpdate, db: Session = Depends(get_db)) -> models.Task:
    task = db.get(models.Task, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    if payload.title is not None:
        task.title = payload.title
    if payload.status is not None:
        task.status = payload.status
    if payload.owner is not None:
        task.owner = payload.owner
    if payload.due_date is not None:
        due_date = payload.due_date
        if isinstance(due_date, str):
            try:
                due_date = datetime.fromisoformat(due_date)
            except ValueError as exc:
                raise HTTPException(status_code=400, detail="Invalid due_date format; expected ISO-8601") from exc
        task.due_date = due_date
    if payload.decision_id is not None:
        if payload.decision_id:
            decision = db.get(models.Decision, payload.decision_id)
            if not decision or decision.project_id != task.project_id:
                raise HTTPException(status_code=400, detail="Decision not found for project")
            task.decision_id = payload.decision_id
        else:
            task.decision_id = None

    db.add(task)
    db.commit()
    db.refresh(task)
    return task


@router.delete("/{task_id}", status_code=204)
def delete_task(task_id: str, db: Session = Depends(get_db)) -> None:
    task = db.get(models.Task, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    db.delete(task)
    db.commit()
