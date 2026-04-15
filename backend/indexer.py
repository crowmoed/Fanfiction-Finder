import os
import sys
import time
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

import config
from data.fandoms import FANDOMS
from data import progress
from ai.embedder import embed_fics_batch
from db.postgres import upsert_fic, get_fic_count, init_db, clear_fandom, migrate_embedding_dimensions
from db.local_storage import upsert_fics_batch_local, clear_fandom_local
from seleniumbase import SB
import random

MIN_WORDS = 20000
WATTPAD_QUALITY_OFFSET = 0


def _store_batch(fics, embeddings, fandom_name: str) -> int:
    """Store a batch of fics: try local storage first, fall back to Neon per-fic."""
    stored = 0

    # Try local batch save first
    local_ok, local_fail = upsert_fics_batch_local(fics, fandom_name, embeddings)
    if local_ok > 0:
        print(f"  [local] Saved {local_ok} fics to local storage")
        stored += local_ok

    if local_fail > 0:
        # Local failed — fall back to Neon for the whole batch
        print(f"  [local] Local save failed, falling back to Neon DB...")
        for fic, embedding in zip(fics, embeddings):
            try:
                upsert_fic(fic=fic, fandom=fandom_name, embedding=embedding)
                stored += 1
            except Exception as e:
                print(f"  Skipped '{fic.title}': {e}")

    return stored

def scrape_and_embed_ao3(fandom_name: str, sb, first_fandom: bool = False, start_page: int = 1, min_words: int = MIN_WORDS) -> int:
    from scrapers.ao3 import build_search_url, parse_results
    stored = 0

    # Checkpoint: resume from saved page unless caller overrode start_page
    if start_page == 1:
        resume = progress.get_resume_point(fandom_name, "ao3")
        if "page" in resume:
            start_page = resume["page"]
            print(f"[AO3] Resuming {fandom_name} at page {start_page}")

    page = start_page

    while True:
        url = build_search_url("", fandom=fandom_name, page=page, min_words=min_words)
        print(f"\n[AO3] Fetching page {page}: {url}")

        sb.open(url)

        if page == start_page and first_fandom:
            print("[AO3] Waiting 15s — click through any interstitial now...")
            time.sleep(15)
        elif page == start_page:
            time.sleep(5)

        try:
            sb.wait_for_element("li.work.blurb.group", timeout=20)
        except Exception:
            print(f"[AO3] Page {page}: no results — done")
            break

        html = sb.get_page_source()
        fics = parse_results(html)

        if not fics:
            print(f"[AO3] Page {page}: empty — done")
            break

        print(f"[AO3] Page {page}: scraped {len(fics)} fics — embedding now...")
        embeddings = embed_fics_batch(fics, fandom=fandom_name)
        stored += _store_batch(fics, embeddings, fandom_name)

        # Checkpoint after each successful page — next run resumes here
        progress.mark_progress(fandom_name, "ao3", page=page + 1)

        page += 1
        time.sleep(8)

    progress.mark_done(fandom_name, "ao3")
    return stored


def scrape_and_embed_ffn(fandom_name: str, sb, first_fandom: bool = False) -> int:
    from scrapers.ffn import parse_results
    stored = 0

    ffn_slug = FANDOMS[fandom_name]["ffn"]

    word_lens = [10, 20]

    # Checkpoint: resume from saved (word_len, page) if present
    resume = progress.get_resume_point(fandom_name, "ffn")
    resume_word_len = resume.get("word_len")
    resume_page = resume.get("page", 1)
    resumed = False

    for word_len in word_lens:
        # Skip buckets we've already finished
        if resume_word_len is not None and not resumed:
            if word_len < resume_word_len:
                continue
            if word_len == resume_word_len:
                page = resume_page
                resumed = True
                print(f"[FFN] Resuming {fandom_name} at word_len={word_len} page={page}")
            else:
                page = 1
                resumed = True
        else:
            page = 1

        label = "40k-100k" if word_len == 10 else "100k+"
        first_page_of_bucket = page

        while True:
            url = f"https://www.fanfiction.net/{ffn_slug}/?srt=3&r=10&len={word_len}&p={page}"
            print(f"\n[FFN] Fetching page {page} ({label}): {url}")

            sb.open(url)

            if page == first_page_of_bucket and first_fandom:
                print("[FFN] Waiting 15s for page to load...")
                time.sleep(15)
            elif page == first_page_of_bucket:
                time.sleep(5)

            try:
                sb.wait_for_element("div.z-list", timeout=20)
            except Exception:
                print(f"[FFN] Page {page} ({label}): no results — done")
                break

            html = sb.get_page_source()
            fics = parse_results(html)

            if not fics:
                print(f"[FFN] Page {page} ({label}): empty — done")
                break

            print(f"[FFN] Page {page} ({label}): scraped {len(fics)} fics — embedding now...")
            embeddings = embed_fics_batch(fics, fandom=fandom_name)
            stored += _store_batch(fics, embeddings, fandom_name)

            progress.mark_progress(fandom_name, "ffn", word_len=word_len, page=page + 1)

            page += 1
            delay = random.uniform(5, 10)
            time.sleep(delay)

    progress.mark_done(fandom_name, "ffn")
    return stored


