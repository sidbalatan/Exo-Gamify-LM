import asyncio
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel

from app.deps.auth import get_clerk_user_id

router = APIRouter(prefix="/v1/gaia", tags=["gaia"])

_GAIA_FIELDS = (
    "source_id, ra, dec, phot_g_mean_mag, teff_gspphot, "
    "logg_gspphot, parallax, bp_rp"
)
_TEFF_MIN = 3900
_TEFF_MAX = 5300


class GaiaStarOut(BaseModel):
    source_id: str
    ra: float
    dec: float
    phot_g_mean_mag: float | None = None
    teff_gspphot: float | None = None
    logg_gspphot: float | None = None
    parallax: float | None = None
    bp_rp: float | None = None


def _run_gaia_source_id(source_id_int: int) -> list[dict]:
    from astroquery.gaia import Gaia  # type: ignore[import-untyped]

    query = (
        f"SELECT {_GAIA_FIELDS} FROM gaiadr3.gaia_source "
        f"WHERE source_id = {source_id_int} "
        f"  AND teff_gspphot BETWEEN {_TEFF_MIN} AND {_TEFF_MAX}"
    )
    job = Gaia.launch_job(query)
    table = job.get_results()
    return _table_to_dicts(table)


def _run_gaia_cone(ra: float, dec: float, radius_deg: float) -> list[dict]:
    from astroquery.gaia import Gaia  # type: ignore[import-untyped]
    from astropy.coordinates import SkyCoord  # type: ignore[import-untyped]
    import astropy.units as u  # type: ignore[import-untyped]

    coord = SkyCoord(ra=ra, dec=dec, unit=(u.degree, u.degree), frame="icrs")
    job = Gaia.launch_job_async(
        f"SELECT {_GAIA_FIELDS} FROM gaiadr3.gaia_source "
        f"WHERE CONTAINS(POINT('ICRS', ra, dec), "
        f"               CIRCLE('ICRS', {ra}, {dec}, {radius_deg})) = 1 "
        f"  AND teff_gspphot BETWEEN {_TEFF_MIN} AND {_TEFF_MAX}"
    )
    del coord  # used for potential future validation
    table = job.get_results()
    return _table_to_dicts(table)


def _table_to_dicts(table) -> list[dict]:  # type: ignore[no-untyped-def]
    rows: list[dict] = []
    if table is None or len(table) == 0:
        return rows
    for row in table:
        rows.append({
            "source_id": str(int(row["source_id"])),
            "ra": float(row["ra"]),
            "dec": float(row["dec"]),
            "phot_g_mean_mag": _opt_float(row, "phot_g_mean_mag"),
            "teff_gspphot": _opt_float(row, "teff_gspphot"),
            "logg_gspphot": _opt_float(row, "logg_gspphot"),
            "parallax": _opt_float(row, "parallax"),
            "bp_rp": _opt_float(row, "bp_rp"),
        })
    return rows


def _opt_float(row, key: str) -> float | None:
    try:
        v = row[key]
        if v is None:
            return None
        f = float(v)
        import math
        return None if math.isnan(f) else f
    except (TypeError, ValueError, KeyError):
        return None


@router.get("/lookup", response_model=list[GaiaStarOut])
async def gaia_lookup(
    _user_id: Annotated[str, Depends(get_clerk_user_id)],
    source_id: str | None = Query(default=None),
    ra: float | None = Query(default=None),
    dec: float | None = Query(default=None),
    radius_arcmin: float = Query(default=5.0, ge=0.1, le=60.0),
) -> list[GaiaStarOut]:
    if source_id is not None:
        try:
            source_id_int = int(source_id)
        except ValueError as exc:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="source_id must be an integer string",
            ) from exc
        loop = asyncio.get_event_loop()
        rows = await loop.run_in_executor(None, _run_gaia_source_id, source_id_int)
    elif ra is not None and dec is not None:
        radius_deg = radius_arcmin / 60.0
        loop = asyncio.get_event_loop()
        rows = await loop.run_in_executor(None, _run_gaia_cone, ra, dec, radius_deg)
    else:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Provide source_id or both ra and dec",
        )

    return [GaiaStarOut(**r) for r in rows]
