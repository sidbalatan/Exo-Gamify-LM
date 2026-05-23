from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


class ExoRegVoteIn(BaseModel):
    gaia_source_id: str = Field(..., min_length=1, max_length=48)
    vote: Literal["validated_kdwarf", "null_kdwarf"]
    display_label: str | None = Field(None, max_length=512)
    ra_deg: float | None = Field(None, ge=0, lt=360)
    dec_deg: float | None = Field(None, ge=-90, le=90)


class ExoRegClassifyBody(BaseModel):
    votes: list[ExoRegVoteIn] = Field(..., min_length=1, max_length=50)
    client_round_id: str | None = Field(None, max_length=128)


class ExoRegTargetOut(BaseModel):
    id: str
    gaia_source_id: str
    published_label: str | None
    in_pipeline_ready: bool


class ExoRegClassifyResponse(BaseModel):
    updated: list[ExoRegTargetOut]


class PipelineReadyRowOut(BaseModel):
    target_id: str
    gaia_source_id: str
    ra_deg: float | None
    dec_deg: float | None
    added_at: str
