import os
import sys
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from dotenv import load_dotenv
from sqlalchemy import create_engine, text

load_dotenv()

engine = create_engine(os.getenv("DATABASE_URL"))

with engine.connect() as conn:
    total = conn.execute(text("SELECT COUNT(*) FROM fics")).scalar()
    rows = conn.execute(text("SELECT fandom, COUNT(*) as count FROM fics GROUP BY fandom ORDER BY count DESC")).fetchall()

print(f"\nTotal fics: {total}\n")
for fandom, count in rows:
    print(f"  {fandom}: {count}")
print()