"""
Database engine & session factory — SQLAlchemy async setup
Hỗ trợ cả SQLite (dev) và PostgreSQL (production)
"""
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import DeclarativeBase
from app.config import get_settings

settings = get_settings()

# Xác định connect_args phù hợp với loại database
connect_args = {}
if "sqlite" in settings.DATABASE_URL:
    connect_args = {"check_same_thread": False}

engine = create_async_engine(
    settings.DATABASE_URL,
    echo=False,
    connect_args=connect_args,
)

AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


class Base(DeclarativeBase):
    """Base class cho tất cả ORM models"""
    pass


async def get_db():
    """Dependency injection cho database session"""
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def init_db():
    """Tạo tất cả tables khi khởi động app"""
    async with engine.begin() as conn:
        from app.models import user, vocabulary, flashcard, chat  # noqa: F401
        from app.models import calendar  # noqa: F401
        await conn.run_sync(Base.metadata.create_all)
