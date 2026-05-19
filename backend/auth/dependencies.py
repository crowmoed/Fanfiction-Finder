"""FastAPI dependencies for authentication and rate limiting."""

from fastapi import Depends, Header, HTTPException

from auth.auth import decode_jwt
from auth.stripe_handler import verify_paid_user
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

    user = verify_paid_user(user)

    # Attach sub so callers can identify the user
    user["sub"] = claims["sub"]

    return user


def check_search_limit(user: dict = Depends(get_current_user)) -> dict:
    """Search limits temporarily disabled during beta — everyone gets unlimited.

    The counter still increments in api.py so tier/usage analytics remain accurate;
    re-enable the gate by restoring the 429 raise below.
    """
    return user
