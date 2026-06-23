#!/usr/bin/env python3
"""
rq.py — Quick reference: expected fic counts vs what's indexed in the DB.

Queries each platform's live API/site for available totals, then compares
against what's currently stored in Postgres.

Usage:
    python rq.py "Attack on Titan"
    python rq.py --all
"""

import sys
import os
import re
import requests

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

import config
from data.fandoms import FANDOMS
from db.postgres import engine
from sqlalchemy import text

MIN_WORDS = 20000  # must match indexer.py


# ── DB ────────────────────────────────────────────────────────────────────────

def get_db_counts(fandom: str) -> dict:
    with engine.connect() as conn:
        rows = conn.execute(text(
            "SELECT platform, COUNT(*) FROM fics "
            "WHERE fandom = :fandom GROUP BY platform"
        ), {"fandom": fandom}).fetchall()
    counts = {"ao3": 0, "ffn": 0, "wattpad": 0}
    for platform, count in rows:
        if platform in counts:
            counts[platform] = count
    return counts


# ── Live totals ───────────────────────────────────────────────────────────────

def ao3_total(fandom: str) -> int | None:
    ao3_tag = FANDOMS[fandom]["ao3"]
    if not ao3_tag:
        return None
    try:
        encoded = ao3_tag.replace(" ", "+").replace("&", "*a*")
        url = (
            f"https://archiveofourown.org/works"
            f"?commit=Sort+and+Filter"
            f"&work_search%5Bsort_column%5D=kudos_count"
            f"&work_search%5Bwords_from%5D={MIN_WORDS}"
            f"&tag_id={encoded}"
        )
        resp = requests.get(url, timeout=15, headers={
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                          "(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        })
        # AO3 shows e.g. "1 - 20 of 12,345 Works"
        match = re.search(r"of\s+([\d,]+)\s+Works?", resp.text)
        if match:
            return int(match.group(1).replace(",", ""))
        # fallback: just any number before "Works"
        match = re.search(r"([\d,]+)\s+Works?", resp.text)
        if match:
            return int(match.group(1).replace(",", ""))
        return None
    except Exception:
        return None


def ffn_total(fandom: str) -> int | None:
    ffn_slug = FANDOMS[fandom]["ffn"]
    if not ffn_slug:
        return None
    try:
        url = f"https://www.fanfiction.net/{ffn_slug}/?srt=3&r=10"
        resp = requests.get(url, timeout=15, headers={
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                          "(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        })
        # FFN shows e.g. "12,345 stories" somewhere on the page
        match = re.search(r"([\d,]+)\s+stories", resp.text, re.IGNORECASE)
        if match:
            return int(match.group(1).replace(",", ""))
        return None
    except Exception:
        return None


def wattpad_total(fandom: str) -> int | None:
    query = FANDOMS[fandom]["wattpad"]
    if not query:
        return None
    try:
        url = (
            f"https://www.wattpad.com/v4/search/stories/"
            f"?query={requests.utils.quote(query)}&limit=1&fields=total"
        )
        resp = requests.get(url, timeout=10, headers={
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            "Accept": "application/json",
            "Referer": "https://www.wattpad.com/",
        })
        resp.raise_for_status()
        return resp.json().get("total")
    except Exception:
        return None


# ── Display ───────────────────────────────────────────────────────────────────

def fmt(n: int | None) -> str:
    if n is None:
        return "—"
    if n >= 1_000_000:
        return f"{n / 1_000_000:.1f}M"
    if n >= 1_000:
        return f"{n / 1_000:.1f}k"
    return str(n)


def show_fandom(fandom: str):
    if fandom not in FANDOMS:
        print(f"Unknown fandom: '{fandom}'")
        print(f"Available: {', '.join(FANDOMS)}")
        return

    print(f"\n  {fandom}")
    print(f"  {'─' * 58}")
    print(f"  {'Platform':<10} {'Indexed':>8}  {'Available':>10}  {'Gap':>8}")
    print(f"  {'─' * 58}")

    db = get_db_counts(fandom)

    platforms = [
        ("AO3",     "ao3",     lambda: ao3_total(fandom)),
        ("FFN",     "ffn",     lambda: ffn_total(fandom)),
        ("Wattpad", "wattpad", lambda: wattpad_total(fandom)),
    ]

    total_indexed = sum(db.values())

    for label, key, get_total in platforms:
        indexed = db[key]
        total = get_total()
        gap = (total - indexed) if total is not None else None
        print(f"  {label:<10} {fmt(indexed):>8}  {fmt(total):>10}  {fmt(gap):>8}")

    print(f"  {'─' * 58}")
    print(f"  {'Total':<10} {fmt(total_indexed):>8}")
    print()


# ── Entry point ───────────────────────────────────────────────────────────────

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python rq.py \"Fandom Name\"")
        print("       python rq.py --all")
        sys.exit(1)

    if sys.argv[1] == "--all":
        for fandom in FANDOMS:
            show_fandom(fandom)
    else:
        show_fandom(sys.argv[1])
