import os
import sys
import datetime
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import create_engine, Column, String, Integer, Text, Float, DateTime, text, func as sqlfunc
from sqlalchemy.orm import declarative_base, Session
from pgvector.sqlalchemy import Vector
from dotenv import load_dotenv
from data.schema import Fic

load_dotenv()

Base = declarative_base()
engine = create_engine(os.getenv("DATABASE_URL"))


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
    embedding = Column(Vector(3072))            # pgvector column
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


def search_similar(query_embedding: list[float], fandom: str, limit: int = 50, min_words: int = 0) -> list[Fic]:
    """Find fics whose embeddings are closest to the query embedding.

    If min_words is set, filters by word count and tops up with the longest
    matching fics if there aren't enough semantic matches to fill limit."""
    with Session(engine) as session:
        q = session.query(FicRecord).filter(FicRecord.fandom == fandom)
        if min_words > 0:
            q = q.filter(FicRecord.word_count >= min_words)

        results = list(
            q.order_by(FicRecord.embedding.cosine_distance(query_embedding))
            .limit(limit)
            .all()
        )

        # Top up with longest word-count-matching fics if we fell short
        if min_words > 0 and len(results) < limit:
            seen_ids = {r.id for r in results}
            extra_q = (
                session.query(FicRecord)
                .filter(FicRecord.fandom == fandom, FicRecord.word_count >= min_words)
            )
            if seen_ids:
                extra_q = extra_q.filter(FicRecord.id.notin_(seen_ids))
            extra = extra_q.order_by(FicRecord.word_count.desc()).limit(limit - len(results)).all()
            results = results + list(extra)

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

        fandom_map[key]["total"] += count
        fandom_map[key]["total_kudos"] += kudos

        # Keep the most recent last_indexed across platforms
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