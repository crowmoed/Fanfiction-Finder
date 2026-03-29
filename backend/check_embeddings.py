from db.postgres import engine
from sqlalchemy import text

with engine.connect() as c:
    r = c.execute(text("""
        SELECT fandom, vector_dims(embedding) as dims, COUNT(*) as count
        FROM fics
        WHERE embedding IS NOT NULL
        GROUP BY fandom, vector_dims(embedding)
        ORDER BY fandom
    """))
    for row in r:
        print(f"{row[0]}: {row[1]} dims ({row[2]} fics)")
