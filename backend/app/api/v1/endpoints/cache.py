from fastapi import APIRouter
from app.schemas.triage import CacheStats, CacheClearResponse
from app.services.triage_service import get_cache_stats, clear_cache

router = APIRouter()


@router.get("/stats", response_model=CacheStats)
def get_stats():
    return get_cache_stats()


@router.post("/clear", response_model=CacheClearResponse)
def empty_cache():
    return clear_cache()
