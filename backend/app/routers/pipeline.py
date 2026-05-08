import asyncio
import json
import logging
from typing import Annotated

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, status
from pydantic import BaseModel

from app import db as db_conn
from app.config import settings
from app.deps.auth import get_clerk_user_id

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/v1/pipeline", tags=["pipeline"])


def _require_db_pool():
    if not settings.database_url:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="DATABASE_URL is not configured on the API server",
        )
    try:
        return db_conn.require_pool()
    except RuntimeError as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(e),
        ) from e


class QueueRequest(BaseModel):
    gaia_source_id: str
    ra: float
    dec: float


def _fetch_and_detrend(gaia_source_id: int, ra: float, dec: float) -> dict:
    """Blocking: lightkurve search + download + wotan detrend. Runs in thread pool."""
    import lightkurve as lk  # type: ignore[import-untyped]
    from wotan import flatten  # type: ignore[import-untyped]
    import numpy as np  # type: ignore[import-untyped]

    search = lk.search_lightcurve(
        f"TIC {gaia_source_id}",
        mission="TESS",
        author="SPOC",
        exptime=120,
    )
    if len(search) == 0:
        return {"available": False, "gaia_source_id": str(gaia_source_id)}

    lc = search[0].download()
    if lc is None:
        return {"available": False, "gaia_source_id": str(gaia_source_id)}

    lc = lc.remove_nans().normalize()
    time_arr = lc.time.value
    flux_arr = lc.flux.value

    flat_flux, _ = flatten(time_arr, flux_arr, method="biweight", window_length=0.75)

    sector = int(search[0].mission[0].split()[-1]) if search[0].mission else 0
    points = [
        {"t": float(t), "f": float(f)}
        for t, f in zip(time_arr, flat_flux)
        if np.isfinite(f)
    ]

    return {
        "available": True,
        "gaia_source_id": str(gaia_source_id),
        "sector": sector,
        "points": points,
    }


async def _pipeline_background(gaia_source_id_str: str, ra: float, dec: float) -> None:
    pool = db_conn.require_pool()
    gaia_int = int(gaia_source_id_str)

    try:
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(None, _fetch_and_detrend, gaia_int, ra, dec)

        if not result.get("available"):
            curve_type = "unavailable"
            curve_json = json.dumps({"points": []})
            sector = None
        else:
            curve_type = "standard"
            curve_json = json.dumps({"points": result["points"]})
            sector = result.get("sector")

        async with pool.acquire() as conn:
            await conn.execute(
                """
                INSERT INTO label_queue
                  (gaia_source_id, tess_sector, curve_data_json, curve_type, rarity_multiplier)
                VALUES ($1, $2, $3::jsonb, $4, $5)
                ON CONFLICT DO NOTHING;
                """,
                gaia_int,
                sector,
                curve_json,
                curve_type,
                1.0,
            )
    except Exception:
        logger.exception("Pipeline background task failed for source_id=%s", gaia_source_id_str)
        try:
            async with pool.acquire() as conn:
                await conn.execute(
                    """
                    INSERT INTO label_queue
                      (gaia_source_id, curve_data_json, curve_type, rarity_multiplier)
                    VALUES ($1, $2::jsonb, 'unavailable', 1.0)
                    ON CONFLICT DO NOTHING;
                    """,
                    gaia_int,
                    json.dumps({"points": []}),
                )
        except Exception:
            logger.exception("Failed to insert unavailable row for source_id=%s", gaia_source_id_str)


@router.post("/queue")
async def queue_pipeline(
    body: QueueRequest,
    background_tasks: BackgroundTasks,
    _user_id: Annotated[str, Depends(get_clerk_user_id)],
) -> dict:
    _require_db_pool()
    background_tasks.add_task(
        _pipeline_background,
        body.gaia_source_id,
        body.ra,
        body.dec,
    )
    return {"status": "queued", "gaia_source_id": body.gaia_source_id}


@router.get("/status")
async def pipeline_status(
    gaia_source_id: str = Query(...),
    _user_id: Annotated[str, Depends(get_clerk_user_id)] = None,  # type: ignore[assignment]
) -> dict:
    pool = _require_db_pool()
    try:
        gaia_int = int(gaia_source_id)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="gaia_source_id must be an integer string",
        ) from exc

    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            """
            SELECT id::text AS queue_item_id
            FROM label_queue
            WHERE gaia_source_id = $1
              AND curve_type != 'unavailable'
            ORDER BY created_at DESC
            LIMIT 1;
            """,
            gaia_int,
        )

    if row is None:
        return {"ready": False, "queue_item_id": None}
    return {"ready": True, "queue_item_id": row["queue_item_id"]}
