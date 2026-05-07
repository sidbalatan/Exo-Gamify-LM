"""Gaia DR3 source_id helpers (bigint in DB / string at API boundary)."""


def gaia_api_string_to_bigint(value: str) -> int:
    stripped = value.strip()
    if not stripped or not stripped.isdigit():
        raise ValueError("gaia_source_id must be a base-10 string without scientific notation")
    if stripped[0] == "0":
        raise ValueError("gaia_source_id string must be canonical (no leading zeros)")
    n = int(stripped)
    if n <= 0:
        raise ValueError("gaia_source_id must be positive")
    if n > (2**63 - 1):
        raise ValueError("gaia_source_id exceeds BIGINT range for PostgreSQL BIGINT storage")
    return n


def gaia_bigint_to_api_string(value: int) -> str:
    if value <= 0:
        raise ValueError("gaia_source_id must be positive")
    return str(value)
