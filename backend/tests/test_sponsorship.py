"""Fandom-sponsorship: the one-time "pay $20 to vectorize a fandom" flow that
replaced the subscription.

Covers the request store (create/list/get/update on the shared users table) and
the Stripe webhook → request mapping. Uses the in-memory FakeDynamoTable from
conftest; no AWS/Stripe network.
"""

import pytest

from tests.conftest import FakeDynamoTable


@pytest.fixture
def store():
    """A UserStore whose DynamoDB table is the in-memory fake."""
    from auth.user_store import UserStore

    s = UserStore()  # boto3 is stubbed in conftest; _table is a no-op
    s._table = FakeDynamoTable()
    return s


# ── Request store ──────────────────────────────────────────────────────────────

def test_create_fandom_request_stores_paid_item(store):
    req = store.create_fandom_request(
        fandom="Bleach",
        email="buyer@example.com",
        notes="the AO3 one",
        stripe_session_id="cs_test_123",
        stripe_payment_intent="pi_test_123",
        amount=2000,
    )
    assert req["id"].startswith("fandom_request:")
    assert req["fandom"] == "Bleach"
    assert req["email"] == "buyer@example.com"
    assert req["notes"] == "the AO3 one"
    assert req["status"] == "paid"
    assert req["stripe_session_id"] == "cs_test_123"
    assert req["stripe_payment_intent"] == "pi_test_123"
    assert req["amount"] == 2000
    assert req["created_at"]


def test_list_and_filter_fandom_requests(store):
    a = store.create_fandom_request(fandom="Bleach", email="a@x.com", stripe_session_id="cs_a")
    b = store.create_fandom_request(fandom="Fairy Tail", email="b@x.com", stripe_session_id="cs_b")
    store.update_fandom_request(b["id"], status="fulfilled")
    # An unrelated user row must NOT show up in the request listing.
    store._table.put_item(Item={"id": "google-sub-1", "tier": "free"})

    all_reqs = store.list_fandom_requests()
    assert {r["fandom"] for r in all_reqs} == {"Bleach", "Fairy Tail"}

    paid_only = store.list_fandom_requests(status="paid")
    assert [r["fandom"] for r in paid_only] == ["Bleach"]


def test_get_and_update_fandom_request_roundtrip(store):
    req = store.create_fandom_request(fandom="Bleach", email="a@x.com", stripe_session_id="cs_a")
    rid = req["id"]

    got = store.get_fandom_request(rid)
    assert got["fandom"] == "Bleach"

    # Also resolvable by the bare id (what the operator CLI passes).
    short = rid.split(":", 1)[1]
    assert store.get_fandom_request(short)["id"] == rid

    updated = store.update_fandom_request(rid, status="fulfilled", note="indexed 2026-07-09")
    assert updated["status"] == "fulfilled"
    assert updated["updated_at"]
    assert store.get_fandom_request(rid)["status"] == "fulfilled"


def test_update_unknown_request_returns_none(store):
    assert store.update_fandom_request("fandom_request:nope", status="fulfilled") is None


# ── Webhook → request ───────────────────────────────────────────────────────────

def _sponsorship_event(event_id="evt_1", session_id="cs_1"):
    return {
        "id": event_id,
        "type": "checkout.session.completed",
        "data": {
            "object": {
                "id": session_id,
                "payment_intent": "pi_1",
                "amount_total": 2000,
                "customer_details": {"email": "buyer@example.com"},
                "metadata": {"kind": "fandom_sponsorship", "fandom": "Bleach", "notes": "AO3"},
            }
        },
    }


@pytest.fixture
def webhook(monkeypatch):
    """handle_webhook with a fake Stripe event + the singleton store on a fake table.

    Reload user_store + stripe_handler first so we get a clean singleton — other
    webhook tests in the suite reassign store methods on the module singleton and
    reload at their start rather than restoring, so a fresh reload here isolates us.
    """
    import importlib
    import stripe
    import auth.user_store as US
    import auth.stripe_handler as sh

    importlib.reload(US)
    importlib.reload(sh)
    sh.user_store._table = FakeDynamoTable()
    holder = {"event": None}
    monkeypatch.setattr(
        stripe.Webhook, "construct_event", lambda payload, sig, secret: holder["event"]
    )
    return sh, holder


def test_webhook_sponsorship_creates_request(webhook):
    sh, holder = webhook
    holder["event"] = _sponsorship_event()

    sh.handle_webhook(b"{}", "sig")

    reqs = sh.user_store.list_fandom_requests()
    assert len(reqs) == 1
    assert reqs[0]["fandom"] == "Bleach"
    assert reqs[0]["email"] == "buyer@example.com"
    assert reqs[0]["status"] == "paid"
    assert reqs[0]["stripe_session_id"] == "cs_1"


def test_webhook_is_idempotent(webhook):
    sh, holder = webhook
    holder["event"] = _sponsorship_event(event_id="evt_dupe")

    sh.handle_webhook(b"{}", "sig")
    sh.handle_webhook(b"{}", "sig")  # Stripe retry of the same event

    assert len(sh.user_store.list_fandom_requests()) == 1


def test_webhook_ignores_non_sponsorship_sessions(webhook):
    sh, holder = webhook
    ev = _sponsorship_event(event_id="evt_other")
    ev["data"]["object"]["metadata"] = {}  # some other checkout, not a sponsorship
    holder["event"] = ev

    sh.handle_webhook(b"{}", "sig")

    assert sh.user_store.list_fandom_requests() == []
