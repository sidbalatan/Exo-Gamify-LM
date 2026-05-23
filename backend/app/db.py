import asyncpg

from app.config import settings

_pool: asyncpg.Pool | None = None


async def init_pool() -> None:
    global _pool
    url = settings.database_url
    if not url:
        return
    if _pool is not None:
        return
    _pool = await asyncpg.create_pool(dsn=url, min_size=1, max_size=10)


async def close_pool() -> None:
    global _pool
    if _pool is None:
        return
    await _pool.close()
    _pool = None


def require_pool() -> asyncpg.Pool:
    if _pool is None:
        raise RuntimeError("database pool unavailable (set DATABASE_URL)")
    return _pool
