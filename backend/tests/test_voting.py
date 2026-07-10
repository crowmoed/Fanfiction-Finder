"""Free community vote: signed-in users pick 1 of 4 randomly-balloted fandoms to
be indexed next. Covers the ballot/vote store and the /vote endpoints.

Uses the in-memory FakeDynamoTable from conftest; no AWS/network.
"""

import importlib

import pytest

from tests.conftest import FakeDynamoTable

CANDIDATES = ["A", "B", "C", "D", "E", "F"]


class PagedFakeTable(FakeDynamoTable):
    """FakeDynamoTable that returns ONE item per scan page (with LastEvaluatedKey),
    so tests exercise the pagination loop in UserStore._scan_all. Ignores
    FilterExpression (like the base); the store's Python-side prefix filter narrows.
    """

    def scan(self, **kw):
        keys = list(self.items.keys())
        start = kw.get("ExclusiveStartKey")
        idx = (keys.index(start["id"]) + 1) if start else 0
        if idx >= len(keys):
            return {"Items": []}
        k = keys[idx]
        out = {"Items": [self.items[k]]}
        if idx + 1 < len(keys):
            out["LastEvaluatedKey"] = {"id": k}
        return out


# ── Store: ballot + votes ───────────────────────────────────────────────────────

@pytest.fixture
def store():
    from auth.user_store import UserStore

    s = UserStore()
    s._table = FakeDynamoTable()
    return s


def test_get_or_create_ballot_picks_four(store):
    ballot = store.get_or_create_ballot(CANDIDATES)
    assert len(ballot["fandoms"]) == 4
    assert set(ballot["fandoms"]).issubset(set(CANDIDATES))
    assert ballot["ballot_id"]


def test_get_or_create_ballot_is_stable(store):
    a = store.get_or_create_ballot(CANDIDATES)
    b = store.get_or_create_ballot(CANDIDATES)  # second call returns the SAME ballot
    assert a["ballot_id"] == b["ballot_id"]
    assert a["fandoms"] == b["fandoms"]


def test_reset_ballot_makes_a_new_round(store):
    a = store.get_or_create_ballot(CANDIDATES)
    b = store.reset_ballot(CANDIDATES)
    assert b["ballot_id"] != a["ballot_id"]
    assert len(b["fandoms"]) == 4


def test_cast_and_change_vote(store):
    ballot = store.get_or_create_ballot(CANDIDATES)
    bid = ballot["ballot_id"]
    f0, f1 = ballot["fandoms"][0], ballot["fandoms"][1]

    store.cast_vote(bid, "u1", f0)
    assert store.get_user_vote(bid, "u1") == f0

    store.cast_vote(bid, "u1", f1)  # change vote — still ONE vote for u1
    assert store.get_user_vote(bid, "u1") == f1
    assert store.tally_votes(bid) == {f1: 1}


def test_tally_counts_per_fandom(store):
    ballot = store.get_or_create_ballot(CANDIDATES)
    bid = ballot["ballot_id"]
    f0, f1 = ballot["fandoms"][0], ballot["fandoms"][1]
    store.cast_vote(bid, "u1", f0)
    store.cast_vote(bid, "u2", f0)
    store.cast_vote(bid, "u3", f1)
    assert store.tally_votes(bid) == {f0: 2, f1: 1}


def test_no_vote_returns_none(store):
    ballot = store.get_or_create_ballot(CANDIDATES)
    assert store.get_user_vote(ballot["ballot_id"], "nobody") is None


# ── Endpoints: /vote ─────────────────────────────────────────────────────────────

@pytest.fixture
def client():
    import api

    importlib.reload(api)
    api.user_store._table = FakeDynamoTable()
    from fastapi.testclient import TestClient

    yield TestClient(api.app, raise_server_exceptions=False)
    api.app.dependency_overrides.clear()


def test_get_vote_returns_ballot(client):
    r = client.get("/vote")
    assert r.status_code == 200
    body = r.json()
    assert len(body["fandoms"]) == 4
    assert body["your_vote"] is None
    # tallies 0-filled for every ballot fandom
    assert all(body["tallies"][f] == 0 for f in body["fandoms"])
    assert body["total"] == 0


def test_post_vote_requires_sign_in(client):
    # No auth override + no Bearer header → get_current_user raises 401.
    r = client.post("/vote", json={"fandom": "A"})
    assert r.status_code == 401


def test_post_vote_records_and_tallies(client):
    import api

    api.app.dependency_overrides[api.get_current_user] = lambda: {"id": "u1", "sub": "u1"}
    fandoms = client.get("/vote").json()["fandoms"]
    pick = fandoms[0]

    r = client.post("/vote", json={"fandom": pick})
    assert r.status_code == 200
    body = r.json()
    assert body["your_vote"] == pick
    assert body["tallies"][pick] == 1
    assert body["total"] == 1


def test_post_vote_rejects_fandom_not_on_ballot(client):
    import api

    api.app.dependency_overrides[api.get_current_user] = lambda: {"id": "u1", "sub": "u1"}
    r = client.post("/vote", json={"fandom": "definitely-not-on-the-ballot"})
    assert r.status_code == 400


# ── Regression: paginated scans (the shared table grows past one 1MB scan page) ──

def test_tally_votes_paginates_across_scan_pages():
    # A single unpaginated Table.scan() only sees the first page. With one item
    # per page, the store must follow LastEvaluatedKey and count every vote.
    from auth.user_store import UserStore

    s = UserStore()
    s._table = PagedFakeTable()
    bid = "ballotX"
    for i in range(7):
        s.cast_vote(bid, f"u{i}", "A" if i < 5 else "B")

    assert s.tally_votes(bid) == {"A": 5, "B": 2}


def test_list_fandom_requests_paginates_across_scan_pages():
    from auth.user_store import UserStore

    s = UserStore()
    s._table = PagedFakeTable()
    for i in range(6):
        s.create_fandom_request(fandom=f"F{i}", email=f"u{i}@x.com")

    assert len(s.list_fandom_requests()) == 6


# ── Security: the destructive ballot reset must fail closed ──────────────────────

def test_admin_vote_reset_fails_closed_without_token(client, monkeypatch):
    import api

    # Unset ADMIN_API_TOKEN → a destructive route must NOT be open to the world.
    monkeypatch.setattr(api, "ADMIN_API_TOKEN", "")
    assert client.post("/admin/vote/reset").status_code == 404


def test_admin_vote_reset_requires_matching_token(client, monkeypatch):
    import api

    monkeypatch.setattr(api, "ADMIN_API_TOKEN", "s3cret")
    assert client.post("/admin/vote/reset").status_code == 403  # missing header
    ok = client.post("/admin/vote/reset", headers={"X-Admin-Token": "s3cret"})
    assert ok.status_code == 200
    assert len(ok.json()["fandoms"]) == 4
