from fastapi import APIRouter
from app.api.auth import router as auth_router
from app.api.weddings import router as weddings_router
from app.api.devices import router as devices_router
from app.api.photos import router as photos_router
from app.api.face_search import router as face_search_router
from app.api.qr import router as qr_router
from app.api.analytics import router as analytics_router

api_router = APIRouter()
api_router.include_router(auth_router)
api_router.include_router(weddings_router)
api_router.include_router(devices_router)
api_router.include_router(photos_router)
api_router.include_router(face_search_router)
api_router.include_router(qr_router)
api_router.include_router(analytics_router)

__all__ = ["api_router"]
