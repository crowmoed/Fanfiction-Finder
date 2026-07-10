"""Stripe logic for the one-time "sponsor a fandom" purchase.

All Stripe SDK usage is isolated here; nothing else imports stripe directly
(except api.py, which catches stripe.error in its route wrapper).

The product: a buyer pays a one-time fee to have a fandom of their choice
vectorized (indexed) into Ficwell's search. Payment is captured up front via a
Stripe Checkout Session in `payment` mode; the webhook records a pending
`fandom_request` that the operator fulfills by hand (see fandom_orders.py).
There is no subscription and no recurring billing.

Env vars required:
  STRIPE_SECRET_KEY     — sk_test_... or sk_live_...
  STRIPE_WEBHOOK_SECRET — whsec_...
  FRONTEND_URL          — e.g. https://fanfiction-finder.vercel.app
Optional:
  SPONSOR_AMOUNT_CENTS  — price in the smallest currency unit (default 2000 = $20)
  SPONSOR_CURRENCY      — ISO currency (default "usd")
"""

import os

import stripe

from auth.user_store import user_store

stripe.api_key = os.environ.get("STRIPE_SECRET_KEY", "")
# Bound Stripe SDK network retries so a flaky connection can't retry unboundedly.
# (The SDK's per-request timeout default of ~80s still applies.)
stripe.max_network_retries = 2

WEBHOOK_SECRET = os.environ.get("STRIPE_WEBHOOK_SECRET", "")
FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:3000")

# One-time price for sponsoring a fandom, in the smallest currency unit.
SPONSOR_AMOUNT_CENTS = int(os.environ.get("SPONSOR_AMOUNT_CENTS", "2000"))
SPONSOR_CURRENCY = os.environ.get("SPONSOR_CURRENCY", "usd")


def create_sponsorship_checkout(fandom_name: str, notes: str = "") -> str:
    """Create a one-time Stripe Checkout Session for sponsoring a fandom.

    Anonymous: Checkout collects the buyer's email itself (returned on the
    session as customer_details.email), so no login is required. The chosen
    fandom + any notes ride in the session metadata and are read back in the
    webhook. Uses inline `price_data` so there's no Stripe Price/Product object
    to manage, and the fandom shows on the receipt. Returns the hosted-checkout
    URL the frontend redirects to.
    """
    session = stripe.checkout.Session.create(
        mode="payment",
        line_items=[
            {
                "price_data": {
                    "currency": SPONSOR_CURRENCY,
                    "unit_amount": SPONSOR_AMOUNT_CENTS,
                    "product_data": {
                        "name": f"Ficwell — vectorize “{fandom_name}”",
                        "description": "One-time fee to index this fandom into Ficwell's search.",
                    },
                },
                "quantity": 1,
            }
        ],
        metadata={
            "kind": "fandom_sponsorship",
            # Stripe caps each metadata value at 500 chars.
            "fandom": fandom_name[:480],
            "notes": (notes or "")[:480],
        },
        success_url=FRONTEND_URL + "/sponsor?sponsor=success",
        cancel_url=FRONTEND_URL + "/sponsor?sponsor=cancelled",
    )
    return session.url


def handle_webhook(payload: bytes, sig_header: str) -> None:
    """Verify and process a Stripe webhook event.

    Handles the one event that matters — a completed sponsorship checkout, which
    records a pending `fandom_request` for the operator to fulfill. All other
    event types are ignored.
    """
    event = stripe.Webhook.construct_event(payload, sig_header, WEBHOOK_SECRET)

    # Idempotency: Stripe retries deliveries for up to 72h. We dedupe AFTER
    # processing (below), so a failure mid-processing leaves the event un-marked
    # and the retry re-runs it; create_fandom_request is the only side effect, and
    # a rare duplicate order is harmless (and visible to the operator). Checked
    # only after signature verification so unverified events can't probe the table.
    if user_store.is_event_processed(event["id"]):
        return

    if event["type"] == "checkout.session.completed":
        session = event["data"]["object"]
        metadata = session.get("metadata") or {}
        if metadata.get("kind") == "fandom_sponsorship":
            details = session.get("customer_details") or {}
            email = details.get("email") or session.get("customer_email") or ""
            user_store.create_fandom_request(
                fandom=metadata.get("fandom", ""),
                email=email,
                notes=metadata.get("notes", ""),
                stripe_session_id=session.get("id", ""),
                stripe_payment_intent=session.get("payment_intent"),
                amount=session.get("amount_total"),
            )

    # Record only after successful processing (see idempotency note above).
    user_store.mark_event_processed(event["id"])
