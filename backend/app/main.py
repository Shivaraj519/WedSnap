import logging
from datetime import datetime, date
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from app.config import settings
from app.database.session import Base, engine, get_db
from app.models.models import Wedding
from app.api import api_router
from app.websocket.manager import ws_manager
from app.security.tokens import hash_password

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("wedsnap.main")

# Initialize database schema
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.PROJECT_VERSION,
    description="WedSnap - Real-time AI-powered wedding photography distribution platform."
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount REST API
app.include_router(api_router, prefix=settings.API_V1_STR)

@app.on_event("startup")
def startup_seed_demo():
    """Ensure a demonstration wedding exists on first launch for seamless testing."""
    db = next(get_db())
    try:
        existing = db.query(Wedding).filter(Wedding.slug == "sophia-alexander").first()
        if not existing:
            demo_wedding = Wedding(
                id="wds-demo-wedding-001",
                slug="sophia-alexander",
                bride_name="Sophia",
                groom_name="Alexander",
                wedding_date=date(2026, 11, 28),
                venue="Villa d'Este, Lake Como",
                welcome_message="Welcome to our wedding! Every candid moment captured by our photographers is streamed directly here in real-time. Scan or browse below to find your photos.",
                gallery_status="active",
                face_search_enabled=True,
                allow_original_downloads=True,
                admin_password_hash=hash_password("wedding2026")
            )
            db.add(demo_wedding)
            db.commit()
            logger.info("Demo wedding 'sophia-alexander' initialized (admin passcode: wedding2026)")
    except Exception as e:
        logger.error(f"Startup check failed: {e}")
    finally:
        db.close()

@app.get("/api/health", tags=["Health"])
def health_check():
    """Production health check endpoint."""
    return {
        "status": "healthy",
        "service": "WedSnap API",
        "version": settings.PROJECT_VERSION,
        "environment": settings.ENVIRONMENT,
        "timestamp": datetime.utcnow().isoformat(),
        "storage_mode": "cloud" if settings.SUPABASE_URL else "local_resilient",
        "realtime": "enabled"
    }

@app.websocket("/ws/live/{wedding_id_or_slug}")
async def websocket_live_gallery(websocket: WebSocket, wedding_id_or_slug: str):
    """
    WebSocket endpoint for real-time live gallery updates.
    Broadcasts new uploads and deletions to connected guests.
    """
    db = next(get_db())
    try:
        wedding = db.query(Wedding).filter(
            (Wedding.id == wedding_id_or_slug) | (Wedding.slug == wedding_id_or_slug)
        ).first()
        if not wedding:
            await websocket.close(code=1008, reason="Wedding not found")
            return
        wedding_id = wedding.id
    finally:
        db.close()

    await ws_manager.connect(wedding_id, websocket)
    try:
        while True:
            # Keep-alive heartbeat & ping receiver
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text('{"type": "pong"}')
    except WebSocketDisconnect:
        ws_manager.disconnect(wedding_id, websocket)
    except Exception as e:
        logger.warning(f"WebSocket session error: {e}")
        ws_manager.disconnect(wedding_id, websocket)
