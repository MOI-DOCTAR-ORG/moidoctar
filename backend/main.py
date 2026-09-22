import os
import sys

_BACKEND_DIR = os.path.dirname(__file__)

# Ensure backend directory is in sys.path
sys.path.insert(0, _BACKEND_DIR)
# Ensure the AI package (backend/ai) is importable as `moi_doctar_ai`
sys.path.insert(0, os.path.join(_BACKEND_DIR, "ai"))

from app.main import app

__all__ = ["app"]

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port)