def scrape_and_embed_wattpad(fandom_name: str, quality_offset: int = WATTPAD_QUALITY_OFFSET) -> int:
    from scrapers.wattpad import search
    stored = 0

    query = FANDOMS[fandom_name]["wattpad"]
    fics = search(query, max_pages=0, quality_offset=quality_offset)

    if not fics:
        print(f"[Wattpad] No qualifying fics found for '{fandom_name}'")
        progress.mark_done(fandom_name, "wattpad")
        return 0

    # Embed in batches of ~50 (matches scraper page size)
    batch_size = 50
    for batch_start in range(0, len(fics), batch_size):
        batch = fics[batch_start:batch_start + batch_size]
        print(f"[Wattpad] Embedding batch {batch_start // batch_size + 1} "
              f"({len(batch)} fics)...")
        embeddings = embed_fics_batch(batch, fandom=fandom_name)
        stored += _store_batch(batch, embeddings, fandom_name)

    progress.mark_done(fandom_name, "wattpad")
    return stored


def _run_source(fandom_name: str, source: str, sb, first_fandom: bool,
                start_page: int, min_words: int, wattpad_quality: int) -> int:
    """Run one source for one fandom, skipping if already marked done."""
    if progress.is_done(fandom_name, source):
        print(f"[{source.upper()}] {fandom_name} already complete — skipping")
        return 0

    if source == "ao3":
        return scrape_and_embed_ao3(fandom_name, sb, first_fandom=first_fandom,
                                    start_page=start_page, min_words=min_words)
    if source == "ffn":
        return scrape_and_embed_ffn(fandom_name, sb, first_fandom=first_fandom)
    if source == "wattpad":
        return scrape_and_embed_wattpad(fandom_name, quality_offset=wattpad_quality)
    raise ValueError(f"Unknown source: {source}")


def index_fandom(fandom_name: str, clear: bool = False, start_page: int = 1, wattpad_quality: int = WATTPAD_QUALITY_OFFSET, min_words: int = MIN_WORDS):
    print(f"\n{'='*50}")
    print(f"Indexing: {fandom_name} (min {min_words:,} words)")
    print(f"{'='*50}")

    if clear:
        clear_fandom_local(fandom_name)
        clear_fandom(fandom_name)
        progress.reset(fandom=fandom_name)

    total_stored = 0

    ao3_done = progress.is_done(fandom_name, "ao3")
    ffn_done = progress.is_done(fandom_name, "ffn")

    # Only open the browser if AO3 or FFN still has work left
    if not (ao3_done and ffn_done):
        with SB(uc=True, headless=False) as sb:
            if not ao3_done:
                ao3_stored = _run_source(fandom_name, "ao3", sb, first_fandom=True,
                                         start_page=start_page, min_words=min_words,
                                         wattpad_quality=wattpad_quality)
                print(f"\n[AO3] Done: {ao3_stored} fics stored")
                total_stored += ao3_stored

            if not ffn_done:
                if not ao3_done:
                    print("\nSwitching to FFN in 15s...")
                    time.sleep(15)
                ffn_stored = _run_source(fandom_name, "ffn", sb, first_fandom=True,
                                         start_page=1, min_words=min_words,
                                         wattpad_quality=wattpad_quality)
                print(f"\n[FFN] Done: {ffn_stored} fics stored")
                total_stored += ffn_stored
    else:
        print("[AO3+FFN] Both already complete — skipping browser session")

    wattpad_stored = _run_source(fandom_name, "wattpad", sb=None, first_fandom=False,
                                 start_page=1, min_words=min_words,
                                 wattpad_quality=wattpad_quality)
    print(f"\n[Wattpad] Done: {wattpad_stored} fics stored")
    total_stored += wattpad_stored

    print(f"\n[Done] {fandom_name}: {total_stored} total fics indexed")
    return total_stored


