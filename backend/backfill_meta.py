"""Metadata backfill — enrich existing LOCAL fics with rich `meta`, WITHOUT re-embedding.

The corpus is built locally (parquet) and pushed to AWS via the devtool, so this
enriches the **local store** — the source — and a later `swap_tool push` publishes
it. Walks fics in the local canonical parquet whose `meta` is null. Every platform
uses the SAME strategy: re-run the per-fandom search over plain HTTP and match the
listing results to local rows by URL — ~17-25 fics per page request instead of one
page per work.

  AO3     — re-run the works search (curl_cffi, browser-impersonated HTTP). The
            listing blurb already carries the full tag taxonomy + stats
            (`scrapers.ao3.parse_results`). Match by URL.
  FFN     — re-run the per-fandom search (curl_cffi HTTP). The z-list row carries
            FFN's full field set (`scrapers.ffn.parse_results`). Match by URL.
  Wattpad — re-run the per-fandom search (pure HTTP); the v4 API carries everything.
            Match by URL. (No per-story endpoint exists.)

No browser required: AO3 and FFN serve listing pages to curl_cffi under safari/
firefox TLS impersonation (chrome impersonation gets Shields-up/Cloudflare 403), so
unlike indexer.py this runs anywhere — no real Chrome, containerizable. It enriches
the LOCAL parquet store only; run `swap_tool push` afterward to publish to AWS.

Concurrency: ONE fandom at a time; within it, AO3/FFN/Wattpad run in parallel (they
are different hosts with independent rate limits). We never run two fandoms at once,
so AO3 is only ever hit by a single stream — staying under its per-IP limit.

Memory: a save rewrites the whole fandom parquet (~5s for a 64k-row fandom), so we
do NOT save per page. Matches accumulate into a small batch that is flushed and then
CLEARED every FLUSH_FICS — RAM stays flat (~a few MB) no matter how large the corpus,
and total save overhead stays a few minutes, not hours.

Resumable two ways: (1) enriched rows drop out of the next run's local work-list,
and (2) a per-fandom page cursor (.backfill_cursor.json) records how far each search
got, so a re-run resumes from that page. Ctrl+C flushes in-flight meta and saves the
cursor before exiting — a pause loses at most the unflushed batch (re-fetched in
seconds). Match by URL is exact-by-construction (the indexer scraped these with the
same parse_results); the work-list is matched as a SET, so search-sort drift since
indexing only costs coverage at the tail (handled by stall-detection), not correctness.

Usage:
  python backfill_meta.py                       # everything with NULL meta
  python backfill_meta.py --platform ao3        # one platform
  python backfill_meta.py --fandom "Naruto"     # one fandom
  python backfill_meta.py --fandom "Naruto" --max-pages 5   # bounded test
  python backfill_meta.py --delay 0             # no inter-page politeness (risky)
"""
import json
import os
import re
import sys
import threading
import time
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

import config  # noqa: F401 — repo-root .env side effect (DATABASE_URL etc.)

from curl_cffi import requests as creq

from data.fandoms import FANDOMS
from db.local_storage import get_local_fics_needing_meta, update_meta_local

# Windows consoles default to cp1252; fic titles/tags carry CJK/emoji, which crash
# strict encoding on print. Force UTF-8 so neither our logs nor a scraper's prints
# raise UnicodeEncodeError mid-run.
for _stream in (sys.stdout, sys.stderr):
    try:
        _stream.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

# Politeness between listing-page requests. Listing endpoints are throttled harder
# than work pages; this paces us under the wall. Backoff absorbs the rest. Override
# with --delay (lower = faster but more "Shields up" walls).
PAGE_DELAY = 2.0

# AO3/FFN both serve listing HTML to curl_cffi under these TLS-impersonation
# profiles; chrome impersonation gets Shields-up/Cloudflare-challenged. Tried in
# order, so a profile getting blocklisted later degrades to the next, not a failure.
HTTP_IMPERSONATE = ("safari", "firefox")
HTTP_TIMEOUT = 30
# Page-TITLE substrings that mark a bot-wall / challenge / throttle (status may be
# 200). Checked against <title> only — never the body — so a fic summary containing
# one of these phrases can't be mistaken for a block.
BLOCK_MARKERS = ("shields are up", "just a moment", "retry later", "attention required")
FETCH_RETRIES = 4
BLOCK_BACKOFF = 60.0     # seconds; doubles each retry when every profile is walled
# A save = full fandom-parquet rewrite (~5s for 64k rows). Flush in big chunks so
# that cost is amortised; the batch is CLEARED after each flush so RAM stays flat.
FLUSH_FICS = 1000
STALL_PAGES = 15         # stop after this many consecutive 0-match pages (post-match tail)
INITIAL_DEADZONE = 40    # give up if the first this-many pages all match nothing

