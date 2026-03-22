import os
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import create_engine, Column, String, Integer, Text, Float
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


def init_db():
    """Create tables and enable pgvector extension."""
    with engine.connect() as conn:
        conn.execute(__import__("sqlalchemy").text("CREATE EXTENSION IF NOT EXISTS vector"))
        conn.commit()
    Base.metadata.create_all(engine)
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

        session.merge(record)
        session.commit()


def search_similar(query_embedding: list[float], fandom: str, limit: int = 50) -> list[Fic]:
    """Find fics whose embeddings are closest to the query embedding."""
    with Session(engine) as session:
        results = (
            session.query(FicRecord)
            .filter(FicRecord.fandom == fandom)
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


def clear_fandom(fandom: str):
    """Delete all fics for a fandom so it can be re-indexed."""
    with Session(engine) as session:
        deleted = session.query(FicRecord).filter(FicRecord.fandom == fandom).delete()
        session.commit()
        print(f"Cleared {deleted} fics for '{fandom}'")
        
if __name__ == "__main__":
    init_db()