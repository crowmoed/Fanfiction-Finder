"""Stripe subscription logic — checkout sessions and webhook handling.

All Stripe SDK usage is isolated here. Nothing else should import stripe directly.

Env vars required:
  STRIPE_SECRET_KEY     — sk_test_... or sk_live_...
  STRIPE_WEBHOOK_SECRET — whsec_...
  STRIPE_PRICE_ID       — price_... for the $5/mo subscription
  FRONTEND_URL          — e.g. https://fanfiction-finder.vercel.app
"""

import os

import stripe

from auth.user_store import user_store

stripe.api_key = os.environ.get("STRIPE_SECRET_KEY", "")

WEBHOOK_SECRET = os.environ.get("STRIPE_WEBHOOK_SECRET", "")
PRICE_ID = os.environ.get("STRIPE_PRICE_ID", "")
FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:3000")


def create_checkout_session(user_id: str, email: str) -> str:
    """Create a Stripe Checkout Session for a $5/month subscription.

    Returns the checkout URL the frontend should redirect to.
    """
    session = stripe.checkout.Session.create(
        mode="subscription",
        line_items=[{"price": PRICE_ID, "quantity": 1}],
        client_reference_id=user_id,
        customer_email=email,
        success_url=FRONTEND_URL + "?upgrade=success",
        cancel_url=FRONTEND_URL + "?upgrade=cancelled",
        metadata={"user_id": user_id},
    )
    return session.url


def handle_webhook(payload: bytes, sig_header: str) -> None:
    """Verify and process a Stripe webhook event.

    Handles:
      checkout.session.completed — upgrade user to paid tier
      customer.subscription.deleted — downgrade user to free tier
    All other event types are silently ignored.
    """
    event = stripe.Webhook.construct_event(payload, sig_header, WEBHOOK_SECRET)

    if event["type"] == "checkout.session.completed":
        session = event["data"]["object"]
        user_id = session["client_reference_id"]
        customer_id = session["customer"]
        user_store.set_tier(user_id, "paid")
        user_store.set_stripe_customer_id(user_id, customer_id)

    elif event["type"] == "customer.subscription.deleted":
        subscription = event["data"]["object"]
        customer_id = subscription["customer"]
        # Find user by stripe_customer_id — scan is fine for this low-volume event
        _downgrade_by_customer_id(customer_id)


def _downgrade_by_customer_id(customer_id: str) -> None:
    """Find the user with this Stripe customer ID and set their tier to free.

    Uses a DynamoDB scan since there's no GSI on stripe_customer_id.
    Acceptable for the low volume of cancellation webhooks.
    """
    import boto3

    table = user_store._table
    resp = table.scan(
        FilterExpression="stripe_customer_id = :cid",
        ExpressionAttributeValues={":cid": customer_id},
    )
    for item in resp.get("Items", []):
        user_store.set_tier(item["id"], "free")
