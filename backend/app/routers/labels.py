from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from app import db as db_conn
from app.config import settings
from app.deps.auth import AuthContext, get_auth_context

router = APIRouter(prefix="/v1/labels", tags=["labels"])

_VALID_LABELS = {"transit", "flare", "noise", "artifact", "multi_planet"}

_RANK_THRESHOLDS: list[tuple[int, str]] = [
    (25000, "Architect"),
    (8000,  "ModelAuditor"),
    (2000,  "Validator"),
    (500,   "Classifier"),
    (0,     "Observer"),
]

_PRIORITY_ORDER = ("boss", "beat_model", "standard", "warmup")


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


def _rank_for_score(score: int) -> str:
    for threshold, rank in _RANK_THRESHOLDS:
        if score >= threshold:
            return rank
    return "Observer"


async def _ensure_player_stats(conn, user_id: str) -> dict:
    row = await conn.fetchrow(
        "SELECT * FROM player_stats WHERE user_id = $1", user_id
    )
    if row is None:
        row = await conn.fetchrow(
            """
            INSERT INTO player_stats (user_id)
            VALUES ($1)
            ON CONFLICT (user_id) DO UPDATE SET updated_at = now()
            RETURNING *;
            """,
            user_id,
        )
    return dict(row)


class SubmitLabelRequest(BaseModel):
    queue_item_id: str
    label: str
    confidence: float = Field(ge=0.0, le=1.0)


class OnboardingCompleteRequest(BaseModel):
    correct_count: int = Field(ge=0, le=5)


@router.get("/queue/next")
async def queue_next(
    auth: Annotated[AuthContext, Depends(get_auth_context)],
) -> dict:
    pool = _require_db_pool()
    async with pool.acquire() as conn:
        stats = await _ensure_player_stats(conn, auth.user_id)

        if not stats["onboarding_done"]:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="onboarding_not_done",
            )

        row = None
        for curve_type in _PRIORITY_ORDER:
            row = await conn.fetchrow(
                """
                SELECT lq.id::text AS id, lq.gaia_source_id::text AS gaia_source_id,
                       lq.curve_data_json, lq.curve_type, lq.rarity_multiplier
                FROM label_queue lq
                WHERE lq.curve_type = $1
                  AND NOT EXISTS (
                    SELECT 1 FROM labels l
                    WHERE l.queue_item_id = lq.id AND l.user_id = $2
                  )
                ORDER BY lq.created_at
                LIMIT 1;
                """,
                curve_type,
                auth.user_id,
            )
            if row is not None:
                break

    if row is None:
        return {"available": False}

    return {
        "available": True,
        "id": row["id"],
        "gaia_source_id": row["gaia_source_id"],
        "curve_data_json": row["curve_data_json"],
        "curve_type": row["curve_type"],
        "rarity_multiplier": float(row["rarity_multiplier"]),
    }


@router.post("/submit")
async def submit_label(
    body: SubmitLabelRequest,
    auth: Annotated[AuthContext, Depends(get_auth_context)],
) -> dict:
    if body.label not in _VALID_LABELS:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"label must be one of {sorted(_VALID_LABELS)}",
        )

    pool = _require_db_pool()
    async with pool.acquire() as conn:
        queue_row = await conn.fetchrow(
            "SELECT rarity_multiplier, label_count FROM label_queue WHERE id = $1::uuid",
            body.queue_item_id,
        )
        if queue_row is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="queue item not found")

        rarity = float(queue_row["rarity_multiplier"])
        score_awarded = int(100 * rarity)

        await conn.execute(
            """
            INSERT INTO labels (user_id, queue_item_id, label, confidence, score_awarded)
            VALUES ($1, $2::uuid, $3, $4, $5)
            ON CONFLICT (user_id, queue_item_id) DO NOTHING;
            """,
            auth.user_id,
            body.queue_item_id,
            body.label,
            body.confidence,
            score_awarded,
        )

        new_label_count = queue_row["label_count"] + 1
        consensus = None
        if new_label_count >= 3:
            consensus_row = await conn.fetchrow(
                """
                SELECT label, COUNT(*) AS cnt
                FROM labels WHERE queue_item_id = $1::uuid
                GROUP BY label ORDER BY cnt DESC LIMIT 1;
                """,
                body.queue_item_id,
            )
            if consensus_row and consensus_row["cnt"] >= 3:
                consensus = consensus_row["label"]

        await conn.execute(
            """
            UPDATE label_queue
            SET label_count = $1,
                consensus_label = COALESCE($2, consensus_label)
            WHERE id = $3::uuid;
            """,
            new_label_count,
            consensus,
            body.queue_item_id,
        )

        stats = await _ensure_player_stats(conn, auth.user_id)
        new_total = stats["total_score"] + score_awarded
        new_submitted = stats["labels_submitted"] + 1
        new_rank = _rank_for_score(new_total)

        await conn.execute(
            """
            UPDATE player_stats
            SET total_score = $1, labels_submitted = $2, rank_name = $3
            WHERE user_id = $4;
            """,
            new_total,
            new_submitted,
            new_rank,
            auth.user_id,
        )

    return {
        "score_awarded": score_awarded,
        "new_total": new_total,
        "rank_name": new_rank,
    }


@router.get("/my-stats")
async def my_stats(
    auth: Annotated[AuthContext, Depends(get_auth_context)],
) -> dict:
    pool = _require_db_pool()
    async with pool.acquire() as conn:
        stats = await _ensure_player_stats(conn, auth.user_id)
    return stats


@router.post("/onboarding-complete")
async def onboarding_complete(
    body: OnboardingCompleteRequest,
    auth: Annotated[AuthContext, Depends(get_auth_context)],
) -> dict:
    accuracy = body.correct_count / 5.0
    pool = _require_db_pool()
    async with pool.acquire() as conn:
        stats = await _ensure_player_stats(conn, auth.user_id)
        await conn.execute(
            """
            UPDATE player_stats
            SET onboarding_done = true, accuracy_rating = $1
            WHERE user_id = $2;
            """,
            accuracy,
            auth.user_id,
        )
        stats["onboarding_done"] = True
        stats["accuracy_rating"] = accuracy
    return stats
