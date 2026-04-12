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

    user = user_store.get_user(claims["sub"])
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")

    # Attach sub so callers can identify the user
    user["sub"] = claims["sub"]
    return user


def check_search_limit(user: dict = Depends(get_current_user)) -> dict:
    """Enforce per-tier search limits.

    Free tier: 2 searches per week.
    Paid tier: unlimited.
    """
    if user["tier"] == "free" and user["searches_used"] >= 2:
        raise HTTPException(
            status_code=429,
            detail="Free tier limit: 2 searches/week. Upgrade for unlimited searches.",
        )
    return user
