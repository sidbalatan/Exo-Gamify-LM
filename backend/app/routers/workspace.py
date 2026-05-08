from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status

from app import db as db_conn
from app.config import settings
from app.deps.auth import AuthContext, get_auth_context, get_clerk_user_id
from app.schemas.workspace import (
    AssetPresignRequest,
    AssetPresignResponse,
    ExoplanetCreate,
    KDwarfUpsert,
    ProfileOut,
    TargetCreate,
    TargetKind,
    TargetOut,
    TargetsPayload,
    WorkspaceMeOut,
)
from app.utils.gaia import gaia_api_string_to_bigint, gaia_bigint_to_api_string

router = APIRouter(prefix="/v1/workspace", tags=["workspace"])


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


@router.get("/me", response_model=WorkspaceMeOut)
async def workspace_me(
    auth: Annotated[AuthContext, Depends(get_auth_context)],
) -> WorkspaceMeOut:
    pool = _require_db_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            """
            INSERT INTO profiles (user_id, email, display_name)
            VALUES ($1, $2, $3)
            ON CONFLICT (user_id) DO UPDATE SET
              email = COALESCE(EXCLUDED.email, profiles.email),
              display_name = COALESCE(EXCLUDED.display_name, profiles.display_name),
              updated_at = now()
            RETURNING user_id, email, display_name, created_at;
            """,
            auth.user_id,
            auth.email,
            auth.name,
        )
        cnt = await conn.fetchval(
            """
            SELECT COUNT(*)::bigint FROM workspace_targets WHERE user_id = $1;
            """,
            auth.user_id,
        )

    if row is None:
        raise HTTPException(status_code=500, detail="profile upsert failed")

    profile = ProfileOut(
        user_id=str(row["user_id"]),
        email=row["email"],
        display_name=row["display_name"],
        created_at=row["created_at"],
    )
    return WorkspaceMeOut(profile=profile, target_count=int(cnt))


@router.get("/health")
async def workspace_health(
    user_id: Annotated[str, Depends(get_clerk_user_id)],
) -> dict:
    return {"ok": True, "user_id": user_id}


# --- 1) Gaia IDs / coordinates ---


@router.get("/targets", response_model=TargetsPayload)
async def list_targets(
    user_id: Annotated[str, Depends(get_clerk_user_id)],
) -> TargetsPayload:
    pool = _require_db_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            """
            SELECT id, kind::text AS kind, gaia_source_id, ra_deg, dec_deg, label, created_at
            FROM workspace_targets
            WHERE user_id = $1
            ORDER BY created_at DESC
            LIMIT 200;
            """,
            user_id,
        )

    return TargetsPayload(
        items=[TargetOut.from_row(user_id=user_id, row=r) for r in rows],
    )


@router.post("/targets", status_code=status.HTTP_201_CREATED, response_model=TargetOut)
async def create_target(
    body: TargetCreate,
    user_id: Annotated[str, Depends(get_clerk_user_id)],
) -> TargetOut:
    pool = _require_db_pool()
    gaia_bi: int | None = None
    if body.kind is TargetKind.GAIA_DR3_SOURCE_ID:
        assert body.gaia_source_id is not None
        gaia_bi = gaia_api_string_to_bigint(body.gaia_source_id)

    async with pool.acquire() as conn:
        await conn.execute(
            """
            INSERT INTO profiles (user_id, email, display_name)
            VALUES ($1, NULL, NULL)
            ON CONFLICT (user_id) DO NOTHING;
            """,
            user_id,
        )
        row = await conn.fetchrow(
            """
            INSERT INTO workspace_targets (
              user_id, kind, gaia_source_id, ra_deg, dec_deg, label, notes
            )
            VALUES ($1, $2::workspace_target_kind, $3, $4, $5, $6, $7)
            RETURNING id, kind::text AS kind, gaia_source_id, ra_deg, dec_deg, label, created_at;
            """,
            user_id,
            body.kind.value,
            gaia_bi,
            body.ra_deg,
            body.dec_deg,
            body.label,
            body.notes,
        )

    if row is None:
        raise HTTPException(status_code=500, detail="target insert failed")

    return TargetOut.from_row(user_id=user_id, row=row)


# --- 2) Validated K dwarfs ---


@router.get("/k-dwarfs")
async def list_k_dwarfs(
    user_id: Annotated[str, Depends(get_clerk_user_id)],
) -> dict:
    """
    SQL sketch:
      SELECT id, gaia_source_id, pipeline_stage, state_json, ...
      FROM workspace_k_dwarfs WHERE user_id = $1 ORDER BY updated_at DESC;
    """
    return {"items": [], "user_id": user_id}


@router.put("/k-dwarfs", status_code=status.HTTP_200_OK)
async def upsert_k_dwarf(
    body: KDwarfUpsert,
    user_id: Annotated[str, Depends(get_clerk_user_id)],
) -> dict:
    """
    SQL sketch (upsert on unique user_id + gaia_source_id):
      INSERT INTO workspace_k_dwarfs (
        user_id, gaia_source_id, pipeline_stage, state_json,
        validation_confidence, source_target_id
      ) VALUES ($1, $2, $3, $4::jsonb, $5, $6)
      ON CONFLICT (user_id, gaia_source_id) DO UPDATE SET
        pipeline_stage = EXCLUDED.pipeline_stage,
        state_json = EXCLUDED.state_json,
        validation_confidence = EXCLUDED.validation_confidence,
        source_target_id = EXCLUDED.source_target_id,
        updated_at = now()
      RETURNING *;
    """
    n = gaia_api_string_to_bigint(body.gaia_source_id)
    return {
        "upserted": True,
        "user_id": user_id,
        "gaia_api_roundtrip": gaia_bigint_to_api_string(n),
        "payload": body.model_dump(mode="json"),
    }


# --- 3) Exoplanets ---


@router.post("/exoplanets", status_code=status.HTTP_201_CREATED)
async def create_exoplanet(
    body: ExoplanetCreate,
    user_id: Annotated[str, Depends(get_clerk_user_id)],
) -> dict:
    """
    SQL sketch:
      INSERT INTO workspace_exoplanets (
        user_id, origin, host_gaia_source_id, k_dwarf_id, designation,
        external_ref_json, detection_json
      ) VALUES (
        $1,
        $2::workspace_exoplanet_origin,
        $3, $4, $5,
        $6::jsonb, $7::jsonb
      ) RETURNING id;
    """
    _ = body.host_gaia_bigint()
    return {"created": True, "user_id": user_id, "payload": body.model_dump(mode="json")}


# --- 4) Assets (presigned flow sketch) ---


@router.post("/assets/presign")
async def presign_asset_stub(
    body: AssetPresignRequest,
    user_id: Annotated[str, Depends(get_clerk_user_id)],
) -> AssetPresignResponse:
    """Real impl: return presigned PUT + asset id row stub."""
    safe_ct = body.content_type.replace("/", "_")
    return AssetPresignResponse(
        title=body.title,
        content_type=body.content_type,
        planned_object_key_stub=f"{user_id}/staging/{safe_ct}",
    )
