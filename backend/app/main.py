from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app import db as db_conn
from app.config import settings
from app.routers import workspace


@asynccontextmanager
async def lifespan(_app: FastAPI):
    await db_conn.init_pool()
    try:
        yield
    finally:
        await db_conn.close_pool()


app = FastAPI(title="XQuest API", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(workspace.router)


@app.get("/healthz")
async def healthz() -> dict:
    return {"status": "ok"}
