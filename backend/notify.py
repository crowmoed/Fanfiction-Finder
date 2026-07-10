"""Outbound email — the free "request a fandom" notification.

A visitor asks for a fandom to be indexed; we email that request to the operator's
inbox via Gmail SMTP. No payment, no third-party service.

Env (repo-root .env):
  GMAIL_ADDRESS       — the Gmail account to log in / send FROM (e.g. you@gmail.com)
  GMAIL_APP_PASSWORD  — a Google App Password (NOT the account password; 16 chars)
  REQUEST_NOTIFY_TO   — where requests land (defaults to GMAIL_ADDRESS)
"""

import os
import smtplib
from email.message import EmailMessage

import config  # noqa: F401 — loads the repo-root .env

GMAIL_ADDRESS = os.environ.get("GMAIL_ADDRESS", "")
# App passwords are shown grouped ("abcd efgh ijkl mnop") but must be sent without
# spaces; strip them defensively so either form in .env works.
GMAIL_APP_PASSWORD = os.environ.get("GMAIL_APP_PASSWORD", "").replace(" ", "")
REQUEST_NOTIFY_TO = os.environ.get("REQUEST_NOTIFY_TO") or GMAIL_ADDRESS


def send_request_email(fandom: str, notes: str = "", requester_email: str = "") -> None:
    """Email a fandom request to the operator via Gmail SMTP.

    Raises on failure so the caller can log it — the request itself is still
    recorded in the store regardless of whether the email goes through.
    """
    if not GMAIL_ADDRESS or not GMAIL_APP_PASSWORD:
        raise RuntimeError(
            "Gmail email not configured (set GMAIL_ADDRESS / GMAIL_APP_PASSWORD)"
        )

    msg = EmailMessage()
    msg["Subject"] = f"Ficwell — fandom request: {fandom}"
    msg["From"] = GMAIL_ADDRESS
    msg["To"] = REQUEST_NOTIFY_TO
    if requester_email:
        msg["Reply-To"] = requester_email

    lines = ["New fandom request:", "", f"  Fandom: {fandom}"]
    if requester_email:
        lines.append(f"  From:   {requester_email}")
    if notes:
        lines += ["", "Notes:", notes]
    lines += ["", "— Ficwell"]
    msg.set_content("\n".join(lines))

    with smtplib.SMTP("smtp.gmail.com", 587, timeout=20) as smtp:
        smtp.starttls()
        smtp.login(GMAIL_ADDRESS, GMAIL_APP_PASSWORD)
        smtp.send_message(msg)
