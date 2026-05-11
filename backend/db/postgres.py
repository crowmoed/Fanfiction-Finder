import os
import sys
import datetime
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import create_engine, Column, String, Integer, Text, Float, DateTime, text, func as sqlfunc
from sqlalchemy.dialects.postgresql import ARRAY
from sqlalchemy.orm import declarative_base, Session
from pgvector.sqlalchemy import Vector
import config
from data.schema import Fic

Base = declarative_base()
engine = create_engine(
    os.getenv("DATABASE_URL"),
    pool_pre_ping=True,    # test connection before using it
    pool_recycle=300,      # recycle connections every 5 minutes
    pool_size=5,
    max_overflow=2,
)

EMBEDDING_DIMS = 768  # Must match embedder.py


class FicRecord(Base):
    __tablename__ = "fics"

    id = Column(String, primary_key=True)        # platform:url hash
    title = Column(String, nullable=False)
    url = Column(String, nullable=False)
    platform = Column(String, nullable=False)
    summary = Column(Text)
    tags = Column(ARRAY(Text))
    word_count = Column(Integer)
    kudos = Column(Integer)
    hits = Column(Integer)
    fandom = Column(String)
    embedding = Column(Vector(EMBEDDING_DIMS))   # pgvector column — 768 dims
    indexed_at = Column(DateTime(timezone=True), server_default=sqlfunc.now())


def init_db():
    """Create tables and enable pgvector extension."""
    with engine.connect() as conn:
        conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
        conn.commit()
    Base.metadata.create_all(engine)
    # Safe migration: add indexed_at to existing tables (no-op if already present)
    with engine.connect() as conn:
        conn.execute(text(
            "ALTER TABLE fics ADD COLUMN IF NOT EXISTS indexed_at TIMESTAMPTZ DEFAULT NOW()"
        ))
        conn.commit()
    print("Database initialized.")


def migrate_embedding_dimensions():
    """Migrate embedding column from old dimensions (e.g. 3072) to EMBEDDING_DIMS.
    
    This is DESTRUCTIVE — all existing embeddings are lost and fics must be re-indexed.
    Only runs if the current column dimensions don't match EMBEDDING_DIMS.
    """
    with engine.connect() as conn:
        # Check current column type
        result = conn.execute(text(
            "SELECT udt_name, character_maximum_length "
            "FROM information_schema.columns "
            "WHERE table_name = 'fics' AND column_name = 'embedding'"
        )).fetchone()

        if result is None:
            print(f"[migrate] No embedding column found — init_db will create it.")
            return

        # pgvector stores dimension in the type modifier; check via pg_attribute
        dim_result = conn.execute(text(
            "SELECT atttypmod FROM pg_attribute "
            "WHERE attrelid = 'fics'::regclass AND attname = 'embedding'"
        )).fetchone()

        if dim_result:
            current_dims = dim_result[0]
            if current_dims == EMBEDDING_DIMS:
                print(f"[migrate] Embedding column already {EMBEDDING_DIMS} dims — no migration needed.")
                return
            print(f"[migrate] Current dims: {current_dims} → migrating to {EMBEDDING_DIMS}")
        else:
            print(f"[migrate] Could not detect current dims — forcing migration.")

        # Drop and recreate the column
        conn.execute(text("ALTER TABLE fics DROP COLUMN IF EXISTS embedding"))
        conn.execute(text(f"ALTER TABLE fics ADD COLUMN embedding vector({EMBEDDING_DIMS})"))
        conn.commit()
        print(f"[migrate] Embedding column recreated as vector({EMBEDDING_DIMS}).")
        print(f"[migrate] ⚠️  ALL existing embeddings are now NULL — re-index all fandoms!")


