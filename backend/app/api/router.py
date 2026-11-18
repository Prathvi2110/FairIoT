from fastapi import APIRouter

from app.api import analyses, auth, dashboard, datasets, reports

api_router = APIRouter(prefix="/api")
api_router.include_router(auth.router)
api_router.include_router(datasets.router)
api_router.include_router(analyses.router)
api_router.include_router(dashboard.router)
api_router.include_router(reports.router)