# FFN: mirror the indexer's listing exactly so our stored fics are dense in the
# results. indexer.py pages srt=3 (reviews) within ONE word-length bucket =
# _ffn_len_for(MIN_WORDS); MIN_WORDS=20000 -> len=20. Same listing -> ~84%/page
# match (vs a misleading ~20% if the len bucket is omitted on early pages).
FFN_SRT = 3
FFN_LEN = 20

CURSOR_PATH = Path(__file__).parent / ".backfill_cursor.json"
_TITLE_RE = re.compile(r"<title[^>]*>(.*?)</title>", re.I | re.S)

# Cooperative stop (Ctrl+C reaches only the main thread; workers poll this) and a
# lock guarding the shared cursor file against concurrent platform threads.
_STOP = threading.Event()
_CURSOR_LOCK = threading.Lock()


def _interruptible_sleep(seconds: float) -> None:
    """Sleep, but wake early if a stop was requested — keeps pause responsive."""
    remaining = seconds
    while remaining > 0 and not _STOP.is_set():
        time.sleep(min(0.5, remaining))
        remaining -= 0.5


# ── Resume cursor (per fandom × platform) ────────────────────────────────────

def _load_cursors() -> dict:
    try:
        return json.loads(CURSOR_PATH.read_text())
    except Exception:
        return {}


def _get_cursor(fandom: str, platform: str) -> int:
    """Next search page to fetch for this fandom/platform (1 if never started)."""
    return _load_cursors().get(fandom, {}).get(platform, 1)


def _save_cursor(fandom: str, platform: str, page: int) -> None:
    with _CURSOR_LOCK:
        cur = _load_cursors()
        cur.setdefault(fandom, {})[platform] = page
        tmp = CURSOR_PATH.with_suffix(".json.tmp")
        tmp.write_text(json.dumps(cur, indent=2))
        os.replace(tmp, CURSOR_PATH)


def _clear_cursor(fandom: str, platform: str) -> None:
    with _CURSOR_LOCK:
        cur = _load_cursors()
        if cur.get(fandom, {}).pop(platform, None) is not None:
            if not cur[fandom]:
                del cur[fandom]
            CURSOR_PATH.write_text(json.dumps(cur, indent=2))


# ── HTTP listing fetch (no browser) ──────────────────────────────────────────

def _is_block(status: int, html: str) -> bool:
    if status != 200:
        return True
    m = _TITLE_RE.search(html)
    title = (m.group(1).strip().lower() if m else "")
    return any(mark in title for mark in BLOCK_MARKERS)


def _fetch_listing(url: str) -> str | None:
    """GET a search-listing page over HTTP, defeating the bot wall via TLS
    impersonation. Returns the HTML on a clean 200, or None if every profile is
    blocked after retries. None means FETCH FAILURE (caller backs off / stops) —
    it is NOT confused with a genuine empty last page, which returns valid HTML
    that simply parses to zero fics."""
    backoff = BLOCK_BACKOFF
    for attempt in range(FETCH_RETRIES):
        if _STOP.is_set():
            return None
        for imp in HTTP_IMPERSONATE:
            try:
                r = creq.get(url, impersonate=imp, timeout=HTTP_TIMEOUT)
            except Exception as e:
                print(f"[http] {imp}: {type(e).__name__}: {e}")
                continue
            if not _is_block(r.status_code, r.text):
                return r.text
            print(f"[http] {imp}: HTTP {r.status_code} blocked/walled")
        if attempt < FETCH_RETRIES - 1:
            print(f"[http] all profiles blocked — backing off {backoff:.0f}s")
            _interruptible_sleep(backoff)
            backoff *= 2
    return None


# ── Generic search-listing backfill (shared by AO3 + FFN) ─────────────────────

