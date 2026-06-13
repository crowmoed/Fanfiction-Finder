"""Google ID token verification and JWT issuance."""

import os
from datetime import datetime, timedelta, timezone

import jwt
from fastapi import HTTPException
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token as google_id_token

GOOGLE_CLIENT_ID = os.environ.get("GOOGLE_CLIENT_ID", "")
JWT_SECRET = os.environ.get("JWT_SECRET", "change-me-in-production")
JWT_ALGORITHM = "HS256"
JWT_EXPIRY_DAYS = 7

# Placeholder secret shipped as the code default. We must never sign or verify with
# it — if the env var is unset, anyone could forge tokens using this known value.
_PLACEHOLDER_JWT_SECRET = "change-me-in-production"


def _require_jwt_secret() -> str:
    """Return the configured JWT secret, failing closed if it's missing/placeholder.

    Guards against a deploy where JWT_SECRET is unset: the public placeholder would
    otherwise let anyone forge a valid JWT for any user.
    """
    if not JWT_SECRET or JWT_SECRET == _PLACEHOLDER_JWT_SECRET:
        raise HTTPException(
            status_code=500,
            detail="Server auth misconfiguration: JWT_SECRET is not set.",
        )
    return JWT_SECRET


def verify_google_token(token: str) -> dict:
    """Verify a Google OAuth2 ID token and return the decoded payload.

    The payload contains 'sub' (unique user ID), 'email', 'name', etc.
    Raises HTTPException 401 on any verification failure.
    """
    if not GOOGLE_CLIENT_ID:
        # With an empty audience the Google library skips audience verification,
        # which would accept ID tokens minted for *any* Google OAuth client. Fail
        # closed rather than authenticate against an unverified audience.
        raise HTTPException(
            status_code=500,
            detail="Server auth misconfiguration: GOOGLE_CLIENT_ID is not set.",
        )
    try:
        payload = google_id_token.verify_oauth2_token(
            token,
            google_requests.Request(),
            GOOGLE_CLIENT_ID,
        )
        return payload
    except ValueError as e:
        raise HTTPException(status_code=401, detail=f"Invalid Google token: {e}")


def create_jwt(user_id: str, email: str) -> str:
    """Issue a signed JWT for the given user."""
    payload = {
        "sub": user_id,
        "email": email,
        "exp": datetime.now(timezone.utc) + timedelta(days=JWT_EXPIRY_DAYS),
    }
    return jwt.encode(payload, _require_jwt_secret(), algorithm=JWT_ALGORITHM)


def decode_jwt(token: str) -> dict:
    """Decode and validate a JWT. Raises HTTPException 401 on failure."""
    try:
        return jwt.decode(token, _require_jwt_secret(), algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired")
    except jwt.InvalidTokenError as e:
        raise HTTPException(status_code=401, detail=f"Invalid token: {e}")
