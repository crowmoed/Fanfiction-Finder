"""Cancellation-aware /search: when the client disconnects (the Next proxy
aborts its upstream request), the route must stop at the next checkpoint
instead of running the remaining Bedrock/Gemini/Postgres stages for a socket
that's already closed.

TestClient can't produce a real mid-request disconnect, so these tests patch
Request.is_disconnected and assert which pipeline stages actually ran.
"""

import types

import pytest


@pytest.fixture
def pipeline(monkeypatch):
    """Stub every pipeline stage on the api module, recording call order."""
    import api
    from data.schema import Fic

    calls = []
    fic_a = Fic(title="Fic A", url="https://example.org/a", platform="AO3")

    monkeypatch.setattr(api, "get_fic_count", lambda fandom=None: 42)
    monkeypatch.setattr(
        api,
        "enhance_query",
        lambda q, fandom=None: calls.append("enhance")
        or types.SimpleNamespace(
            semantic_descriptions=["hyde one", "hyde two", "hyde three"],
            ao3_filters=None,
            ffn_filters=None,
            excluded_tags=[],
        ),
    )
    monkeypatch.setattr(
        api, "embed_query", lambda text: calls.append("embed") or [0.1, 0.2, 0.3]
    )
    monkeypatch.setattr(
        api, "search_rrf", lambda **kw: calls.append("retrieve") or [fic_a]
    )
    monkeypatch.setattr(
        api, "rank", lambda fics, query: calls.append("rank") or fics
    )
    monkeypatch.setattr(
        api.user_store,
        "increment_searches",
        lambda uid: calls.append("increment"),
    )
    monkeypatch.setattr(
        api.user_store, "record_search_event", lambda uid, **kw: None
    )

    api.app.dependency_overrides[api.get_optional_user] = lambda: {
        "id": "u1",
        "tier": "free",
    }
    try:
        yield calls
    finally:
        api.app.dependency_overrides.pop(api.get_optional_user, None)


def _client():
    import api
    from fastapi.testclient import TestClient

    return TestClient(api.app, raise_server_exceptions=False)


def _search(client):
    return client.get("/search", params={"q": "found family", "fandom": "All Fandoms"})


def test_disconnect_before_pipeline_skips_every_stage(monkeypatch, pipeline):
    import api

    async def _gone(self) -> bool:
        return True

    monkeypatch.setattr(api.Request, "is_disconnected", _gone)

    r = _search(_client())
    assert r.status_code == 499
    assert pipeline == []


def test_disconnect_mid_pipeline_stops_at_next_checkpoint(monkeypatch, pipeline):
    import api

    # First checkpoint (before_enhance) sees a live client; every later one
    # sees the disconnect. Enhance runs; embed/retrieve/rank must not.
    checks = {"n": 0}

    async def _gone_after_first(self) -> bool:
        checks["n"] += 1
        return checks["n"] > 1

    monkeypatch.setattr(api.Request, "is_disconnected", _gone_after_first)

    r = _search(_client())
    assert r.status_code == 499
    assert pipeline == ["enhance"]


def test_connected_client_runs_full_pipeline(monkeypatch, pipeline):
    import api

    async def _alive(self) -> bool:
        return False

    monkeypatch.setattr(api.Request, "is_disconnected", _alive)

    r = _search(_client())
    assert r.status_code == 200
    assert [f["title"] for f in r.json()] == ["Fic A"]
    # 4 embeds: raw query + 3 HyDE descriptions.
    assert pipeline == [
        "enhance",
        "embed",
        "embed",
        "embed",
        "embed",
        "retrieve",
        "rank",
        "increment",
    ]
