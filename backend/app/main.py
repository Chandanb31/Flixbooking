"""FlixBooking API — start with:  uvicorn app.main:app --reload"""
import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.core.config import get_settings
from app.db import tx
from app.routers import auth, bookings, catalog, shows

log = logging.getLogger("flixbooking")


def _housekeeping(refresh_schedule: bool) -> None:
    with tx() as conn:
        conn.execute(text("SELECT release_expired_holds()"))
        if refresh_schedule:
            created = conn.execute(text("SELECT refresh_shows(7)")).scalar()
            if created:
                log.info("Scheduled %s new shows", created)


async def background_jobs() -> None:
    """Every minute: free expired seat holds. Every hour: keep 7 days of shows scheduled."""
    minute = 0
    while True:
        try:
            await asyncio.to_thread(_housekeeping, minute % 60 == 0)
        except Exception:  # never let the loop die
            log.exception("Background job failed")
        minute += 1
        await asyncio.sleep(60)


@asynccontextmanager
async def lifespan(app: FastAPI):
    task = asyncio.create_task(background_jobs())
    yield
    task.cancel()


settings = get_settings()
app = FastAPI(
    title=settings.app_name,
    version="1.0.0",
    description="Movie ticket booking API — seats, showtimes, holds, payments and refunds.",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

for r in (auth.router, catalog.router, shows.router, bookings.router):
    app.include_router(r, prefix="/api")


@app.get("/api/health", tags=["Health"])
def health():
    with tx() as conn:
        conn.execute(text("SELECT 1"))
    return {"status": "ok", "database": "connected"}
