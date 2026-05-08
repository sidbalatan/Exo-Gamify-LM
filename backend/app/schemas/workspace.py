"""Pydantic models — gaia_source_id is always serialized as STRING at API boundaries."""

from collections.abc import Mapping
from datetime import datetime
from enum import StrEnum
from typing import Annotated
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, model_validator

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


class TargetKind(StrEnum):
    GAIA_DR3_SOURCE_ID = "GAIA_DR3_SOURCE_ID"
    SKY_COORDS = "SKY_COORDS"
    ALIAS_TEXT = "ALIAS_TEXT"


class TargetCreate(BaseModel):
    kind: TargetKind
    gaia_source_id: str | None = None
    ra_deg: float | None = None
    dec_deg: float | None = None
    label: str | None = None
    notes: str | None = None

    @model_validator(mode="after")
    def require_kind_payload(self) -> "TargetCreate":
        if self.kind is TargetKind.GAIA_DR3_SOURCE_ID:
            if not (self.gaia_source_id and self.gaia_source_id.strip()):
                raise ValueError("gaia_source_id is required for GAIA_DR3_SOURCE_ID")
        elif self.kind is TargetKind.SKY_COORDS:
            if self.ra_deg is None or self.dec_deg is None:
                raise ValueError("ra_deg and dec_deg are required for SKY_COORDS")
        elif self.kind is TargetKind.ALIAS_TEXT:
            if not (self.label and self.label.strip()):
                raise ValueError("label is required for ALIAS_TEXT")
        return self


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
    def from_row(cls, *, user_id: str, row: Mapping[str, object]) -> "TargetOut":
        g = row.get("gaia_source_id")
        return cls(
            user_id=user_id,
            id=row["id"],  # type: ignore[assignment]
            kind=str(row["kind"]),
            gaia_source_id=gaia_bigint_to_api_string(int(g))
            if g is not None
            else None,
            ra_deg=row.get("ra_deg"),  # type: ignore[arg-type]
            dec_deg=row.get("dec_deg"),  # type: ignore[arg-type]
            label=row.get("label"),  # type: ignore[arg-type]
            created_at=row["created_at"],  # type: ignore[assignment]
        )


class ProfileOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    user_id: str
    email: str | None
    display_name: str | None
    created_at: datetime


class WorkspaceMeOut(BaseModel):
    profile: ProfileOut
    target_count: int


class TargetsPayload(BaseModel):
    items: list[TargetOut]


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
