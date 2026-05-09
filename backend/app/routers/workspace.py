import hashlib
import json
from typing import Annotated
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from fastapi.responses import Response

from app import db as db_conn
from app.config import settings
from app.deps.auth import AuthContext, get_auth_context, get_clerk_user_id
from app.schemas.workspace import (
    AssetsListPayload,
    AssetOut,
    ExoplanetCreate,
    KDwarfUpsert,
    ProfileOut,
    TargetCreate,
    TargetKind,
    TargetOut,
    TargetsPayload,
    WorkspaceMeOut,
)
from app.storage.local import asset_rel_key, delete_file, read_bytes, save_bytes
from app.utils.gaia import gaia_api_string_to_bigint, gaia_bigint_to_api_string

router = APIRouter(prefix="/v1/workspace", tags=["workspace"])

ALLOWED_CONTENT_TYPES = frozenset(
    {
        "image/jpeg",
        "image/png",
        "image/gif",
        "image/webp",
        "image/svg+xml",
        "text/csv",
        "text/plain",
        "application/pdf",
        "application/json",
    }
)
MAX_UPLOAD_BYTES = 25 * 1024 * 1024


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


def _require_blob_root() -> str:
    if not settings.workspace_blob_root or not settings.workspace_blob_root.strip():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="WORKSPACE_BLOB_ROOT is not configured on the API server",
        )
    return settings.workspace_blob_root.strip()


def _normalize_asset_type(content_type: str, override: str | None) -> str:
    if override in ("IMAGE", "PLOT", "ARCHIVE_OTHER"):
        return override
    ct = (content_type or "").split(";")[0].strip().lower()
    if ct.startswith("image/"):
        return "IMAGE"
    return "ARCHIVE_OTHER"


async def _read_upload_limited(upload: UploadFile) -> tuple[bytes, str]:
    raw_ct = upload.content_type or ""
    ct = raw_ct.split(";")[0].strip().lower()
    if ct not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Content type not allowed: {ct or 'missing'}. "
            f"Allowed: {', '.join(sorted(ALLOWED_CONTENT_TYPES))}",
        )
    data = bytearray()
    while True:
        chunk = await upload.read(1024 * 1024)
        if not chunk:
            break
        data.extend(chunk)
        if len(data) > MAX_UPLOAD_BYTES:
            raise HTTPException(status_code=413, detail="File exceeds 25 MiB limit")
    return bytes(data), ct


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
    return {"items": [], "user_id": user_id}


@router.put("/k-dwarfs", status_code=status.HTTP_200_OK)
async def upsert_k_dwarf(
    body: KDwarfUpsert,
    user_id: Annotated[str, Depends(get_clerk_user_id)],
) -> dict:
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
    _ = body.host_gaia_bigint()
    return {"created": True, "user_id": user_id, "payload": body.model_dump(mode="json")}


# --- 4) Assets (local blob storage + Postgres metadata) ---


@router.get("/assets", response_model=AssetsListPayload)
async def list_assets(
    user_id: Annotated[str, Depends(get_clerk_user_id)],
) -> AssetsListPayload:
    pool = _require_db_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            """
            SELECT id, asset_type::text AS asset_type, title, content_type,
                   byte_size, sha256, created_at
            FROM workspace_assets
            WHERE user_id = $1
            ORDER BY created_at DESC
            LIMIT 200;
            """,
            user_id,
        )
    return AssetsListPayload(items=[AssetOut.from_row(r) for r in rows])


@router.post("/assets/upload", status_code=status.HTTP_201_CREATED, response_model=AssetOut)
async def upload_asset(
    user_id: Annotated[str, Depends(get_clerk_user_id)],
    file: Annotated[UploadFile, File(description="File to store")],
    title: Annotated[str | None, Form()] = None,
    asset_type_override: Annotated[
        str | None,
        Form(description="Optional: IMAGE | PLOT | ARCHIVE_OTHER"),
    ] = None,
) -> AssetOut:
    pool = _require_db_pool()
    root = _require_blob_root()
    data, ct = await _read_upload_limited(file)
    digest = hashlib.sha256(data).digest()
    atype = _normalize_asset_type(ct, asset_type_override.strip().upper() if asset_type_override else None)
    aid = uuid4()
    object_key = asset_rel_key(user_id, aid, file.filename or "file")
    provenance = json.dumps({"original_filename": file.filename or None})

    save_bytes(root, object_key, data)

    try:
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
                INSERT INTO workspace_assets (
                  user_id, id, asset_type, title, storage_backend, object_key,
                  content_type, byte_size, sha256, provenance_json
                )
                VALUES ($1, $2, $3::workspace_asset_type, $4, 'local', $5, $6, $7, $8, $9::jsonb)
                RETURNING id, asset_type::text AS asset_type, title, content_type,
                          byte_size, sha256, created_at;
                """,
                user_id,
                aid,
                atype,
                title,
                object_key,
                ct,
                len(data),
                digest,
                provenance,
            )
    except Exception:
        delete_file(root, object_key)
        raise

    if row is None:
        raise HTTPException(status_code=500, detail="asset insert failed")
    return AssetOut.from_row(row)


@router.get("/assets/{asset_id}/download")
async def download_asset(
    asset_id: UUID,
    user_id: Annotated[str, Depends(get_clerk_user_id)],
) -> Response:
    pool = _require_db_pool()
    root = _require_blob_root()
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            """
            SELECT object_key, content_type, title FROM workspace_assets
            WHERE user_id = $1 AND id = $2;
            """,
            user_id,
            asset_id,
        )
    if row is None:
        raise HTTPException(status_code=404, detail="asset not found")
    try:
        blob = read_bytes(root, str(row["object_key"]))
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="blob missing on disk")
    filename = (row["title"] or str(asset_id)).replace('"', "")
    cd = f'attachment; filename="{filename}"'
    return Response(
        content=blob,
        media_type=str(row["content_type"]),
        headers={"Content-Disposition": cd},
    )


@router.delete("/assets/{asset_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_asset(
    asset_id: UUID,
    user_id: Annotated[str, Depends(get_clerk_user_id)],
) -> None:
    pool = _require_db_pool()
    root = _require_blob_root()
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            """
            DELETE FROM workspace_assets
            WHERE user_id = $1 AND id = $2
            RETURNING object_key;
            """,
            user_id,
            asset_id,
        )
    if row is None:
        raise HTTPException(status_code=404, detail="asset not found")
    delete_file(root, str(row["object_key"]))
