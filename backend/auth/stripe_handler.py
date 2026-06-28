"""Stripe subscription logic — checkout sessions and webhook handling.

All Stripe SDK usage is isolated here. Nothing else should import stripe directly.

Env vars required:
  STRIPE_SECRET_KEY     — sk_test_... or sk_live_...
  STRIPE_WEBHOOK_SECRET — whsec_...
  STRIPE_PRICE_ID       — price_... for the $2/mo subscription
  FRONTEND_URL          — e.g. https://fanfiction-finder.vercel.app
"""

import os
from datetime import datetime, timezone

import stripe

from auth.user_store import user_store

# How long to trust a cached "paid" verification before re-checking Stripe.
# TODO(pre-launch): raise this and/or switch to honoring cancel_at_period_end
# so cancelled users keep access until the end of their paid period.
VERIFY_CACHE_SECONDS = 300

stripe.api_key = os.environ.get("STRIPE_SECRET_KEY", "")
# Bound Stripe SDK network retries so a flaky connection can't retry unboundedly.
# (The SDK's per-request timeout default of ~80s still applies.)
stripe.max_network_retries = 2

WEBHOOK_SECRET = os.environ.get("STRIPE_WEBHOOK_SECRET", "")
PRICE_ID = os.environ.get("STRIPE_PRICE_ID", "")
FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:3000")


def create_checkout_session(user_id: str, email: str) -> str:
    """Create a Stripe Checkout Session for a $2/month subscription.

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


def create_portal_session(customer_id: str) -> str:
    """Create a Stripe Billing Portal session so the customer can cancel or update payment.

    Returns the portal URL the frontend should redirect to.
    """
    session = stripe.billing_portal.Session.create(
        customer=customer_id,
        return_url=FRONTEND_URL + "/settings",
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

    # Idempotency: Stripe retries deliveries for up to 72h. Skip if this event id was
    # already fully processed. We dedupe AFTER processing (below), not before, so a
    # failure mid-processing leaves the event un-marked and the retry actually re-runs
    # it — the handlers here are all idempotent writes (set_tier / set_stripe_customer_id
    # / downgrade), so at-least-once delivery is safe. Checked only after signature
    # verification so unverified events can't probe the dedupe table.
    if user_store.is_event_processed(event["id"]):
        return

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

    # Record only after successful processing, so a failure above leaves the event
    # un-marked and Stripe's retry re-runs the (idempotent) side effects.
    user_store.mark_event_processed(event["id"])


def verify_paid_user(user: dict) -> dict:
    """Re-check Stripe for a paid user's subscription, downgrading if none is active.

    Closes the gap where Stripe-side changes (e.g. deleting a customer in the
    dashboard) don't deliver a customer.subscription.deleted webhook. Cached
    via stripe_last_checked so we don't hit Stripe on every authed request.

    Returns the user dict, possibly mutated to tier=free.
    """
    if user.get("tier") != "paid":
        return user

    customer_id = user.get("stripe_customer_id")
    if not customer_id:
        user_store.set_tier(user["id"], "free")
        user["tier"] = "free"
        return user

    last_checked = user.get("stripe_last_checked")
    now = datetime.now(timezone.utc)
    if last_checked:
        try:
            delta = (now - datetime.fromisoformat(last_checked)).total_seconds()
            if delta < VERIFY_CACHE_SECONDS:
                return user
        except ValueError:
            pass

    try:
        subs = stripe.Subscription.list(customer=customer_id, status="active", limit=1)
        has_active = len(subs.data) > 0
    except stripe.error.InvalidRequestError:
        # Customer was deleted on Stripe's side — no subscription possible.
        has_active = False
    except stripe.error.StripeError:
        # Transient Stripe failure — keep existing tier, try again next request.
        return user

    if not has_active:
        user_store.set_tier(user["id"], "free")
        user["tier"] = "free"
        return user

    user_store.set_stripe_last_checked(user["id"], now.isoformat())
    user["stripe_last_checked"] = now.isoformat()
    return user


def _downgrade_by_customer_id(customer_id: str) -> None:
    """Find the user with this Stripe customer ID and set their tier to free.

    Uses a DynamoDB scan since there's no GSI on stripe_customer_id.
    Acceptable for the low volume of cancellation webhooks.
    """
    table = user_store._table
    resp = table.scan(
        FilterExpression="stripe_customer_id = :cid",
        ExpressionAttributeValues={":cid": customer_id},
    )
    for item in resp.get("Items", []):
        user_store.set_tier(item["id"], "free")
