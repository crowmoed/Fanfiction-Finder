import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()
engine = create_engine(os.getenv('DATABASE_URL'))

print("Running VACUUM FULL... (this may take a few minutes)")
with engine.connect().execution_options(isolation_level="AUTOCOMMIT") as conn:
    conn.execute(text("VACUUM FULL ANALYZE fics"))
    print("VACUUM FULL complete.")

with engine.connect() as conn:
    db_size = conn.execute(text("SELECT pg_size_pretty(pg_database_size('neondb'))")).scalar()
    tbl_size = conn.execute(text("SELECT pg_size_pretty(pg_total_relation_size('fics'))")).scalar()
    print(f"DB size:    {db_size}")
    print(f"Fics table: {tbl_size}")