from typing import Any, Dict

from fastapi import APIRouter, Depends

from app.api.deps import require
from app.core.permissions import P_CACHE_CLEAR
from app.schemas.triage import CacheStats, CacheClearResponse
from app.services import audit_service
from app.services.triage_service import get_cache_stats, clear_cache

router = APIRouter()


# Both routes were previously unauthenticated: any anonymous caller could read
# cache statistics or wipe the triage cache outright.
@router.get("/stats", response_model=CacheStats)
def get_stats(user: Dict[str, Any] = Depends(require(P_CACHE_CLEAR))):
    return get_cache_stats()


@router.post("/clear", response_model=CacheClearResponse)
def empty_cache(user: Dict[str, Any] = Depends(require(P_CACHE_CLEAR))):
    result = clear_cache()
    audit_service.record(user, "cache.clear", detail={"result": str(result)})
    return result
