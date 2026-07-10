"""Per-variant retrieval exposure (the board's "by rewritten prompt" split).

Covers the two halves of the wiring:
  - db.postgres.search_rrf_with_variants — SQL shape, param binding, and the
    reassembly of per-embedding lists (ordered by cosine distance, sharing Fic
    objects with the fused list).
  - GET /search?include_variants=true — response shape {results, variants},
    variant keys/labels, and the default path still returning a bare list.
"""

import types

import pytest


# ──────────────────────────────────────────────────────────────────────────────
# db layer
# ──────────────────────────────────────────────────────────────────────────────


def _row(id_, title, variant_hits=None, **overrides):
    base = dict(
        id=id_,
        title=title,
        url=f"https://example.org/{id_}",
        platform="AO3",
        fandom="Naruto",
        summary="s",
        tags=["a"],
        word_count=1000,
        kudos=5,
        hits=10,
        meta=None,
        rrf_score=0.5,
    )
    base.update(overrides)
    if variant_hits is not None:
        base["variant_hits"] = variant_hits
    return types.SimpleNamespace(**base)


class _FakeConn:
    def __init__(self, rows, captured):
        self._rows = rows
        self._captured = captured

    def execute(self, stmt, params):
        self._captured["sql"] = str(stmt)
        self._captured["params"] = params
        rows = self._rows
        return types.SimpleNamespace(all=lambda: rows)

    def __enter__(self):
        return self

    def __exit__(self, *exc):
        return False


class _FakeEngine:
    def __init__(self, rows, captured):
        self._rows = rows
        self._captured = captured

    def connect(self):
        return _FakeConn(self._rows, self._captured)


def test_search_rrf_with_variants_reassembles_per_embedding_lists(monkeypatch):
    import db.postgres as P

    # Fused order (rrf) is [A, B]; embedding 0 saw B closer than A, embedding 1
    # only ever retrieved A. Embeddings 2/3 retrieved nothing.
    rows = [
        _row("a", "Fic A", variant_hits=[{"eidx": 0, "dist": 0.2}, {"eidx": 1, "dist": 0.05}]),
        _row("b", "Fic B", variant_hits=[{"eidx": 0, "dist": 0.1}]),
    ]
    captured = {}
    monkeypatch.setattr(P, "engine", _FakeEngine(rows, captured))

    embeddings = [[0.1, 0.2], [0.3, 0.4], [0.5, 0.6], [0.7, 0.8]]
    fused, variants = P.search_rrf_with_variants(embeddings, fandom="Naruto")

    assert [f.title for f in fused] == ["Fic A", "Fic B"]
    assert len(variants) == len(embeddings)
    # Ordered by that embedding's cosine distance, not by fusion rank.
    assert [f.title for f in variants[0]] == ["Fic B", "Fic A"]
    assert [f.title for f in variants[1]] == ["Fic A"]
    assert variants[2] == [] and variants[3] == []
    # Same objects, not copies — the ranker's in-place scores must flow through.
    assert variants[0][0] is fused[1]
    assert variants[0][1] is fused[0]

    sql = captured["sql"]
    assert "variant_hits" in sql and "json_agg" in sql
    # Values stay bound as params, never interpolated into the SQL text.
    assert "Naruto" not in sql
    assert captured["params"]["fandom"] == "Naruto"
    assert captured["params"]["emb0"] == str(embeddings[0])


def test_search_rrf_plain_path_unchanged(monkeypatch):
    import db.postgres as P

    # Legacy rows carry NO variant_hits column — the plain path must not touch it.
    rows = [_row("a", "Fic A"), _row("b", "Fic B")]
    captured = {}
    monkeypatch.setattr(P, "engine", _FakeEngine(rows, captured))

    fics = P.search_rrf([[0.1, 0.2]], fandom=None)

    assert [f.title for f in fics] == ["Fic A", "Fic B"]
    assert "variant_hits" not in captured["sql"]
    assert "json_agg" not in captured["sql"]


def test_search_rrf_empty_embeddings():
    import db.postgres as P

    assert P.search_rrf([], fandom=None) == []
    assert P.search_rrf_with_variants([], fandom=None) == ([], [])


# ──────────────────────────────────────────────────────────────────────────────
# API layer
# ──────────────────────────────────────────────────────────────────────────────


@pytest.fixture
def search_client(monkeypatch):
    import api
    from data.schema import Fic
    from fastapi.testclient import TestClient

    fic_a = Fic(title="Fic A", url="https://example.org/a", platform="AO3")
    fic_b = Fic(title="Fic B", url="https://example.org/b", platform="FFN")
    descriptions = ["hyde one", "hyde two", "hyde three"]

    monkeypatch.setattr(api, "get_fic_count", lambda fandom=None: 42)
    monkeypatch.setattr(
        api,
        "enhance_query",
        lambda q, fandom=None: types.SimpleNamespace(
            semantic_descriptions=descriptions,
            ao3_filters=None,
            ffn_filters=None,
            excluded_tags=[],
        ),
    )
    monkeypatch.setattr(api, "embed_query", lambda text: [0.1, 0.2, 0.3])
    monkeypatch.setattr(
        api,
        "search_rrf",
        lambda **kw: [fic_a, fic_b],
    )
    monkeypatch.setattr(
        api,
        "search_rrf_with_variants",
        lambda **kw: ([fic_a, fic_b], [[fic_b, fic_a], [fic_a], [fic_b], []]),
    )
    monkeypatch.setattr(api, "rank", lambda fics, query: fics)
    monkeypatch.setattr(api.user_store, "increment_searches", lambda uid: None)
    monkeypatch.setattr(
        api.user_store, "record_search_event", lambda uid, **kw: None
    )

    api.app.dependency_overrides[api.get_optional_user] = lambda: {
        "id": "u1",
        "tier": "free",
    }
    try:
        yield TestClient(api.app, raise_server_exceptions=False)
    finally:
        api.app.dependency_overrides.pop(api.get_optional_user, None)


def test_search_default_returns_bare_list(search_client):
    r = search_client.get("/search", params={"q": "found family", "fandom": "All Fandoms"})
    assert r.status_code == 200
    body = r.json()
    assert isinstance(body, list)
    assert [f["title"] for f in body] == ["Fic A", "Fic B"]


def test_search_include_variants_returns_results_and_variants(search_client):
    r = search_client.get(
        "/search",
        params={"q": "found family", "fandom": "All Fandoms", "include_variants": "true"},
    )
    assert r.status_code == 200
    body = r.json()
    assert set(body.keys()) == {"results", "variants"}
    assert [f["title"] for f in body["results"]] == ["Fic A", "Fic B"]

    variants = body["variants"]
    assert [v["key"] for v in variants] == ["raw", "hyde-1", "hyde-2", "hyde-3"]
    # raw is labeled with the user's own query; HyDE variants with their prompts.
    assert variants[0]["label"] == "found family"
    assert [v["label"] for v in variants[1:]] == ["hyde one", "hyde two", "hyde three"]
    # Per-variant lists keep their own retrieval order.
    assert [f["title"] for f in variants[0]["fics"]] == ["Fic B", "Fic A"]
    assert variants[3]["fics"] == []
