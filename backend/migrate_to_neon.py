import os
from sqlalchemy import create_engine, text
import config

RDS_URL  = os.getenv('DATABASE_URL')
NEON_URL = "postgresql://neondb_owner:npg_RPN4Y1FJZhvf@ep-square-pond-a4jvs9wi-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require"

rds_engine  = create_engine(RDS_URL)
neon_engine = create_engine(NEON_URL)

BATCH_SIZE = 500

def migrate():
    with rds_engine.connect() as src, neon_engine.connect() as dst:

        print("Enabling pgvector extension...")
        dst.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
        dst.commit()

        print("Creating fics table on Neon...")
        dst.execute(text("""
            CREATE TABLE IF NOT EXISTS fics (
                id          TEXT PRIMARY KEY,
                title       TEXT NOT NULL,
                url         TEXT NOT NULL,
                platform    TEXT NOT NULL,
                summary     TEXT,
                tags        TEXT,
                word_count  INTEGER,
                kudos       INTEGER,
                hits        INTEGER,
                fandom      TEXT,
                embedding   vector(768),
                indexed_at  TIMESTAMPTZ DEFAULT NOW()
            )
        """))
        dst.commit()

        total = src.execute(text("SELECT COUNT(*) FROM fics")).scalar()
        print(f"Migrating {total:,} fics from RDS → Neon...\n")

        offset = 0
        migrated = 0
        skipped = 0

        while offset < total:
            rows = src.execute(text(
                f"SELECT id, title, url, platform, summary, tags, word_count, "
                f"kudos, hits, fandom, embedding::text, indexed_at "
                f"FROM fics ORDER BY id LIMIT {BATCH_SIZE} OFFSET {offset}"
            )).fetchall()

            if not rows:
                break

            for row in rows:
                embedding_str = row[10]

                if embedding_str is None:
                    skipped += 1
                    continue

                dst.execute(text(f"""
                    INSERT INTO fics (id, title, url, platform, summary, tags,
                                     word_count, kudos, hits, fandom, embedding, indexed_at)
                    VALUES (:id, :title, :url, :platform, :summary, :tags,
                            :word_count, :kudos, :hits, :fandom,
                            '{embedding_str}'::vector, :indexed_at)
                    ON CONFLICT (id) DO NOTHING
                """), {
                    "id":         row[0],
                    "title":      row[1],
                    "url":        row[2],
                    "platform":   row[3],
                    "summary":    row[4],
                    "tags":       row[5],
                    "word_count": row[6],
                    "kudos":      row[7],
                    "hits":       row[8],
                    "fandom":     row[9],
                    "indexed_at": row[11],
                })

            dst.commit()
            migrated += len(rows) - skipped
            offset += BATCH_SIZE
            pct = (offset / total) * 100
            print(f"  {offset:,} / {total:,} ({pct:.1f}%) — skipped {skipped} null embeddings", end="\r")

        print(f"\nDone. {migrated:,} fics migrated, {skipped} skipped (null embedding).")

        neon_count = dst.execute(text("SELECT COUNT(*) FROM fics")).scalar()
        print(f"Neon fic count: {neon_count:,}")

if __name__ == "__main__":
    migrate()