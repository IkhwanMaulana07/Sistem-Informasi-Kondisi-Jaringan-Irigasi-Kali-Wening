import threading
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.state import app_state
from app.db.session import engine, SessionLocal
from app.api.endpoints import router as api_router
from app.ingestion.pipeline import run_initial_import
from app.models.models import Asset

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("api.main")


def background_import_task():
    """Runs the initial import pipeline in a background thread upon startup."""
    logger.info("Starting initial import background task...")
    db = SessionLocal()
    try:
        # Check if assets table already has data
        existing_count = db.query(Asset).count()
        if existing_count > 0:
            logger.info(f"Database already populated with {existing_count} assets. Setting state to 'siap'.")
            app_state.status = "siap"
        else:
            logger.info("Database is empty. Initiating initial data ingestion...")
            run_initial_import(db)
    except Exception as e:
        logger.error(f"Initial import background task encountered error: {e}", exc_info=True)
        # Attempt to run initial import anyway
        try:
            run_initial_import(db)
        except Exception as ex:
            logger.error(f"Retry initial import failed: {ex}")
            app_state.status = "gagal"
            app_state.last_error = str(ex)
    finally:
        db.close()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: spawn initial import thread
    import_thread = threading.Thread(target=background_import_task, daemon=True)
    import_thread.start()
    yield
    # Shutdown
    logger.info("Application shutting down.")


app = FastAPI(
    title="DI Kali Wening Irrigation Network Condition API",
    version=settings.API_CONTRACT_VERSION,
    description="REST API kondisi aset, dampak hilir, rekap, prioritas, kualitas data, dan impor susulan.",
    openapi_url="/api/openapi.json",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Custom Error Handlers to strictly match API contract
# {"error": {"code": "...", "message": "..."}}
@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    detail = exc.detail
    if isinstance(detail, dict) and "code" in detail and "message" in detail:
        error_payload = detail
    else:
        code_map = {
            400: "BAD_REQUEST",
            404: "NOT_FOUND",
            409: "CONFLICT",
            500: "INTERNAL_SERVER_ERROR"
        }
        error_payload = {
            "code": code_map.get(exc.status_code, "ERROR"),
            "message": str(detail)
        }
    return JSONResponse(
        status_code=exc.status_code,
        content={"error": error_payload}
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    error_msgs = []
    for err in exc.errors():
        loc = " -> ".join(str(l) for l in err.get("loc", []))
        msg = err.get("msg", "")
        error_msgs.append(f"{loc}: {msg}")
    
    return JSONResponse(
        status_code=status.HTTP_400_BAD_REQUEST,
        content={
            "error": {
                "code": "BAD_REQUEST",
                "message": "; ".join(error_msgs)
            }
        }
    )


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": {
                "code": "INTERNAL_SERVER_ERROR",
                "message": "Terjadi kesalahan internal pada server"
            }
        }
    )

# Include all API routes under /api
app.include_router(api_router, prefix="/api")