def _all_done(fandom_name: str) -> bool:
    return all(progress.is_done(fandom_name, s) for s in ("ao3", "ffn", "wattpad"))


def index_all(clear: bool = False, wattpad_quality: int = WATTPAD_QUALITY_OFFSET):
    init_db()
    migrate_embedding_dimensions()

    if clear:
        progress.reset()

    total = 0

    fandom_names = list(FANDOMS.keys())
    browser_started = False
    first_fandom_flag = True

    # AO3+FFN pass under one browser session
    sb_ctx = None
    try:
        for fandom_name in fandom_names:
            if clear:
                clear_fandom_local(fandom_name)
                clear_fandom(fandom_name)

            ao3_done = progress.is_done(fandom_name, "ao3")
            ffn_done = progress.is_done(fandom_name, "ffn")
            if ao3_done and ffn_done:
                print(f"\n[Skip] {fandom_name}: AO3+FFN already complete")
                continue

            if not browser_started:
                sb_ctx = SB(uc=True, headless=False)
                sb = sb_ctx.__enter__()
                browser_started = True

            print(f"\n{'='*50}")
            print(f"Indexing AO3+FFN: {fandom_name}")
            print(f"{'='*50}")

            ao3_stored = _run_source(fandom_name, "ao3", sb,
                                     first_fandom=first_fandom_flag,
                                     start_page=1, min_words=MIN_WORDS,
                                     wattpad_quality=wattpad_quality)
            print(f"\n[AO3] Done: {ao3_stored} fics stored")

            if not progress.is_done(fandom_name, "ffn"):
                print("\nSwitching to FFN in 15s...")
                time.sleep(15)

            ffn_stored = _run_source(fandom_name, "ffn", sb,
                                     first_fandom=first_fandom_flag,
                                     start_page=1, min_words=MIN_WORDS,
                                     wattpad_quality=wattpad_quality)
            print(f"\n[FFN] Done: {ffn_stored} fics stored")

            first_fandom_flag = False
            total += ao3_stored + ffn_stored
    finally:
        if sb_ctx is not None:
            sb_ctx.__exit__(None, None, None)

    # Wattpad pass (no browser)
    for fandom_name in fandom_names:
        if progress.is_done(fandom_name, "wattpad"):
            print(f"\n[Skip] {fandom_name}: Wattpad already complete")
            continue
        print(f"\n{'='*50}")
        print(f"Indexing Wattpad: {fandom_name}")
        print(f"{'='*50}")
        wp = _run_source(fandom_name, "wattpad", sb=None, first_fandom=False,
                         start_page=1, min_words=MIN_WORDS,
                         wattpad_quality=wattpad_quality)
        print(f"\n[Wattpad] Done: {wp} fics stored")
        total += wp

    print(f"\n{'='*50}")
    print(f"Indexing complete. Total fics stored: {total}")


def index_ao3_only(fandom_name: str, start_page: int = 1, min_words: int = MIN_WORDS):
    if fandom_name not in FANDOMS:
        print(f"Unknown fandom: '{fandom_name}'")
        print(f"Available: {list(FANDOMS.keys())}")
        return
    init_db()
    migrate_embedding_dimensions()
    print(f"\n{'='*50}")
    print(f"Indexing AO3: {fandom_name} (min {min_words:,} words)")
    print(f"{'='*50}")
    with SB(uc=True, headless=False) as sb:
        stored = scrape_and_embed_ao3(fandom_name, sb, first_fandom=True, start_page=start_page, min_words=min_words)
        print(f"\n[AO3] Done: {stored} fics stored")


