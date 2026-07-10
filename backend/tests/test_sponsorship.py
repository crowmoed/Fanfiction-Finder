"""Free "request a fandom" flow: records the request + emails the operator.

Covers the request store and the POST /request endpoint. Uses the in-memory
FakeDynamoTable from conftest; the email send is monkeypatched (no SMTP).
"""

import importlib

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

def test_create_fandom_request_defaults_to_requested(store):
    req = store.create_fandom_request(fandom="Bleach", email="a@x.com", notes="the AO3 one")
    assert req["id"].startswith("fandom_request:")
    assert req["fandom"] == "Bleach"
    assert req["email"] == "a@x.com"
    assert req["notes"] == "the AO3 one"
    assert req["status"] == "requested"
    assert req["created_at"]


def test_list_and_filter_requests(store):
    store.create_fandom_request(fandom="Bleach", email="a@x.com")
    b = store.create_fandom_request(fandom="Fairy Tail", email="b@x.com")
    store.update_fandom_request(b["id"], status="fulfilled")
    # An unrelated user row must NOT show up in the request listing.
    store._table.put_item(Item={"id": "google-sub-1", "tier": "free"})

    assert {r["fandom"] for r in store.list_fandom_requests()} == {"Bleach", "Fairy Tail"}
    assert [r["fandom"] for r in store.list_fandom_requests(status="requested")] == ["Bleach"]


def test_get_and_update_request_roundtrip(store):
    req = store.create_fandom_request(fandom="Bleach", email="a@x.com")
    rid = req["id"]

    assert store.get_fandom_request(rid)["fandom"] == "Bleach"
    # Also resolvable by the bare uuid (what the operator CLI passes).
    assert store.get_fandom_request(rid.split(":", 1)[1])["id"] == rid

    updated = store.update_fandom_request(rid, status="fulfilled", note="indexed")
    assert updated["status"] == "fulfilled"
    assert updated["updated_at"]
    assert store.get_fandom_request(rid)["status"] == "fulfilled"


def test_update_unknown_request_returns_none(store):
    assert store.update_fandom_request("fandom_request:nope", status="fulfilled") is None


# ── Endpoint: POST /request ──────────────────────────────────────────────────────

@pytest.fixture
def client():
    import api

    importlib.reload(api)
    api.user_store._table = FakeDynamoTable()
    from fastapi.testclient import TestClient

    yield TestClient(api.app, raise_server_exceptions=False)
    api.app.dependency_overrides.clear()


def test_request_records_and_emails(client, monkeypatch):
    import api

    sent = {}
    monkeypatch.setattr(
        api.notify, "send_request_email",
        lambda fandom, notes="", requester_email="": sent.update(
            fandom=fandom, notes=notes, email=requester_email
        ),
    )
    r = client.post("/request", json={"fandom_name": "Bleach", "notes": "AO3", "email": "me@x.com"})
    assert r.status_code == 200
    assert r.json()["ok"] is True
    assert sent == {"fandom": "Bleach", "notes": "AO3", "email": "me@x.com"}

    reqs = api.user_store.list_fandom_requests()
    assert len(reqs) == 1
    assert reqs[0]["fandom"] == "Bleach"
    assert reqs[0]["status"] == "requested"


def test_request_rejects_empty_fandom(client):
    assert client.post("/request", json={"fandom_name": "   "}).status_code == 400


def test_request_records_even_if_email_fails(client, monkeypatch):
    import api

    def boom(*a, **k):
        raise RuntimeError("smtp down")

    monkeypatch.setattr(api.notify, "send_request_email", boom)
    r = client.post("/request", json={"fandom_name": "Naruto"})
    assert r.status_code == 200  # email failure is swallowed
    assert len(api.user_store.list_fandom_requests()) == 1  # still recorded
