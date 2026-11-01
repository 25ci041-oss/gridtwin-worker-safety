"""GRIDTWIN Backend - Database Configuration"""
import logging
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from app.core.config import settings

logger = logging.getLogger("gridtwin.db")

db_url = settings.database_url
try:
    if "asyncpg" in db_url:
        import asyncpg  # Verify driver exists before engine initialization
    engine = create_async_engine(
        db_url,
        echo=settings.debug,
        pool_pre_ping=True,
    )
except (ImportError, Exception) as err:
    logger.warning("PostgreSQL driver/connection unavailable (%s). Falling back to local SQLite database (sqlite+aiosqlite:///./gridtwin.db)", err)
    engine = create_async_engine(
        "sqlite+aiosqlite:///./gridtwin.db",
        echo=False,
    )

async_session_factory = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


class Base(DeclarativeBase):
    """Base class for all database models."""
    pass


async def get_db() -> AsyncSession:
    """Dependency that yields database sessions."""
    async with async_session_factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def init_db():
    """Initialize database tables."""
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
    except Exception as e:
        logger.warning("Database schema init skipped or deferred: %s", e)
