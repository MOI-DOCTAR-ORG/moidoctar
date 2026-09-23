import logging
import os
import sys
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings

# Make the AI package (backend/ai/moi_doctar_ai) importable regardless of how
# the app was launched (uvicorn main:app, uvicorn app.main:app, tests, etc.)
_AI_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "ai")
if _AI_DIR not in sys.path:
    sys.path.insert(0, _AI_DIR)
from app.core.supabase import get_supabase_client
from app.api.v1.api import api_router

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("moidoctar")


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Initializing MoiDoctar FastAPI backend...")
    get_supabase_client()
    yield
    logger.info("Shutting down MoiDoctar FastAPI backend.")


app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# Configure CORS for frontend access
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_origin_regex=r"^https?://.*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API v1 router
app.include_router(api_router, prefix=settings.API_V1_STR)


@app.exception_handler(Exception)
async def global_exception_handler(request, exc: Exception):
    import traceback
    tb = traceback.format_exc()
    logger.error(f"Unhandled error on {request.method} {request.url}: {exc}\n{tb}")
    from fastapi.responses import JSONResponse
    return JSONResponse(
        status_code=500,
        content={"detail": {"err": "server_error", "msg": str(exc), "traceback": tb}},
    )


@app.get("/health", tags=["Health"])
def health_check():
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "api_version": "v1",
    }


@app.get("/", tags=["Health"])
def root():
    return {
        "message": f"Welcome to {settings.PROJECT_NAME}",
        "docs_url": "/docs",
        "api_version": settings.API_V1_STR,
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
