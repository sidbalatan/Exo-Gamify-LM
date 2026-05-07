from typing import Annotated

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jwt import PyJWKClient

from app.config import settings

_bearer = HTTPBearer(auto_error=False)
_jwks_client: PyJWKClient | None = None


def _get_jwks_client() -> PyJWKClient:
    global _jwks_client
    if _jwks_client is None:
        _jwks_client = PyJWKClient(settings.clerk_jwks_url)
    return _jwks_client


def verify_clerk_jwt(token: str) -> dict:
    jwks = _get_jwks_client()
    signing_key = jwks.get_signing_key_from_jwt(token)
    decode_kwargs: dict = {
        "algorithms": ["RS256"],
        "issuer": settings.clerk_issuer,
    }
    if settings.clerk_audience:
        decode_kwargs["audience"] = settings.clerk_audience
    else:
        decode_kwargs["options"] = {"verify_aud": False}

    return jwt.decode(
        token,
        signing_key.key,
        **decode_kwargs,
    )


async def get_clerk_user_id(
    creds: Annotated[HTTPAuthorizationCredentials | None, Depends(_bearer)],
) -> str:
    if creds is None or creds.scheme.lower() != "bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing bearer token",
        )
    try:
        payload = verify_clerk_jwt(creds.credentials)
    except jwt.PyJWTError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid token: {e!s}",
        ) from e
    sub = payload.get("sub")
    if not sub or not isinstance(sub, str):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token missing sub",
        )
    return sub
