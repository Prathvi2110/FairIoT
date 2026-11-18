from pathlib import Path
import logging
from time import perf_counter

from fastapi import FastAPI, Request
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy import text

from app.api.router import api_router
from app.database.session import Base, engine
from app.models import entities  # noqa: F401 — registers SQLAlchemy models before create_all

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")
logger = logging.getLogger("fairiot")
app = FastAPI(
    title="FairIoT API",
    description="Explainable, user-scoped IoT hardware fairness analysis.",
    version="1.0.0",
    docs_url="/api/docs",
    openapi_url="/api/openapi.json",
)
app.include_router(api_router)


@app.middleware("http")
async def request_logging(request: Request, call_next):
    started = perf_counter()
    try:
        response = await call_next(request)
    except Exception:
        logger.exception("request failed method=%s path=%s", request.method, request.url.path)
        raise
    elapsed_ms = (perf_counter() - started) * 1000
    logger.info("request method=%s path=%s status=%d elapsed_ms=%.1f", request.method, request.url.path, response.status_code, elapsed_ms)
    return response


@app.on_event("startup")
def initialize_database() -> None:
    Base.metadata.create_all(bind=engine)
    logger.info("FairIoT database tables are ready.")


@app.get("/api/health", tags=["system"])
def health() -> dict[str, str]:
    with engine.connect() as connection:
        connection.execute(text("SELECT 1"))
    return {"status": "ok", "database": "connected"}


STATIC_DIR = Path(__file__).resolve().parent / "static"
if STATIC_DIR.is_dir():
    ASSETS_DIR = STATIC_DIR / "assets"
    if ASSETS_DIR.is_dir():
        app.mount("/assets", StaticFiles(directory=ASSETS_DIR), name="assets")

    @app.get("/manus-routes.json", include_in_schema=False)
    def routes_manifest():
        manifest = STATIC_DIR / "manus-routes.json"
        if not manifest.is_file():
            return JSONResponse(status_code=404, content={"detail": "Not found"})
        return FileResponse(manifest, media_type="application/json")

    @app.get("/{path:path}", include_in_schema=False)
    def spa_fallback(path: str, request: Request):
        if path.startswith(("api/", "manus-storage/", "__system__/")):
            return JSONResponse(status_code=404, content={"detail": "Not found"})
        static_root = STATIC_DIR.resolve()
        candidate = (static_root / path).resolve()
        if static_root in candidate.parents and candidate.is_file():
            return FileResponse(candidate)
        index = STATIC_DIR / "index.html"
        return FileResponse(index)
