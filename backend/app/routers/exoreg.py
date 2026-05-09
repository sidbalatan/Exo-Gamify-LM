import csv
import io
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import Response

from app import db as db_conn
from app.config import settings
from app.deps.auth import AuthContext, get_auth_context
from app.schemas.exoreg import (
    ExoRegClassifyBody,
    ExoRegClassifyResponse,
    ExoRegTargetOut,
    PipelineReadyRowOut,
)

router = APIRouter(prefix="/v1/exoreg", tags=["exoreg"])


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


async def _upsert_target(
    conn,
    gaia_source_id: str,
    display_label: str | None,
    ra_deg: float | None,
    dec_deg: float | None,
) -> UUID:
    row = await conn.fetchrow(
        """
        INSERT INTO exoreg_target (gaia_source_id, display_label, ra_deg, dec_deg)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (gaia_source_id) DO UPDATE SET
          display_label = COALESCE(EXCLUDED.display_label, exoreg_target.display_label),
          ra_deg = COALESCE(EXCLUDED.ra_deg, exoreg_target.ra_deg),
          dec_deg = COALESCE(EXCLUDED.dec_deg, exoreg_target.dec_deg)
        RETURNING id;
        """,
        gaia_source_id,
        display_label,
        ra_deg,
        dec_deg,
    )
    return row["id"]


async def _recompute_consensus(conn, target_id: UUID) -> tuple[str | None, str | None]:
    """Returns (new_published_label, previous_published_label)."""
    min_v = max(1, settings.exoreg_consensus_min_votes)
    row = await conn.fetchrow(
        """
        SELECT
          COUNT(DISTINCT clerk_user_id) FILTER (WHERE vote = 'validated_kdwarf')::int AS v_cnt,
          COUNT(DISTINCT clerk_user_id) FILTER (WHERE vote = 'null_kdwarf')::int AS n_cnt
        FROM exoreg_classification_event
        WHERE target_id = $1
        """,
        target_id,
    )
    v_cnt = int(row["v_cnt"] or 0)
    n_cnt = int(row["n_cnt"] or 0)

    new_label: str | None = None
    if v_cnt >= min_v and v_cnt > n_cnt:
        new_label = "validated_kdwarf"
    elif n_cnt >= min_v and n_cnt > v_cnt:
        new_label = "null_kdwarf"

    prev = await conn.fetchrow(
        "SELECT published_label FROM exoreg_target WHERE id = $1",
        target_id,
    )
    prev_label = prev["published_label"] if prev else None

    if new_label is None:
        return prev_label, prev_label

    if new_label == prev_label:
        return new_label, prev_label

    await conn.execute(
        """
        UPDATE exoreg_target
        SET published_label = $2, published_at = now()
        WHERE id = $1
        """,
        target_id,
        new_label,
    )
    if new_label == "validated_kdwarf":
        base = await conn.fetchrow(
            "SELECT gaia_source_id, ra_deg, dec_deg FROM exoreg_target WHERE id = $1",
            target_id,
        )
        await conn.execute(
            """
            INSERT INTO exoreg_pipeline_ready (target_id, gaia_source_id, ra_deg, dec_deg)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (target_id) DO UPDATE SET
              gaia_source_id = EXCLUDED.gaia_source_id,
              ra_deg = EXCLUDED.ra_deg,
              dec_deg = EXCLUDED.dec_deg
            """,
            target_id,
            base["gaia_source_id"],
            base["ra_deg"],
            base["dec_deg"],
        )
    else:
        await conn.execute(
            "DELETE FROM exoreg_pipeline_ready WHERE target_id = $1",
            target_id,
        )
    return new_label, prev_label


async def _target_snapshot(conn, target_id: UUID) -> ExoRegTargetOut:
    row = await conn.fetchrow(
        """
        SELECT t.id, t.gaia_source_id, t.published_label,
          EXISTS (SELECT 1 FROM exoreg_pipeline_ready p WHERE p.target_id = t.id) AS in_ready
        FROM exoreg_target t
        WHERE t.id = $1
        """,
        target_id,
    )
    return ExoRegTargetOut(
        id=str(row["id"]),
        gaia_source_id=row["gaia_source_id"],
        published_label=row["published_label"],
        in_pipeline_ready=bool(row["in_ready"]),
    )


@router.post("/classify", response_model=ExoRegClassifyResponse)
async def exoreg_classify(
    body: ExoRegClassifyBody,
    auth: Annotated[AuthContext, Depends(get_auth_context)],
) -> ExoRegClassifyResponse:
    pool = _require_db_pool()
    affected: set[UUID] = set()
    async with pool.acquire() as conn:
        async with conn.transaction():
            for v in body.votes:
                gid = v.gaia_source_id.strip()
                tid = await _upsert_target(
                    conn,
                    gid,
                    v.display_label,
                    v.ra_deg,
                    v.dec_deg,
                )
                await conn.execute(
                    """
                    INSERT INTO exoreg_classification_event
                      (target_id, clerk_user_id, vote, client_round_id)
                    VALUES ($1, $2, $3, $4)
                    """,
                    tid,
                    auth.user_id,
                    v.vote,
                    body.client_round_id,
                )
                affected.add(tid)

            for tid in affected:
                await _recompute_consensus(conn, tid)

            out = []
            for tid in sorted(affected, key=lambda x: str(x)):
                out.append(await _target_snapshot(conn, tid))
    return ExoRegClassifyResponse(updated=out)


@router.get("/pipeline-ready", response_model=list[PipelineReadyRowOut])
async def pipeline_ready_json(
    auth: Annotated[AuthContext, Depends(get_auth_context)],
) -> list[PipelineReadyRowOut]:
    _ = auth
    pool = _require_db_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            """
            SELECT target_id, gaia_source_id, ra_deg, dec_deg, added_at
            FROM exoreg_pipeline_ready
            ORDER BY added_at ASC
            """
        )
    return [
        PipelineReadyRowOut(
            target_id=str(r["target_id"]),
            gaia_source_id=r["gaia_source_id"],
            ra_deg=r["ra_deg"],
            dec_deg=r["dec_deg"],
            added_at=r["added_at"].isoformat(),
        )
        for r in rows
    ]


@router.get("/pipeline-ready.csv")
async def pipeline_ready_csv(
    auth: Annotated[AuthContext, Depends(get_auth_context)],
) -> Response:
    _ = auth
    pool = _require_db_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            """
            SELECT gaia_source_id, ra_deg, dec_deg
            FROM exoreg_pipeline_ready
            ORDER BY added_at ASC
            """
        )
    buf = io.StringIO()
    w = csv.writer(buf)
    w.writerow(["gaia_source_id", "ra_deg", "dec_deg"])
    for r in rows:
        w.writerow(
            [
                r["gaia_source_id"],
                "" if r["ra_deg"] is None else r["ra_deg"],
                "" if r["dec_deg"] is None else r["dec_deg"],
            ]
        )
    return Response(
        content=buf.getvalue(),
        media_type="text/csv; charset=utf-8",
        headers={
            "Content-Disposition": 'attachment; filename="exoreg_pipeline_ready.csv"'
        },
    )
