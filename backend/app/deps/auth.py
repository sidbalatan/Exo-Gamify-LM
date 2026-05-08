from dataclasses import dataclass
from typing import Annotated

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jwt import PyJWKClient

from app.config import settings

_bearer = HTTPBearer(auto_error=False)
_jwks_client: PyJWKClient | None = None


@dataclass(frozen=True)
class AuthContext:
    user_id: str
    email: str | None
    name: str | None


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


def _claims_to_context(payload: dict) -> AuthContext:
    sub = payload.get("sub")
    if not sub or not isinstance(sub, str):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token missing sub",
        )

    email = payload.get("email")
    if not isinstance(email, str):
        email = None
    if email is None:
        emails = payload.get("email_addresses")
        if isinstance(emails, list) and emails:
            first = emails[0]
            if isinstance(first, dict):
                cand = first.get("email_address")
                if isinstance(cand, str):
                    email = cand

    name = payload.get("name")
    if not isinstance(name, str):
        un = payload.get("username")
        name = un if isinstance(un, str) else None

    return AuthContext(user_id=sub, email=email, name=name)


async def get_auth_context(
    creds: Annotated[HTTPAuthorizationCredentials | None, Depends(_bearer)],
) -> AuthContext:
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
    return _claims_to_context(payload)


async def get_clerk_user_id(
    auth: Annotated[AuthContext, Depends(get_auth_context)],
) -> str:
    return auth.user_id