def migrate_tags_to_array():
    """Convert fics.tags from Text (comma-joined) to text[] in a single transaction.

    Idempotent: detects current column type and no-ops if already an array.
    Empty/NULL tag strings become empty arrays (not NULL) so downstream code
    can treat tags uniformly as a list.
    """
    with engine.begin() as conn:
        type_row = conn.execute(text(
            "SELECT data_type FROM information_schema.columns "
            "WHERE table_name = 'fics' AND column_name = 'tags'"
        )).fetchone()

        if type_row is None:
            print("[migrate-tags] No tags column found — nothing to migrate.")
            return

        data_type = type_row[0]
        if data_type == "ARRAY":
            print("[migrate-tags] tags is already text[] — no-op.")
            return
        if data_type != "text":
            print(f"[migrate-tags] Unexpected data_type '{data_type}' — aborting.")
            return

        pre_count = conn.execute(text("SELECT COUNT(*) FROM fics")).scalar()
        print(f"[migrate-tags] Pre-migration row count: {pre_count}")

        conn.execute(text("ALTER TABLE fics ADD COLUMN tags_arr text[]"))
        conn.execute(text(
            "UPDATE fics SET tags_arr = string_to_array(tags, ', ') "
            "WHERE tags IS NOT NULL AND tags != ''"
        ))
        conn.execute(text(
            "UPDATE fics SET tags_arr = ARRAY[]::text[] "
            "WHERE tags IS NULL OR tags = ''"
        ))
        conn.execute(text("ALTER TABLE fics DROP COLUMN tags"))
        conn.execute(text("ALTER TABLE fics RENAME COLUMN tags_arr TO tags"))

        post_count = conn.execute(text("SELECT COUNT(*) FROM fics")).scalar()
        null_count = conn.execute(text(
            "SELECT COUNT(*) FROM fics WHERE tags IS NULL"
        )).scalar()
        empty_count = conn.execute(text(
            "SELECT COUNT(*) FROM fics WHERE array_length(tags, 1) IS NULL"
        )).scalar()
        print(f"[migrate-tags] Post-migration row count: {post_count}")
        print(f"[migrate-tags] Rows with NULL tags (should be 0): {null_count}")
        print(f"[migrate-tags] Rows with empty tag arrays: {empty_count}")

        sample = conn.execute(text(
            "SELECT id, title, tags FROM fics "
            "WHERE array_length(tags, 1) > 0 LIMIT 5"
        )).fetchall()
        print("[migrate-tags] Sample rows:")
        for row in sample:
            print(f"  {row.id} | {row.title} | {row.tags}")


def add_search_text_column():
    """Add a generated tsvector column `search_text` on fics + GIN index for BM25.

    Combines title (weight A), tags (weight B), and summary (weight C) into a single
    tsvector populated automatically by Postgres. Idempotent — no-op if the column
    already exists.
    """
    with engine.begin() as conn:
        existing = conn.execute(text(
            "SELECT data_type FROM information_schema.columns "
            "WHERE table_name = 'fics' AND column_name = 'search_text'"
        )).fetchone()

        if existing is not None:
            print(f"[add-search-text] search_text column already exists (type={existing[0]}) — no-op.")
            return

        row_count = conn.execute(text("SELECT COUNT(*) FROM fics")).scalar()
        print(f"[add-search-text] Pre-ALTER row count: {row_count}")

        conn.execute(text("""
            ALTER TABLE fics ADD COLUMN search_text tsvector GENERATED ALWAYS AS (
              setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
              setweight(to_tsvector('english', array_to_string(coalesce(tags, ARRAY[]::text[]), ' ')), 'B') ||
              setweight(to_tsvector('english', coalesce(summary, '')), 'C')
            ) STORED
        """))
        print("[add-search-text] Added generated search_text tsvector column.")

        conn.execute(text(
            "CREATE INDEX IF NOT EXISTS fics_search_text_idx ON fics USING GIN (search_text)"
        ))
        print("[add-search-text] Created GIN index fics_search_text_idx.")

        col_info = conn.execute(text(
            "SELECT data_type, udt_name FROM information_schema.columns "
            "WHERE table_name = 'fics' AND column_name = 'search_text'"
        )).fetchone()
        print(f"[add-search-text] Column confirmed: data_type={col_info[0]}, udt_name={col_info[1]}")

        idx_exists = conn.execute(text(
            "SELECT indexname FROM pg_indexes "
            "WHERE tablename = 'fics' AND indexname = 'fics_search_text_idx'"
        )).fetchone()
        print(f"[add-search-text] Index confirmed: {idx_exists[0] if idx_exists else 'MISSING'}")

        null_count = conn.execute(text(
            "SELECT COUNT(*) FROM fics WHERE search_text IS NULL"
        )).scalar()
        print(f"[add-search-text] Rows with NULL search_text (should be 0): {null_count}")

        samples = conn.execute(text(
            "SELECT id, title, search_text FROM fics WHERE search_text IS NOT NULL LIMIT 3"
        )).fetchall()
        print("[add-search-text] Sample populated rows:")
        for row in samples:
            tsv_preview = str(row.search_text)[:200]
            print(f"  {row.id} | {row.title}")
            print(f"    search_text: {tsv_preview}...")

        print("[add-search-text] Sample BM25 query for 'time travel':")
        bm25_rows = conn.execute(text("""
            SELECT id, title, ts_rank_cd(search_text, q) AS rank
            FROM fics, plainto_tsquery('english', 'time travel') AS q
            WHERE search_text @@ q
            ORDER BY rank DESC
            LIMIT 5
        """)).fetchall()
        for row in bm25_rows:
            print(f"  rank={row.rank:.4f} | {row.id} | {row.title}")


