"""FastAPI dependencies for authentication and rate limiting."""

from fastapi import Depends, Header, HTTPException

from auth.auth import decode_jwt
from auth.user_store import user_store


def get_current_user(authorization: str = Header(None)) -> dict:
    """Extract Bearer token, decode JWT, look up user in store.

    Returns the full user dict (with week-reset applied).
    Raises 401 if the header is missing, malformed, or the token is invalid.
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or malformed Authorization header")

    token = authorization.removeprefix("Bearer ").strip()
    claims = decode_jwt(token)

    user = user_store.get_user_with_week_reset(claims["sub"])
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")

    # Attach sub so callers can identify the user
    user["sub"] = claims["sub"]

    return user


def get_optional_user(authorization: str = Header(None)) -> dict | None:
    """Anonymous-tolerant variant of get_current_user.

    Search is free and open — nothing is behind a paywall — so a missing or
    unusable session must never block it. Returns the user dict when a valid
    Bearer token is present, or None when there is no token (or an expired /
    invalid one). The caller treats a None user as an anonymous request instead
    of raising 401.
    """
    if not authorization or not authorization.startswith("Bearer "):
        return None
    token = authorization.removeprefix("Bearer ").strip()
    try:
        claims = decode_jwt(token)
    except HTTPException:
        # Expired/invalid token → degrade to anonymous rather than failing the search.
        return None

    user = user_store.get_user_with_week_reset(claims["sub"])
    if user is None:
        return None

    user["sub"] = claims["sub"]
    return user


def check_search_limit(user: dict = Depends(get_current_user)) -> dict:
    """Search limits temporarily disabled during beta — everyone gets unlimited.

    The counter still increments in api.py so tier/usage analytics remain accurate;
    re-enable the gate by restoring the 429 raise below.
    """
    return user
