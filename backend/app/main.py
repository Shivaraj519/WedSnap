import logging
from datetime import datetime, date
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Depends
from fastapi.responses import HTMLResponse
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
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount REST API
app.include_router(api_router, prefix=settings.API_V1_STR)

@app.on_event("startup")
def startup_seed_demo():
    """Ensure Vinutha B.S. & Mayuresh C.Noola wedding exists for seamless live testing."""
    db = next(get_db())
    try:
        # 1. Update or create wedding with Vinutha B.S. and Mayuresh C.Noola
        wedding = db.query(Wedding).filter(Wedding.slug.in_(["vinutha-mayuresh", "sophia-alexander"])).first()
        if not wedding:
            wedding = Wedding(
                id="wds-demo-wedding-001",
                slug="vinutha-mayuresh",
                bride_name="Vinutha B.S.",
                groom_name="Mayuresh C.Noola",
                wedding_date=date(2026, 11, 28),
                venue="Palace Grounds, Bangalore",
                welcome_message="Welcome to our wedding celebration! Every precious candid moment captured by our photographers is streamed directly here in real-time. Scan or browse below to find your photos.",
                gallery_status="active",
                face_search_enabled=True,
                allow_original_downloads=True,
                admin_password_hash=hash_password("wedding2026")
            )
            db.add(wedding)
            db.commit()
            logger.info("Wedding 'vinutha-mayuresh' initialized (admin passcode: wedding2026)")
        else:
            wedding.bride_name = "Vinutha B.S."
            wedding.groom_name = "Mayuresh C.Noola"
            if not wedding.venue or "Villa d'Este" in wedding.venue:
                wedding.venue = "Palace Grounds, Bangalore"
            db.commit()
            logger.info("Wedding names updated to Vinutha B.S. & Mayuresh C.Noola")

        # 2. Seed and preserve default paired Android phone token
        from app.models.models import Device
        from app.security.tokens import hash_device_token
        default_token = "wds_zhV7WIuUlJhSEM8yTwLgzJprpYFNsBe61g8cMUTXuD8"
        token_hash = hash_device_token(default_token)
        dev = db.query(Device).filter(Device.api_token_hash == token_hash).first()
        if not dev:
            dev = Device(
                id="wds-default-android-phone",
                wedding_id=wedding.id,
                device_name="Photographer Android Phone",
                device_type="android_direct",
                api_token_hash=token_hash,
                authentication_status="active"
            )
            db.add(dev)
            db.commit()
            logger.info("Default photographer Android phone seeded with active token")
    except Exception as e:
        logger.error(f"Startup check failed: {e}")
    finally:
        db.close()

@app.get("/", response_class=HTMLResponse, tags=["Root"])
def root_info():
    """Root landing page with direct links to API docs and Frontend Gallery."""
    return f"""
    <!DOCTYPE html>
    <html>
      <head>
        <title>WedSnap API Service</title>
        <style>
          body {{ font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #FAF8F5; color: #232120; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }}
          .card {{ background: white; border: 1px solid #EFE7DE; padding: 40px; border-radius: 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.06); text-align: center; max-width: 520px; }}
          h1 {{ color: #C5A880; font-size: 28px; margin-bottom: 8px; letter-spacing: 2px; }}
          p {{ color: #686461; font-size: 14px; line-height: 1.6; }}
          .badge {{ display: inline-block; padding: 4px 12px; background: #E8F5E9; color: #2E7D32; border-radius: 20px; font-size: 12px; font-weight: 600; margin-bottom: 20px; }}
          .btn {{ display: block; margin: 10px 0; padding: 12px 20px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px; transition: 0.2s; }}
          .btn-primary {{ background: #C5A880; color: white; }}
          .btn-primary:hover {{ background: #B5966B; }}
          .btn-secondary {{ background: #F5EFEB; color: #232120; border: 1px solid #EFE7DE; }}
          .btn-secondary:hover {{ background: #EAE3D9; }}
        </style>
      </head>
      <body>
        <div class="card">
          <div class="badge">● WedSnap Cloud Backend Online</div>
          <h1>WEDSNAP API</h1>
          <p>Real-time AI-powered wedding photography distribution platform.</p>
          <a class="btn btn-primary" href="/docs">View Interactive API Documentation (/docs)</a>
          <a class="btn btn-secondary" href="http://localhost:5173/sophia-alexander" target="_blank">Open Live Wedding Guest Website (Port 5173)</a>
          <a class="btn btn-secondary" href="/api/health">System Health Check (/api/health)</a>
        </div>
      </body>
    </html>
    """

@app.get("/health", tags=["Health"])
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