def upsert_fic(fic: Fic, fandom: str, embedding: list[float]):
    """Insert or update a fic record with its embedding."""
    fic_id = f"{fic.platform}:{fic.url}"

    with Session(engine) as session:
        record = session.get(FicRecord, fic_id)
        if not record:
            record = FicRecord(id=fic_id)

        record.title = fic.title
        record.url = fic.url
        record.platform = fic.platform
        record.summary = fic.summary
        record.tags = list(fic.tags) if fic.tags else []
        record.word_count = fic.word_count
        record.kudos = fic.kudos
        record.hits = fic.hits
        record.fandom = fandom
        record.embedding = embedding
        record.indexed_at = datetime.datetime.now(datetime.timezone.utc)

        session.merge(record)
        session.commit()


def search_similar(query_embedding: list[float], fandom: str | None, limit: int = 50) -> list[Fic]:
    """Find fics whose embeddings are closest to the query embedding.

    If fandom is None, searches across all fandoms.
    """
    with Session(engine) as session:
        query = session.query(FicRecord).filter(FicRecord.embedding.isnot(None))
        if fandom is not None:
            query = query.filter(FicRecord.fandom == fandom)
        results = (
            query
            .order_by(FicRecord.embedding.cosine_distance(query_embedding))
            .limit(limit)
            .all()
        )

    fics = []
    for r in results:
        fics.append(Fic(
            title=r.title,
            url=r.url,
            platform=r.platform,
            summary=r.summary,
            tags=list(r.tags) if r.tags else [],
            word_count=r.word_count,
            kudos=r.kudos,
            hits=r.hits
        ))
    return fics


PLATFORMS = ("ao3", "ffn", "wattpad")
RRF_K = 60  # Standard RRF constant — dampens impact of low-ranked results.


