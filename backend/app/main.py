"""
Main App — FastAPI entry point cho E-Learning English Tutor API

Khởi tạo app với:
- Lifespan: init database khi startup
- CORS middleware cho frontend
- Session middleware cho authlib (Google OAuth)
- Include tất cả routers
- Serve frontend static files (production)
"""
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from starlette.middleware.sessions import SessionMiddleware

from app.config import get_settings
from app.database import init_db

settings = get_settings()


# ── Lifespan: chạy khi app start/stop ────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Tạo tables khi app khởi động."""
    await init_db()
    yield


# ── Khởi tạo FastAPI app ─────────────────────────────────────────────

app = FastAPI(
    title="E-Learning English Tutor API",
    description=(
        "Backend API cho nền tảng học tiếng Anh với AI tutor (Google Gemini). "
        "Hỗ trợ quản lý từ vựng, flashcard ôn tập (SM-2), "
        "chat với AI tutor, grammar checker, và shared calendar."
    ),
    version="2.0.0",
    lifespan=lifespan,
)


# ── Middleware ────────────────────────────────────────────────────────

app.add_middleware(
    SessionMiddleware,
    secret_key=settings.SECRET_KEY,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        settings.FRONTEND_URL,
        "http://localhost:5173",
        "http://localhost:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Include Routers ──────────────────────────────────────────────────

from app.routers import auth, vocabulary, flashcard, chat, grammar, calendar, stats  # noqa: E402

app.include_router(auth.router)
app.include_router(vocabulary.router)
app.include_router(flashcard.router)
app.include_router(chat.router)
app.include_router(grammar.router)
app.include_router(calendar.router)
app.include_router(stats.router)


# ── Health Check ─────────────────────────────────────────────────────

@app.get("/api/health", tags=["Health"])
async def health_check():
    """Endpoint kiểm tra server đang hoạt động."""
    return {
        "status": "healthy",
        "app": "E-Learning English Tutor API",
        "version": "2.0.0",
        "ai_provider": "Google Gemini",
    }


# ── Serve Frontend Static (Production) ───────────────────────────────

static_dir = Path(__file__).parent.parent / "static"
if static_dir.exists():
    app.mount("/", StaticFiles(directory=str(static_dir), html=True), name="static")
