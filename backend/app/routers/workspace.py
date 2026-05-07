from typing import Annotated

from fastapi import APIRouter, Depends, status

from app.deps.auth import get_clerk_user_id
from app.schemas.workspace import (
    AssetPresignRequest,
    AssetPresignResponse,
    ExoplanetCreate,
    KDwarfUpsert,
    TargetCreate,
)

router = APIRouter(prefix="/v1/workspace", tags=["workspace"])


@router.get("/health")
async def workspace_health(
    user_id: Annotated[str, Depends(get_clerk_user_id)],
) -> dict:
    return {"ok": True, "user_id": user_id}


# --- 1) Gaia IDs / coordinates ---


@router.get("/targets")
async def list_targets(
    user_id: Annotated[str, Depends(get_clerk_user_id)],
) -> dict:
    """
    SQL sketch:
      SELECT id, kind::text, gaia_source_id, ra_deg, dec_deg, label, created_at
      FROM workspace_targets
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3;
    Serialize gaia_source_id with text-hint: convert BIGINT -> str in Python.
    """
    return {"items": [], "user_id": user_id}


@router.post("/targets", status_code=status.HTTP_201_CREATED)
async def create_target(
    body: TargetCreate,
    user_id: Annotated[str, Depends(get_clerk_user_id)],
) -> dict:
    """
    SQL sketch:
      INSERT INTO workspace_targets (
        user_id, kind, gaia_source_id, ra_deg, dec_deg, label, notes
      ) VALUES ($1, $2::workspace_target_kind, $3, $4, $5, $6, $7)
      RETURNING id, created_at;
    Bind gaia_source_id from gaia_api_string_to_bigint(...) when present.
    """
    return {
        "created": True,
        "user_id": user_id,
        "payload": body.model_dump(),
        "sql_table": "workspace_targets",
    }


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
    from app.utils.gaia import gaia_api_string_to_bigint, gaia_bigint_to_api_string

    n = gaia_api_string_to_bigint(body.gaia_source_id)
    return {
        "upserted": True,
        "user_id": user_id,
        "gaia_api_roundtrip": gaia_bigint_to_api_string(n),
        "payload": body.model_dump(),
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
    return {"created": True, "user_id": user_id, "payload": body.model_dump()}


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
