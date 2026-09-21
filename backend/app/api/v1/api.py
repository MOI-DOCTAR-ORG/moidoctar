from fastapi import APIRouter
from app.api.v1.endpoints import (
    auth,
    user,
    medication,
    symptom,
    triage,
    cache,
    admin,
)

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(user.router, prefix="/user", tags=["User Profile"])
api_router.include_router(medication.router, prefix="/medication", tags=["Medications"])
api_router.include_router(symptom.router, prefix="/symptom", tags=["Symptoms"])
api_router.include_router(triage.router, prefix="/triage", tags=["Triage"])
api_router.include_router(cache.router, prefix="/cache", tags=["Cache Management"])
api_router.include_router(admin.router, prefix="/admin", tags=["Admin"])