def _backfill_search(platform: str, fandom: str, frows: list[dict],
                     url_builder, parser, max_pages: int | None = None) -> int:
    """Re-run a fandom's search over HTTP, page by page, matching listing results to
    local rows by URL and writing their meta. Shared by AO3 and FFN — the only
    differences are the URL shape and which parse_results to use.

    Memory-safe: matched meta accumulates in `batch`, which is flushed and CLEARED
    every FLUSH_FICS — never grows with corpus size. Stops when the wanted set
    empties, the listing ends, STALL_PAGES consecutive pages match nothing, max_pages
    is reached, or a stop is requested. Advances the resume cursor on each flush."""
    wanted = {r["url"]: r["id"] for r in frows}
    batch: dict = {}
    done = 0
    start_page = _get_cursor(fandom, platform)
    page = start_page
    stale = 0           # consecutive 0-match pages AFTER the first match (tail drift)
    dead = 0            # consecutive 0-match pages BEFORE any match (leading dead zone)
    started = False
    print(f"[{platform}] {fandom}: {len(wanted)} fics need meta — search from page {page}")

    def flush(next_page: int) -> None:
        nonlocal batch
        if batch:
            update_meta_local(fandom, batch)
            batch = {}
        _save_cursor(fandom, platform, next_page)

    stop_reason = "done"
    while wanted and not _STOP.is_set():
        if max_pages is not None and page - start_page >= max_pages:
            stop_reason = "maxpages"
            break
        html = _fetch_listing(url_builder(fandom, page))
        if html is None:
            stop_reason = "stopped" if _STOP.is_set() else "blocked"
            break
        fics = parser(html)
        if not fics:
            stop_reason = "end"
            break
        matched = 0
        for fic in fics:
            fic_id = wanted.pop(fic.url, None)
            if fic_id and fic.meta:
                batch[fic_id] = fic.meta.model_dump(mode="json")
                done += 1
                matched += 1
        print(f"[{platform}] {fandom} page {page}: matched {matched}, {len(wanted)} left")
        if matched:
            started = True
            stale = 0
        elif started:
            stale += 1
            if stale >= STALL_PAGES:        # tail: matches dried up, stop
                stop_reason = "stalled"
                page += 1
                break
        else:
            dead += 1
            if dead >= INITIAL_DEADZONE:    # never matched — wrong sort/data, give up
                stop_reason = "no-match"
                page += 1
                break
        if len(batch) >= FLUSH_FICS:
            flush(page + 1)
        page += 1
        if PAGE_DELAY:
            _interruptible_sleep(PAGE_DELAY)

    if _STOP.is_set() and stop_reason == "done":
        stop_reason = "stopped"

    # Final flush. Cursor: clear if this fandom/platform is finished or exhausted;
    # otherwise leave it pointing where a re-run should resume.
    if not wanted or stop_reason in ("end", "stalled", "no-match"):
        if batch:
            update_meta_local(fandom, batch)
        _clear_cursor(fandom, platform)
        if wanted:
            print(f"[{platform}] {fandom}: {len(wanted)} fics unmatched "
                  f"({stop_reason}: deleted/moved/sort-drift)")
    else:  # blocked, maxpages, or stop requested — keep a resume point
        flush(page)
        print(f"[{platform}] {fandom}: stopped ({stop_reason}) with {len(wanted)} left "
              f"— re-run resumes from page {page}")
    return done


def _backfill_wattpad_fandom(fandom: str, frows: list[dict], max_pages: int | None = None) -> int:
    """Wattpad backfill for ONE fandom (pure HTTP v4 API). Same memory discipline:
    accumulate into a batch, flush + clear every FLUSH_FICS."""
    from scrapers.wattpad import search_iter

    query = (FANDOMS.get(fandom) or {}).get("wattpad")
    if not query:
        print(f"[wattpad] no query for '{fandom}' — skipping {len(frows)} fics")
        return 0
    wanted = {r["url"]: r["id"] for r in frows}
    batch: dict = {}
    done = 0
    print(f"[wattpad] {fandom}: {len(wanted)} fics need meta — re-running search")
    for fic_batch in search_iter(query, max_pages=(max_pages or 0), filtered=False):
        if not wanted or _STOP.is_set():
            break
        for fic in fic_batch:
            fic_id = wanted.pop(fic.url, None)
            if fic_id and fic.meta:
                batch[fic_id] = fic.meta.model_dump(mode="json")
                done += 1
        if len(batch) >= FLUSH_FICS:
            update_meta_local(fandom, batch)
            batch = {}
    if batch:
        update_meta_local(fandom, batch)
    if wanted and not _STOP.is_set():
        print(f"[wattpad] {fandom}: {len(wanted)} fics not matched in search")
    return done


# ── Per-fandom dispatch + concurrency driver ─────────────────────────────────