def search_rrf(
    embeddings: list[list[float]],
    fandom: str | None,
    per_platform_limit: int = 40,
    total_limit: int | None = 100,
    filters: dict | None = None,
) -> list[Fic]:
    """Vector search across multiple query embeddings, fused via Reciprocal Rank Fusion.

    Runs one ranked vector search per embedding per platform (AO3, FFN, Wattpad) in a single
    SQL round trip, scores each fic by RRF across every ranked list it appears in, and
    returns the top candidates. Per-platform quotas guarantee FFN and Wattpad get
    representation in the candidate pool even when AO3's tag-rich embeddings dominate.

    Args:
        embeddings: list of query embedding vectors (e.g. 3 HyDE + 1 raw = 4 lists)
        fandom: optional fandom filter; None searches across all fandoms
        per_platform_limit: top-N per (embedding, platform) pulled into the fusion pool
        total_limit: max fics returned after fusion; None returns all deduped candidates
        filters: optional dict of hard filters applied to each ranked CTE. Recognized keys:
            min_word_count (int), max_word_count (int), excluded_tags (list[str]).
    """
    if not embeddings:
        return []

    fandom_clause = "AND fandom = :fandom" if fandom is not None else ""
    params: dict = {"per_limit": per_platform_limit}
    if fandom is not None:
        params["fandom"] = fandom

    # Build extra WHERE fragment from filters. Filter keys are not user-controlled
    # (set by the API layer), values bound as SQL params — never f-string'd.
    filter_clauses: list[str] = []
    applied_log: list[str] = []
    if filters:
        min_wc = filters.get("min_word_count")
        if isinstance(min_wc, int) and min_wc > 0:
            filter_clauses.append("AND word_count IS NOT NULL AND word_count >= :min_word_count")
            params["min_word_count"] = min_wc
            applied_log.append(f"min_word_count={min_wc}")
        max_wc = filters.get("max_word_count")
        if isinstance(max_wc, int) and max_wc > 0:
            filter_clauses.append("AND word_count IS NOT NULL AND word_count <= :max_word_count")
            params["max_word_count"] = max_wc
            applied_log.append(f"max_word_count={max_wc}")
        excluded = filters.get("excluded_tags")
        if isinstance(excluded, list) and excluded:
            filter_clauses.append("AND NOT (tags && CAST(:excluded_tags AS text[]))")
            params["excluded_tags"] = excluded
            applied_log.append(f"excluded_tags={excluded}")
    filter_fragment = " ".join(filter_clauses)
    print(f"[search_rrf] filters applied: {', '.join(applied_log) if applied_log else 'none'}", flush=True)

    # Build one ranked CTE per (embedding, platform) pair, UNION them, then RRF-score.
    # pgvector's <=> is cosine distance; ORDER BY distance asc → lower rank number = better match.
    ranked_ctes = []
    for e_idx, emb in enumerate(embeddings):
        params[f"emb{e_idx}"] = str(emb)  # pgvector accepts "[0.1, 0.2, ...]" text form
        for platform in PLATFORMS:
            cte_name = f"r_{e_idx}_{platform}"
            params[f"plat_{e_idx}_{platform}"] = platform
            ranked_ctes.append(f"""
                {cte_name} AS (
                    SELECT id, ROW_NUMBER() OVER (ORDER BY embedding <=> CAST(:emb{e_idx} AS vector)) AS rnk
                    FROM fics
                    WHERE embedding IS NOT NULL
                      AND platform = :plat_{e_idx}_{platform}
                      {fandom_clause}
                      {filter_fragment}
                    ORDER BY embedding <=> CAST(:emb{e_idx} AS vector)
                    LIMIT :per_limit
                )
            """)

    union_parts = [f"SELECT id, rnk FROM r_{e_idx}_{platform}"
                   for e_idx in range(len(embeddings))
                   for platform in PLATFORMS]
    union_sql = " UNION ALL ".join(union_parts)

    if total_limit is not None:
        limit_clause = "LIMIT :total_limit"
        params["total_limit"] = total_limit
    else:
        limit_clause = ""

    sql = f"""
        WITH {", ".join(ranked_ctes)},
        fused AS (
            SELECT id, SUM(1.0 / ({RRF_K} + rnk)) AS rrf_score
            FROM ({union_sql}) ranked
            GROUP BY id
        )
        SELECT f.id, f.title, f.url, f.platform, f.summary, f.tags,
               f.word_count, f.kudos, f.hits, fused.rrf_score
        FROM fused
        JOIN fics f ON f.id = fused.id
        ORDER BY fused.rrf_score DESC
        {limit_clause}
    """

    with engine.connect() as conn:
        rows = conn.execute(text(sql), params).all()

    return [
        Fic(
            title=r.title,
            url=r.url,
            platform=r.platform,
            summary=r.summary,
            tags=list(r.tags) if r.tags else [],
            word_count=r.word_count,
            kudos=r.kudos,
            hits=r.hits,
        )
        for r in rows
    ]


