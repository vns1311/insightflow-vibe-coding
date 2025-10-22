from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from .database import engine
from . import models
from .routers import api_router
from .bootstrap import ensure_demo_data
from .services.embedding_store import embedding_store

models.Base.metadata.create_all(bind=engine)

with Session(engine) as session:
    sources = session.query(models.Source).all()
    embedding_store.rebuild(sources)

app = FastAPI(title="InsightFlow API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router)


@app.get("/healthz")
def healthcheck() -> dict[str, str]:
    return {"status": "ok"}
