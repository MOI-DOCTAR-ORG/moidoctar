import logging
from typing import Optional, Any
from app.core.config import settings

logger = logging.getLogger("moidoctar.supabase")

_supabase_client: Optional[Any] = None


def get_supabase_client():
    global _supabase_client
    if _supabase_client is not None:
        return _supabase_client

    if (
        not settings.SUPABASE_URL
        or "your-project.supabase.co" in settings.SUPABASE_URL
        or not settings.SUPABASE_KEY
        or "your-supabase" in settings.SUPABASE_KEY
    ):
        logger.warning(
            "Supabase credentials not configured in backend/.env. "
            "Backend will use local in-memory storage fallback until credentials are provided."
        )
        return None

    try:
        from supabase import create_client
        _supabase_client = create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)
        logger.info("Successfully connected to Supabase.")
        return _supabase_client
    except Exception as e:
        logger.error(f"Failed to initialize Supabase client: {e}. Falling back to local storage.")
        return None