def _run_platform(platform: str, fandom: str, frows: list[dict], max_pages: int | None) -> int:
    """Run one (fandom, platform) backfill unit. Errors are contained so one
    platform failing never takes down the other two running alongside it."""
    try:
        if platform == "ao3":
            if (FANDOMS.get(fandom) or {}).get("ao3") is None:
                print(f"[ao3] no tag for '{fandom}' — skipping {len(frows)} fics")
                return 0
            from scrapers.ao3 import parse_results, build_search_url
            return _backfill_search(
                "ao3", fandom, frows,
                lambda fn, p: build_search_url("", fandom=fn, page=p),
                parse_results, max_pages,
            )
        if platform == "ffn":
            slug = (FANDOMS.get(fandom) or {}).get("ffn")
            if not slug:
                print(f"[ffn] no slug for '{fandom}' — skipping {len(frows)} fics")
                return 0
            from scrapers.ffn import parse_results
            return _backfill_search(
                "ffn", fandom, frows,
                lambda fn, p, s=slug: f"https://www.fanfiction.net/{s}/?srt={FFN_SRT}&r=10&len={FFN_LEN}&p={p}",
                parse_results, max_pages,
            )
        if platform == "wattpad":
            return _backfill_wattpad_fandom(fandom, frows, max_pages)
    except Exception as e:
        print(f"[{platform}] {fandom}: ERROR {type(e).__name__}: {e}")
    return 0


def _run_fandom(fandom: str, by_platform: dict[str, list[dict]], max_pages: int | None) -> int:
    """Run all platforms for ONE fandom concurrently (different hosts, independent
    rate limits). Blocks until all three finish or stop."""
    counts = {p: len(v) for p, v in by_platform.items()}
    print(f"\n=== {fandom}: {counts} ===")
    total = 0
    with ThreadPoolExecutor(max_workers=3, thread_name_prefix=f"{fandom[:8]}") as ex:
        futs = [ex.submit(_run_platform, p, fandom, v, max_pages) for p, v in by_platform.items()]
        try:
            for f in futs:
                total += f.result()
        except KeyboardInterrupt:
            _STOP.set()   # tell workers to stop NOW, before the pool joins on exit
            raise
    return total


def _parse_args(argv: list[str]) -> dict:
    opts: dict = {"platform": None, "fandom": None, "limit": None, "delay": None, "max_pages": None}
    flags = {"--platform", "--fandom", "--limit", "--delay", "--max-pages"}
    i = 0
    while i < len(argv):
        flag = argv[i]
        if flag in flags and i + 1 < len(argv):
            val = argv[i + 1]
            if flag == "--limit":
                opts["limit"] = int(val)
            elif flag == "--delay":
                opts["delay"] = float(val)
            elif flag == "--max-pages":
                opts["max_pages"] = int(val)
            else:
                opts[flag[2:]] = val
            i += 2
        else:
            print(f"Unknown/incomplete arg: {flag}")
            i += 1
    return opts


def main(argv: list[str]) -> None:
    global PAGE_DELAY
    opts = _parse_args(argv)
    if opts["delay"] is not None:
        PAGE_DELAY = opts["delay"]
    max_pages = opts["max_pages"]

    rows = get_local_fics_needing_meta(platform=opts["platform"], fandom=opts["fandom"], limit=opts["limit"])

    # Group by fandom, then platform: { fandom: { platform: [rows] } }
    by_fandom: dict[str, dict[str, list[dict]]] = {}
    for r in rows:
        by_fandom.setdefault(r["fandom"], {}).setdefault(r["platform"], []).append(r)

    plat_totals: dict[str, int] = {}
    for r in rows:
        plat_totals[r["platform"]] = plat_totals.get(r["platform"], 0) + 1
    summary = ", ".join(f"{p}={n}" for p, n in plat_totals.items()) or "none"
    print(f"Backfill work-list: {len(rows)} fics needing meta across {len(by_fandom)} fandoms ({summary})")
    if not rows:
        return

    total = 0
    try:
        for fandom, by_platform in by_fandom.items():
            if _STOP.is_set():
                break
            total += _run_fandom(fandom, by_platform, max_pages)
    except KeyboardInterrupt:
        # Signal workers, let the current fandom's threads flush, then report.
        _STOP.set()
        print("\nPausing — letting in-flight pages flush…")
        print(f"Paused (progress + cursor saved). Re-run to resume. ~{total} enriched so far.")
        return

    print(f"\nBackfill complete: enriched {total}/{len(rows)} fics.")


if __name__ == "__main__":
    main(sys.argv[1:])
