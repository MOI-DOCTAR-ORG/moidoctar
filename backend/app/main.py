import asyncio
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


async def _forward_stream(reader: asyncio.StreamReader, writer: asyncio.StreamWriter):
    try:
        while True:
            data = await reader.read(8192)
            if not data:
                break
            writer.write(data)
            await writer.drain()
    except Exception:
        pass
    finally:
        try:
            writer.close()
            await writer.wait_closed()
        except Exception:
            pass


async def _proxy_connection(local_reader: asyncio.StreamReader, local_writer: asyncio.StreamWriter, target_port: int):
    try:
        remote_reader, remote_writer = await asyncio.open_connection("127.0.0.1", target_port)
        await asyncio.gather(
            _forward_stream(local_reader, remote_writer),
            _forward_stream(remote_reader, local_writer),
            return_exceptions=True,
        )
    except Exception:
        pass
    finally:
        try:
            local_writer.close()
            await local_writer.wait_closed()
        except Exception:
            pass


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Initializing MoiDoctar FastAPI backend...")
    get_supabase_client()

    # Dual-port bridge: ensure both port 3000 and port 8000 respond,
    # regardless of which port uvicorn is running on or which port Pxxl/platform probes.
    aux_servers = []
    current_port = int(os.environ.get("PORT", 3000))
    for p in (3000, 8000):
        if p != current_port:
            try:
                server = await asyncio.start_server(
                    lambda r, w, tp=current_port: _proxy_connection(r, w, tp),
                    "0.0.0.0",
                    p,
                )
                aux_servers.append(server)
                logger.info(f"Dual-port listener active on port {p} -> forwarding to active port {current_port}")
            except Exception as e:
                logger.debug(f"Could not bind aux port {p}: {e}")

    yield

    for s in aux_servers:
        s.close()
        await s.wait_closed()
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
