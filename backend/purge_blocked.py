"""Scan the fics index for content-filter violations (sexual-minor content).

Dry run by default — prints a count and samples, deletes nothing:
    python purge_blocked.py

Actually delete the flagged rows:
    python purge_blocked.py --delete

The search path already refuses to surface these rows (`_search_rrf` gate), so
this purge is cleanup, not the safety mechanism.
"""

import sys
from collections import Counter

import config  # noqa: F401 — loads repo-root .env (DATABASE_URL)
from sqlalchemy import text

from content_filter import is_blocked, _meta_warnings, _tag_blocked
from db.postgres import engine


def main() -> None:
    delete = "--delete" in sys.argv

    # Fic titles contain non-cp1252 characters; don't let a Windows console kill the run.
    for stream in (sys.stdout, sys.stderr):
        if hasattr(stream, "reconfigure"):
            stream.reconfigure(encoding="utf-8", errors="replace")

    with engine.connect() as conn:
        rows = conn.execute(text(
            "SELECT id, title, platform, fandom, tags, summary, meta FROM fics"
        )).all()

    blocked = [
        r for r in rows
        if is_blocked(tags=list(r.tags) if r.tags else [],
                      title=r.title, summary=r.summary, meta=r.meta)
    ]

    print(f"Scanned {len(rows):,} fics — {len(blocked):,} blocked.")

    by_platform = Counter(r.platform for r in blocked)
    print(f"By platform: {dict(by_platform)}")

    # Tally which tag tripped the filter (or title/summary text) so false
    # positives in the blocklist are easy to spot before deleting anything.
    triggers: Counter = Counter()
    for r in blocked:
        candidates = list(r.tags or []) + _meta_warnings(r.meta)
        hit = next((t for t in candidates if isinstance(t, str) and _tag_blocked(t)), None)
        triggers[hit.lower() if hit else "(title/summary text)"] += 1
    print("\nTop trigger tags:")
    for tag, n in triggers.most_common(25):
        print(f"  {n:>6,}  {tag}")

    print("\nSample blocked fics:")
    for r in blocked[:25]:
        tags_preview = list(r.tags or [])[:8]
        print(f"  [{r.platform}] {r.fandom} | {r.title!r} | tags={tags_preview}")
    if len(blocked) > 25:
        print(f"  ... and {len(blocked) - 25:,} more")

    if not blocked:
        return

    if delete:
        ids = [r.id for r in blocked]
        with engine.begin() as conn:
            result = conn.execute(
                text("DELETE FROM fics WHERE id = ANY(:ids)"), {"ids": ids}
            )
        print(f"Deleted {result.rowcount:,} fics from the index.")
    else:
        print("\nDry run — re-run with --delete to remove these from the index.")


if __name__ == "__main__":
    main()
