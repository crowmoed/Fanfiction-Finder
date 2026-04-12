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


def verify_google_token(token: str) -> dict:
    """Verify a Google OAuth2 ID token and return the decoded payload.

    The payload contains 'sub' (unique user ID), 'email', 'name', etc.
    Raises HTTPException 401 on any verification failure.
    """
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
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def decode_jwt(token: str) -> dict:
    """Decode and validate a JWT. Raises HTTPException 401 on failure."""
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired")
    except jwt.InvalidTokenError as e:
        raise HTTPException(status_code=401, detail=f"Invalid token: {e}")
