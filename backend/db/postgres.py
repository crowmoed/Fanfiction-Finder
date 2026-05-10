import os
import sys
import datetime
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import create_engine, Column, String, Integer, Text, Float, DateTime, text, func as sqlfunc
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
    tags = Column(Text)                          # stored as comma-separated string
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
        record.tags = ", ".join(fic.tags)
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
            tags=r.tags.split(", ") if r.tags else [],
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
    """
    if not embeddings:
        return []

    fandom_clause = "AND fandom = :fandom" if fandom is not None else ""
    params: dict = {"per_limit": per_platform_limit}
    if fandom is not None:
        params["fandom"] = fandom

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
            tags=r.tags.split(", ") if r.tags else [],
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
    init_db()