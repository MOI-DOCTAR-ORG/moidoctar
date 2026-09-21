import logging
from typing import Optional, Any
from app.core.config import settings

logger = logging.getLogger("moidoctar.supabase")

_supabase_client: Optional[Any] = None


def get_supabase_client():
    global _supabase_client
    if _supabase_client is not None:
        return _supabase_client

    url = settings.normalized_supabase_url
    key = (settings.SUPABASE_KEY or "").strip()

    if (
        not url
        or "your-project.supabase.co" in url
        or not key
        or "your-supabase" in key
    ):
        logger.warning(
            "Supabase credentials not configured in backend/.env. "
            "Backend will use local in-memory storage fallback until credentials are provided."
        )
        return None

    try:
        from supabase import create_client
        _supabase_client = create_client(url, key)
        logger.info(f"Successfully connected to Supabase ({url}).")
        return _supabase_client
    except Exception as e:
        logger.error(f"Failed to initialize Supabase client: {e}. Falling back to local storage.")
        return None


def safe_supabase_rows(res: Any) -> list:
    """
    Safely extract list of row dicts from a Supabase PostgREST response.
    Guards against HTML 404/500 strings (e.g. if SUPABASE_URL was misconfigured).
    """
    if res is None:
        return []
    data = getattr(res, "data", None)
    if isinstance(data, list):
        return [r for r in data if isinstance(r, dict)]
    return []
