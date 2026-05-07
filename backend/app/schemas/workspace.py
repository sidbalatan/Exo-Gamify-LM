"""Pydantic models — gaia_source_id is always serialized as STRING at API boundaries."""

from datetime import datetime
from typing import Annotated
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.utils.gaia import gaia_api_string_to_bigint, gaia_bigint_to_api_string

GaiaSourceIdApi = Annotated[
    str,
    Field(
        ...,
        description="Gaia DR3 source_id as base-10 string (JS-safe)",
        examples=["6123456789012345678"],
        pattern=r"^[1-9]\d*$",
    ),
]


class TargetCreate(BaseModel):
    kind: str
    gaia_source_id: str | None = None
    ra_deg: float | None = None
    dec_deg: float | None = None
    label: str | None = None
    notes: str | None = None


class TargetOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    user_id: str
    id: UUID
    kind: str
    gaia_source_id: str | None = None  # bigint in DB → string wire
    ra_deg: float | None = None
    dec_deg: float | None = None
    label: str | None = None
    created_at: datetime

    @classmethod
    def from_row(cls, *, user_id: str, row: dict) -> "TargetOut":
        g = row.get("gaia_source_id")
        return cls(
            user_id=user_id,
            id=row["id"],
            kind=row["kind"],
            gaia_source_id=gaia_bigint_to_api_string(g) if g is not None else None,
            ra_deg=row.get("ra_deg"),
            dec_deg=row.get("dec_deg"),
            label=row.get("label"),
            created_at=row["created_at"],
        )


class KDwarfUpsert(BaseModel):
    gaia_source_id: GaiaSourceIdApi
    pipeline_stage: str = "scout"
    state_json: dict = Field(default_factory=dict)
    validation_confidence: float | None = None
    source_target_id: UUID | None = None

    def gaia_bigint(self) -> int:
        return gaia_api_string_to_bigint(self.gaia_source_id)


class KDwarfOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    gaia_source_id: str
    pipeline_stage: str
    state_json: dict
    validation_confidence: float | None = None
    validated_at: datetime | None = None
    created_at: datetime

    @classmethod
    def from_row(cls, row: dict) -> "KDwarfOut":
        return cls(
            id=row["id"],
            gaia_source_id=gaia_bigint_to_api_string(int(row["gaia_source_id"])),
            pipeline_stage=row["pipeline_stage"],
            state_json=dict(row["state_json"]),
            validation_confidence=row.get("validation_confidence"),
            validated_at=row.get("validated_at"),
            created_at=row["created_at"],
        )


class ExoplanetCreate(BaseModel):
    origin: str
    host_gaia_source_id: GaiaSourceIdApi | None = None
    k_dwarf_id: UUID | None = None
    designation: str | None = None
    external_ref_json: dict = Field(default_factory=dict)
    detection_json: dict = Field(default_factory=dict)

    def host_gaia_bigint(self) -> int | None:
        if self.host_gaia_source_id is None:
            return None
        return gaia_api_string_to_bigint(self.host_gaia_source_id)


class AssetPresignRequest(BaseModel):
    title: str | None = None
    content_type: str


class AssetPresignResponse(BaseModel):
    title: str | None = None
    content_type: str
    planned_object_key_stub: str
    hint: str = "Implement presigned upload against object storage."
