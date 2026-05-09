from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    clerk_jwks_url: str
    clerk_issuer: str
    clerk_audience: str | None = None

    cors_origins: str = "http://localhost:3000"

    # asyncpg DATABASE_URL optional for later phases
    database_url: str | None = None

    # Local filesystem blob store (absolute or relative to API cwd). Required for /assets upload & download.
    workspace_blob_root: str | None = None

    # ExoReg: min distinct users voting one side vs the other to set published_label
    exoreg_consensus_min_votes: int = 1

    @field_validator("clerk_audience", mode="before")
    @classmethod
    def empty_audience_to_none(cls, v: object) -> object:
        if v == "":
            return None
        return v

    def cors_origins_list(self) -> list[str]:
        return [x.strip() for x in self.cors_origins.split(",") if x.strip()]


settings = Settings()