def index_ffn_only(fandom_name: str):
    if fandom_name not in FANDOMS:
        print(f"Unknown fandom: '{fandom_name}'")
        print(f"Available: {list(FANDOMS.keys())}")
        return
    init_db()
    migrate_embedding_dimensions()
    print(f"\n{'='*50}")
    print(f"Indexing FFN: {fandom_name}")
    print(f"{'='*50}")
    with SB(uc=True, headless=False) as sb:
        stored = scrape_and_embed_ffn(fandom_name, sb, first_fandom=True)
        print(f"\n[FFN] Done: {stored} fics stored")


def index_wattpad_only(fandom_name: str, wattpad_quality: int = WATTPAD_QUALITY_OFFSET):
    if fandom_name not in FANDOMS:
        print(f"Unknown fandom: '{fandom_name}'")
        print(f"Available: {list(FANDOMS.keys())}")
        return
    init_db()
    migrate_embedding_dimensions()
    print(f"\n{'='*50}")
    print(f"Indexing Wattpad: {fandom_name}")
    print(f"{'='*50}")
    stored = scrape_and_embed_wattpad(fandom_name, quality_offset=wattpad_quality)
    print(f"\n[Wattpad] Done: {stored} fics stored")


def index_one(fandom_name: str, clear: bool = False, start_page: int = 1, wattpad_quality: int = WATTPAD_QUALITY_OFFSET, min_words: int = MIN_WORDS):
    if fandom_name not in FANDOMS:
        print(f"Unknown fandom: '{fandom_name}'")
        print(f"Available: {list(FANDOMS.keys())}")
        return
    init_db()
    migrate_embedding_dimensions()
    index_fandom(fandom_name, clear=clear, start_page=start_page, wattpad_quality=wattpad_quality, min_words=min_words)


def _parse_arg(argv, name: str) -> str | None:
    if name in argv:
        i = argv.index(name)
        if i + 1 < len(argv):
            return argv[i + 1]
    return None


if __name__ == "__main__":
    argv = sys.argv

    # Handle checkpoint-management flags first (they exit early)
    if "--restart" in argv:
        progress.reset()
        print("[progress] Cleared all checkpoints")

    restart_fandom = _parse_arg(argv, "--restart-fandom")
    if restart_fandom:
        progress.reset(fandom=restart_fandom)
        print(f"[progress] Cleared checkpoint for fandom '{restart_fandom}'")

    restart_source = _parse_arg(argv, "--restart-source")
    if restart_source:
        progress.reset(source=restart_source)
        print(f"[progress] Cleared checkpoint for source '{restart_source}'")

    if "--show-progress" in argv:
        import json as _json
        print(_json.dumps(progress.load(), indent=2))
        sys.exit(0)

    # Positional fandom name (first non-flag arg, skipping values consumed by flags)
    VALUE_FLAGS = {"--start-page", "--wattpad-quality", "--min-words",
                   "--restart-fandom", "--restart-source"}
    positional = []
    skip_next = False
    for i, a in enumerate(argv[1:]):
        if skip_next:
            skip_next = False
            continue
        if a in VALUE_FLAGS:
            skip_next = True
            continue
        if a.startswith("--"):
            continue
        positional.append(a)

    start_page = int(_parse_arg(argv, "--start-page") or 1)
    wattpad_quality = int(_parse_arg(argv, "--wattpad-quality") or WATTPAD_QUALITY_OFFSET)
    min_words = int(_parse_arg(argv, "--min-words") or MIN_WORDS)
    should_clear = "--clear" in argv

    if positional:
        fandom = positional[0]
        if "--ao3-only" in argv:
            index_ao3_only(fandom, start_page=start_page, min_words=min_words)
        elif "--ffn-only" in argv:
            index_ffn_only(fandom)
        elif "--wattpad-only" in argv:
            index_wattpad_only(fandom, wattpad_quality=wattpad_quality)
        else:
            index_one(fandom, clear=should_clear, start_page=start_page,
                      wattpad_quality=wattpad_quality, min_words=min_words)
    else:
        index_all(clear=should_clear, wattpad_quality=wattpad_quality)