def ensure_vector_index():
    """Create an HNSW index on fics.embedding if missing. HNSW gives sub-linear
    ANN search vs. the default sequential scan — a large win at 4 query vectors
    across 3 platforms per search.
    """
    with engine.connect() as conn:
        conn.execute(text(
            "CREATE INDEX IF NOT EXISTS fics_embedding_hnsw "
            "ON fics USING hnsw (embedding vector_cosine_ops)"
        ))
        # Partial index on platform speeds up per-platform ranked CTEs.
        conn.execute(text(
            "CREATE INDEX IF NOT EXISTS fics_platform_idx ON fics (platform)"
        ))
        conn.execute(text(
            "CREATE INDEX IF NOT EXISTS fics_fandom_platform_idx ON fics (fandom, platform)"
        ))
        conn.commit()


def get_fic_count(fandom: str = None) -> int:
    """Return total fics indexed, optionally filtered by fandom."""
    with Session(engine) as session:
        query = session.query(FicRecord)
        if fandom:
            query = query.filter(FicRecord.fandom == fandom)
        return query.count()

def get_indexed_fandoms() -> set[str]:
    """Return the set of fandoms that have at least one fic indexed."""
    with Session(engine) as session:
        rows = session.query(FicRecord.fandom).distinct().all()
    return {r.fandom for r in rows if r.fandom}


def get_admin_stats() -> dict:
    """Return per-fandom, per-platform counts and last indexed timestamps."""
    with Session(engine) as session:
        rows = session.query(
            FicRecord.fandom,
            FicRecord.platform,
            sqlfunc.count(FicRecord.id).label("count"),
            sqlfunc.max(FicRecord.indexed_at).label("last_indexed"),
            sqlfunc.avg(FicRecord.word_count).label("avg_words"),
            sqlfunc.sum(FicRecord.kudos).label("total_kudos"),
        ).group_by(FicRecord.fandom, FicRecord.platform).all()

        total_fics = session.query(FicRecord).count()

    fandom_map: dict = {}
    for row in rows:
        key = row.fandom
        if key not in fandom_map:
            fandom_map[key] = {
                "fandom": key,
                "ao3_count": 0,
                "ffn_count": 0,
                "wattpad_count": 0,
                "total": 0,
                "last_indexed": None,
                "avg_word_count": None,
                "total_kudos": 0,
            }
        count = row.count or 0
        last = row.last_indexed.isoformat() if row.last_indexed else None
        avg_w = int(row.avg_words) if row.avg_words else None
        kudos = int(row.total_kudos) if row.total_kudos else 0

        if row.platform == "ao3":
            fandom_map[key]["ao3_count"] = count
        elif row.platform == "ffn":
            fandom_map[key]["ffn_count"] = count
        elif row.platform == "wattpad":
            fandom_map[key]["wattpad_count"] = count

        fandom_map[key]["total"] += count
        fandom_map[key]["total_kudos"] += kudos

        if last and (fandom_map[key]["last_indexed"] is None or last > fandom_map[key]["last_indexed"]):
            fandom_map[key]["last_indexed"] = last

        if avg_w is not None:
            fandom_map[key]["avg_word_count"] = avg_w

    return {
        "total_fics": total_fics,
        "fandoms": list(fandom_map.values()),
    }


def clear_fandom(fandom: str):
    """Delete all fics for a fandom so it can be re-indexed."""
    with Session(engine) as session:
        deleted = session.query(FicRecord).filter(FicRecord.fandom == fandom).delete()
        session.commit()
        print(f"Cleared {deleted} fics for '{fandom}'")

        
if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "migrate-tags":
        migrate_tags_to_array()
    elif len(sys.argv) > 1 and sys.argv[1] == "add-search-text":
        add_search_text_column()
    else:
        print("Usage: python -m db.postgres [migrate-tags | add-search-text]")
        print("(no arg) — runs init_db()")
        init_db()