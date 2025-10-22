import json
import uuid
from pathlib import Path
from typing import List, Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db, DATA_DIR
from ..services.extractors import extract_text_from_upload
from ..services.embedding_store import embedding_store

router = APIRouter()

UPLOAD_DIR = DATA_DIR / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


def _parse_tags(raw: Optional[str]) -> List[str]:
    if not raw:
        return []
    # Accept JSON array or comma separated string
    stripped = raw.strip()
    if not stripped:
        return []
    if stripped.startswith("["):
        try:
            data = json.loads(stripped)
            if not isinstance(data, list):
                return []
            return [str(item) for item in data]
        except json.JSONDecodeError:
            return []
    return [tag.strip() for tag in stripped.split(",") if tag.strip()]


@router.get("/", response_model=list[schemas.Source])
def list_sources(project_id: Optional[str] = None, db: Session = Depends(get_db)) -> list[models.Source]:
    query = db.query(models.Source)
    if project_id:
        query = query.filter(models.Source.project_id == project_id)
    return query.order_by(models.Source.created_at.desc()).all()


@router.post("/", response_model=schemas.Source, status_code=201)
async def upload_source(
    project_id: str = Form(...),
    file: UploadFile = File(...),
    kind: str = Form("document"),
    title: Optional[str] = Form(None),
    tags: Optional[str] = Form(None),
    db: Session = Depends(get_db),
) -> models.Source:
    project = db.get(models.Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    source_id = str(uuid.uuid4())
    destination_name = f"{source_id}{Path(file.filename).suffix}"
    file_path = UPLOAD_DIR / destination_name

    raw_bytes = await file.read()
    file_path.write_bytes(raw_bytes)

    try:
        extracted_text = extract_text_from_upload(file.filename, raw_bytes)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    text_filename = f"{source_id}.txt"
    text_path = UPLOAD_DIR / text_filename
    text_path.write_text(extracted_text or "", encoding="utf-8")

    source = models.Source(
        id=source_id,
        project_id=project_id,
        kind=kind,
        uri=str(Path("data/uploads") / destination_name),
        title=title or file.filename,
        tags=_parse_tags(tags),
        content_ptr=str(Path("data/uploads") / text_filename),
    )
    db.add(source)
    db.commit()
    db.refresh(source)
    embedding_store.add_source(source)
    return source


@router.post("/import/obsidian", response_model=list[schemas.Source])
def import_obsidian(
    payload: schemas.ObsidianImportRequest,
    db: Session = Depends(get_db),
) -> list[models.Source]:
    project = db.get(models.Project, payload.project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    base_dir = Path(payload.base_path or (DATA_DIR / "obsidian"))
    import_dir = (base_dir / payload.folder).resolve()
    try:
        base_dir_resolved = base_dir.resolve()
    except FileNotFoundError:
        base_dir.mkdir(parents=True, exist_ok=True)
        base_dir_resolved = base_dir.resolve()
    if import_dir != base_dir_resolved and base_dir_resolved not in import_dir.parents:
        raise HTTPException(status_code=400, detail="Import folder must live within the configured Obsidian root")
    if not import_dir.is_dir():
        raise HTTPException(status_code=400, detail="Folder not found for Obsidian import")
    limit = payload.limit or 100
    imported: list[models.Source] = []

    existing_uris = {
        src.uri for src in db.query(models.Source).filter(models.Source.project_id == payload.project_id).all()
    }

    for path in sorted(import_dir.rglob("*.md"))[:limit]:
        relative_uri = str(Path("obsidian") / path.relative_to(base_dir))
        if relative_uri in existing_uris:
            continue
        source_id = str(uuid.uuid4())
        destination_name = f"{source_id}{path.suffix}"
        dest_path = UPLOAD_DIR / destination_name
        dest_path.write_bytes(path.read_bytes())
        text_filename = f"{source_id}.txt"
        text_path = UPLOAD_DIR / text_filename
        text_path.write_text(path.read_text(encoding="utf-8", errors="ignore"), encoding="utf-8")

        source = models.Source(
            id=source_id,
            project_id=payload.project_id,
            kind="obsidian",
            uri=relative_uri,
            title=path.stem,
            tags=[],
            content_ptr=str(Path("data/uploads") / text_filename),
        )
        db.add(source)
        imported.append(source)

    db.commit()

    for src in imported:
        db.refresh(src)
        embedding_store.add_source(src)

    return imported


@router.patch("/{source_id}", response_model=schemas.Source)
def update_source(source_id: str, payload: schemas.SourceUpdate, db: Session = Depends(get_db)) -> models.Source:
    source = db.get(models.Source, source_id)
    if not source:
        raise HTTPException(status_code=404, detail="Source not found")
    update_data = payload.dict(exclude_unset=True)
    if "tags" in update_data and not update_data["tags"]:
        update_data["tags"] = []
    for key, value in update_data.items():
        setattr(source, key, value)
    db.add(source)
    db.commit()
    db.refresh(source)
    embedding_store.add_source(source)
    return source


@router.delete("/{source_id}", status_code=204)
def delete_source(source_id: str, db: Session = Depends(get_db)) -> None:
    source = db.get(models.Source, source_id)
    if not source:
        raise HTTPException(status_code=404, detail="Source not found")
    if source.uri:
        file_path = Path(DATA_DIR.parent, source.uri)
        if file_path.exists():
            file_path.unlink(missing_ok=True)
    if source.content_ptr:
        text_path = Path(DATA_DIR.parent, source.content_ptr)
        if text_path.exists():
            text_path.unlink(missing_ok=True)
    db.delete(source)
    db.commit()
