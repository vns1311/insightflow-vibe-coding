from fastapi import APIRouter

from . import claims, decisions, digest, export, insight_runs, projects, sources, tasks, themes

api_router = APIRouter()
api_router.include_router(projects.router, prefix="/projects", tags=["projects"])
api_router.include_router(sources.router, prefix="/sources", tags=["sources"])
api_router.include_router(insight_runs.router, prefix="/insight-runs", tags=["insight_runs"])
api_router.include_router(themes.router, prefix="/themes", tags=["themes"])
api_router.include_router(claims.router, prefix="/claims", tags=["claims"])
api_router.include_router(decisions.router, prefix="/decisions", tags=["decisions"])
api_router.include_router(tasks.router, prefix="/tasks", tags=["tasks"])
api_router.include_router(export.router, prefix="/export", tags=["export"])
api_router.include_router(digest.router, prefix="/digest", tags=["digest"])
