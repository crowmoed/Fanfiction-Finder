import datetime
import os
import sys
import time
import traceback
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

import config
from content_filter import filter_fics
from data.fandoms import FANDOMS
from data import progress
from ai.embedder import embed_fics_batch
from db.postgres import upsert_fic, get_fic_count, init_db, clear_fandom, migrate_embedding_dimensions
from db.local_storage import upsert_fics_batch_local, clear_fandom_local, compact as compact_local
from seleniumbase import SB

MIN_WORDS = 20000
WATTPAD_QUALITY_OFFSET = 0

# Chrome flags to cap memory use per scraper. --disable-dev-shm-usage avoids
# /dev/shm OOMs on small Linux boxes; --disk-cache-size=1 disables the on-disk
# cache; --js-flags caps V8 old-space at 512MB.
CHROME_MEMORY_FLAGS = [
    "--disable-dev-shm-usage",
    "--disable-extensions",
    "--disk-cache-size=1",
    "--media-cache-size=1",
    "--disable-application-cache",
    "--aggressive-cache-discard",
    "--js-flags=--max-old-space-size=512",
]

# Logs go to backend/logs/<pid>-<timestamp>.log so parallel scrapers don't
# collide. Full tracebacks always land here, even if the terminal closes.
LOG_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "logs")


def _open_browser():
    """Open a fresh SB context with memory-capping Chrome flags."""
    extra = " ".join(CHROME_MEMORY_FLAGS)
    return SB(uc=True, headless=False, chromium_arg=extra)


class BrowserSession:
    """Selenium browser held open for the full scrape.

    Use as: `with BrowserSession() as session: session.sb.open(url)`.
    The session does not cycle Chrome — closing/reopening re-triggers
    the Cloudflare/terms interstitial, which means a human click-through every
    time. Instead we rely on Chrome's memory flags.
    """

    def __init__(self):
        self.interstitial_seconds = 15
        self._ctx = None
        self.sb = None
        # The Cloudflare / age-gate interstitial only shows on a fresh browser;
        # scrapers call interstitial_hold() after the first sb.open() to give
        # the human time to click through. Flag flips once the hold has fired.
        self._interstitial_held = False

    def __enter__(self):
        self._ctx = _open_browser()
        self.sb = self._ctx.__enter__()
        return self

    def __exit__(self, exc_type, exc, tb):
        if self._ctx is not None:
            try:
                self._ctx.__exit__(None, None, None)
            except Exception as e:
                print(f"[browser] error closing session: {e}")
            self._ctx = None
            self.sb = None

    def interstitial_hold(self, label: str = "") -> None:
        """Pause once per fresh browser so a human can clear any interstitial.

        Scrapers call this after the first sb.open() of the session. Fires
        exactly once per open() / cycle; later calls are no-ops.
        """
        if self._interstitial_held or self.interstitial_seconds <= 0:
            return
        self._interstitial_held = True
        tag = f"[{label}] " if label else "[browser] "
        print(f"{tag}Waiting {self.interstitial_seconds}s — "
              f"click through any interstitial now...")
        time.sleep(self.interstitial_seconds)


def _drop_blocked(fics, label: str):
    """Content filter: remove fics with sexual-minor content before embedding."""
    kept = filter_fics(fics)
    dropped = len(fics) - len(kept)
    if dropped:
        print(f"[{label}] content-filter: dropped {dropped} blocked fic(s)")
    return kept


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

def scrape_and_embed_ao3(fandom_name: str, session: "BrowserSession", start_page: int = 1, min_words: int = MIN_WORDS) -> int:
    from scrapers.ao3 import build_search_url, parse_results
    stored = 0

    # Checkpoint: resume from saved page unless caller overrode start_page.
    # Page numbers are only valid for the min_words filter they were taken
    # under, so a mismatch silently starts fresh.
    if start_page == 1:
        resume = progress.get_resume_point(fandom_name, "ao3", min_words=min_words)
        if "page" in resume:
            start_page = resume["page"]
            print(f"[AO3] Resuming {fandom_name} at page {start_page} (min_words={min_words:,})")
        else:
            saved = progress.get_resume_point(fandom_name, "ao3")
            if "page" in saved and saved.get("min_words") != min_words:
                print(f"[AO3] Ignoring checkpoint (saved min_words={saved.get('min_words')}, "
                      f"now {min_words}) — starting fresh")

    page = start_page

    while True:
        url = build_search_url("", fandom=fandom_name, page=page, min_words=min_words)
        print(f"\n[AO3] Fetching page {page}: {url}")

        session.sb.open(url)
        session.interstitial_hold("AO3")
        time.sleep(1)

        # Retry up to 3 times with a page refresh. AO3 occasionally serves a
        # blank/blocked page on long scrapes; a refresh usually clears it.
        fics = None
        for attempt in range(3):
            try:
                session.sb.wait_for_element("li.work.blurb.group", timeout=20)
                html = session.sb.get_page_source()
                fics = parse_results(html)
                if fics:
                    break
            except Exception:
                pass
            if attempt < 2:
                print(f"[AO3] Page {page}: no results on attempt {attempt + 1} — refreshing")
                session.sb.refresh()
                time.sleep(1)

        if not fics:
            print(f"[AO3] Page {page}: no results after 3 attempts — done")
            break

        fics = _drop_blocked(fics, "AO3")
        if not fics:
            # Whole page filtered out — checkpoint and keep paginating.
            print(f"[AO3] Page {page}: all fics blocked by content filter — continuing")
            progress.mark_progress(fandom_name, "ao3", min_words=min_words, page=page + 1)
            page += 1
            continue

        print(f"[AO3] Page {page}: scraped {len(fics)} fics — embedding now...")
        embeddings = embed_fics_batch(fics, fandom=fandom_name)
        stored += _store_batch(fics, embeddings, fandom_name)
        del fics, embeddings, html

        # Checkpoint after each successful page — next run resumes here.
        # Record min_words so a later run with a different filter discards it.
        progress.mark_progress(fandom_name, "ao3", min_words=min_words, page=page + 1)

        page += 1

    progress.mark_done(fandom_name, "ao3")
    compact_local(fandom_name)
    return stored


# FFN's `len=X` query param filters to stories with >= X thousand words.
# Only a fixed set of values is accepted by the site — other values are
# silently ignored and return all results.
_FFN_LEN_VALUES = (1, 5, 10, 20, 40, 50, 60, 80, 100)


def _ffn_len_for(min_words: int) -> int:
    """Largest FFN `len` bucket <= min_words (in thousands). 0 = no filter."""
    if min_words <= 0:
        return 0
    target = min_words // 1000
    chosen = 0
    for v in _FFN_LEN_VALUES:
        if v <= target:
            chosen = v
        else:
            break
    return chosen


def _ffn_bucket_label(word_len: int) -> str:
    if word_len == 0:
        return "all"
    return f"{word_len}k+"


def scrape_and_embed_ffn(fandom_name: str, session: "BrowserSession",
                         min_words: int = MIN_WORDS) -> int:
    from scrapers.ffn import parse_results
    stored = 0

    ffn_slug = FANDOMS[fandom_name]["ffn"]

    word_len = _ffn_len_for(min_words)

    # Checkpoint: resume from saved (word_len, page) if it matches the
    # bucket we're about to scrape. Different bucket = stale, start fresh.
    resume = progress.get_resume_point(fandom_name, "ffn")
    saved_word_len = resume.get("word_len")
    if saved_word_len is not None and saved_word_len != word_len:
        print(f"[FFN] Ignoring checkpoint (saved word_len={saved_word_len}, "
              f"now {word_len}) — starting fresh")
        page = 1
    else:
        page = resume.get("page", 1)
        if page > 1:
            print(f"[FFN] Resuming {fandom_name} at word_len={word_len} page={page}")

    label = _ffn_bucket_label(word_len)
    len_param = f"&len={word_len}" if word_len > 0 else ""

    # FFN's `len` param filters by >= Xk words, but it's coarser than our
    # min_words (buckets: 1/5/10/20/40/50/60/80/100k). Post-filter to catch
    # fics between the bucket threshold and min_words.
    needs_post_filter = min_words > word_len * 1000

    while True:
        url = f"https://www.fanfiction.net/{ffn_slug}/?srt=3&r=10{len_param}&p={page}"
        print(f"\n[FFN] Fetching page {page} ({label}): {url}")

        session.sb.open(url)
        session.interstitial_hold("FFN")

        try:
            session.sb.wait_for_element("div.z-list", timeout=20)
        except Exception:
            print(f"[FFN] Page {page} ({label}): no results — done")
            break

        html = session.sb.get_page_source()
        fics = parse_results(html)

        if not fics:
            print(f"[FFN] Page {page} ({label}): empty — done")
            break

        if needs_post_filter:
            before = len(fics)
            fics = [f for f in fics if (f.word_count or 0) >= min_words]
            dropped = before - len(fics)
            if dropped:
                print(f"[FFN] Page {page} ({label}): dropped {dropped} fics under {min_words:,} words")

        fics = _drop_blocked(fics, "FFN")

        if not fics:
            print(f"[FFN] Page {page} ({label}): all fics filtered out — continuing")
            progress.mark_progress(fandom_name, "ffn", word_len=word_len, page=page + 1)
            page += 1
            continue

        print(f"[FFN] Page {page} ({label}): scraped {len(fics)} fics — embedding now...")
        embeddings = embed_fics_batch(fics, fandom=fandom_name)
        stored += _store_batch(fics, embeddings, fandom_name)
        del fics, embeddings, html

        progress.mark_progress(fandom_name, "ffn", word_len=word_len, page=page + 1)

        page += 1

    progress.mark_done(fandom_name, "ffn")
    compact_local(fandom_name)
    return stored


def scrape_and_embed_wattpad(fandom_name: str, quality_offset: int = WATTPAD_QUALITY_OFFSET) -> int:
    """Stream Wattpad results: embed + store each page as it arrives.

    The scraper yields pages of qualifying fics. We embed + persist each page
    and discard the Fic objects before pulling the next page, keeping peak
    memory at ~one page of fics instead of the whole fandom.
    """
    from scrapers.wattpad import search_iter
    stored = 0
    found_any = False

    query = FANDOMS[fandom_name]["wattpad"]

    for batch_num, batch in enumerate(
        search_iter(query, max_pages=0, quality_offset=quality_offset), start=1
    ):
        if not batch:
            continue
        found_any = True
        batch = _drop_blocked(batch, "Wattpad")
        if not batch:
            continue
        print(f"[Wattpad] Embedding batch {batch_num} ({len(batch)} fics)...")
        embeddings = embed_fics_batch(batch, fandom=fandom_name)
        stored += _store_batch(batch, embeddings, fandom_name)
        del batch, embeddings

    if not found_any:
        print(f"[Wattpad] No qualifying fics found for '{fandom_name}'")

    progress.mark_done(fandom_name, "wattpad")
    compact_local(fandom_name)
    return stored


def _run_source(fandom_name: str, source: str, session,
                start_page: int, min_words: int, wattpad_quality: int) -> int:
    """Run one source for one fandom, skipping if already marked done."""
    if progress.is_done(fandom_name, source):
        print(f"[{source.upper()}] {fandom_name} already complete — skipping")
        return 0

    if source == "ao3":
        return scrape_and_embed_ao3(fandom_name, session,
                                    start_page=start_page, min_words=min_words)
    if source == "ffn":
        return scrape_and_embed_ffn(fandom_name, session, min_words=min_words)
    if source == "wattpad":
        return scrape_and_embed_wattpad(fandom_name, quality_offset=wattpad_quality)
    raise ValueError(f"Unknown source: {source}")


def index_fandom(fandom_name: str, clear: bool = False, start_page: int = 1,
                 wattpad_quality: int = WATTPAD_QUALITY_OFFSET,
                 min_words: int = MIN_WORDS,
                 sources: set[str] | None = None):
    """Index a single fandom across one or more sources.

    `sources` controls which backends run — defaults to all three. When a
    source isn't in the set it's skipped entirely; its checkpoint is left
    untouched so a later run can pick it up.
    """
    if sources is None:
        sources = {"ao3", "ffn", "wattpad"}

    print(f"\n{'='*50}")
    print(f"Indexing: {fandom_name} (min {min_words:,} words, sources={sorted(sources)})")
    print(f"{'='*50}")

    if clear:
        clear_fandom_local(fandom_name)
        clear_fandom(fandom_name)
        progress.reset(fandom=fandom_name)

    total_stored = 0

    want_ao3 = "ao3" in sources
    want_ffn = "ffn" in sources
    want_wattpad = "wattpad" in sources

    ao3_done = progress.is_done(fandom_name, "ao3")
    ffn_done = progress.is_done(fandom_name, "ffn")

    need_browser = (want_ao3 and not ao3_done) or (want_ffn and not ffn_done)
    if need_browser:
        with BrowserSession() as session:
            if want_ao3 and not ao3_done:
                ao3_stored = _run_source(fandom_name, "ao3", session,
                                         start_page=start_page, min_words=min_words,
                                         wattpad_quality=wattpad_quality)
                print(f"\n[AO3] Done: {ao3_stored} fics stored")
                total_stored += ao3_stored

            if want_ffn and not ffn_done:
                if want_ao3 and not ao3_done:
                    print("\nSwitching to FFN...")
                ffn_stored = _run_source(fandom_name, "ffn", session,
                                         start_page=1, min_words=min_words,
                                         wattpad_quality=wattpad_quality)
                print(f"\n[FFN] Done: {ffn_stored} fics stored")
                total_stored += ffn_stored

    if want_wattpad:
        wattpad_stored = _run_source(fandom_name, "wattpad", session=None,
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

    # AO3+FFN pass — one fresh browser per fandom. Reusing a single browser
    # across all fandoms was the single biggest source of RSS growth; Chrome
    # never releases DOM/JS heap memory between navigations.
    for fandom_name in fandom_names:
        if clear:
            clear_fandom_local(fandom_name)
            clear_fandom(fandom_name)

        ao3_done = progress.is_done(fandom_name, "ao3")
        ffn_done = progress.is_done(fandom_name, "ffn")
        if ao3_done and ffn_done:
            print(f"\n[Skip] {fandom_name}: AO3+FFN already complete")
            continue

        print(f"\n{'='*50}")
        print(f"Indexing AO3+FFN: {fandom_name}")
        print(f"{'='*50}")

        with BrowserSession() as session:
            if not ao3_done:
                ao3_stored = _run_source(fandom_name, "ao3", session,
                                         start_page=1, min_words=MIN_WORDS,
                                         wattpad_quality=wattpad_quality)
                print(f"\n[AO3] Done: {ao3_stored} fics stored")
                total += ao3_stored

            if not progress.is_done(fandom_name, "ffn"):
                if not ao3_done:
                    print("\nSwitching to FFN...")
                ffn_stored = _run_source(fandom_name, "ffn", session,
                                         start_page=1, min_words=MIN_WORDS,
                                         wattpad_quality=wattpad_quality)
                print(f"\n[FFN] Done: {ffn_stored} fics stored")
                total += ffn_stored

    # Wattpad pass (no browser)
    for fandom_name in fandom_names:
        if progress.is_done(fandom_name, "wattpad"):
            print(f"\n[Skip] {fandom_name}: Wattpad already complete")
            continue
        print(f"\n{'='*50}")
        print(f"Indexing Wattpad: {fandom_name}")
        print(f"{'='*50}")
        wp = _run_source(fandom_name, "wattpad", session=None,
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
    with BrowserSession() as session:
        stored = scrape_and_embed_ao3(fandom_name, session, start_page=start_page, min_words=min_words)
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
    with BrowserSession() as session:
        stored = scrape_and_embed_ffn(fandom_name, session)
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


def index_one(fandom_name: str, clear: bool = False, start_page: int = 1,
              wattpad_quality: int = WATTPAD_QUALITY_OFFSET,
              min_words: int = MIN_WORDS,
              sources: set[str] | None = None):
    if fandom_name not in FANDOMS:
        print(f"Unknown fandom: '{fandom_name}'")
        print(f"Available: {list(FANDOMS.keys())}")
        return
    init_db()
    migrate_embedding_dimensions()
    index_fandom(fandom_name, clear=clear, start_page=start_page,
                 wattpad_quality=wattpad_quality, min_words=min_words,
                 sources=sources)


def _parse_arg(argv, name: str) -> str | None:
    if name in argv:
        i = argv.index(name)
        if i + 1 < len(argv):
            return argv[i + 1]
    return None


class _Tee:
    """Mirror writes to the original stream and a log file. Lets us keep
    full stdout/stderr on disk even when the terminal window is closed."""

    def __init__(self, original, logfile):
        self.original = original
        self.logfile = logfile

    def write(self, data):
        try:
            self.original.write(data)
        except Exception:
            pass
        try:
            self.logfile.write(data)
            self.logfile.flush()
        except Exception:
            pass

    def flush(self):
        try:
            self.original.flush()
        except Exception:
            pass
        try:
            self.logfile.flush()
        except Exception:
            pass

    def __getattr__(self, name):
        return getattr(self.original, name)


def _setup_crash_logging() -> str:
    """Tee stdout/stderr to a per-run log file. Returns the logfile path.

    Also forces UTF-8 + replace-on-error on the console streams so a stray
    non-cp1252 character (e.g. an arrow in a log line) can't crash a scrape
    on a default Windows console.
    """
    # Force UTF-8 on the console with replace-on-error so unprintable chars
    # become '?' instead of throwing UnicodeEncodeError.
    for stream_name in ("stdout", "stderr"):
        stream = getattr(sys, stream_name, None)
        if stream is not None and hasattr(stream, "reconfigure"):
            try:
                stream.reconfigure(encoding="utf-8", errors="replace")
            except Exception:
                pass

    os.makedirs(LOG_DIR, exist_ok=True)
    ts = datetime.datetime.now().strftime("%Y%m%d-%H%M%S")
    path = os.path.join(LOG_DIR, f"indexer-{ts}-{os.getpid()}.log")
    logfile = open(path, "a", encoding="utf-8", errors="replace", buffering=1)
    sys.stdout = _Tee(sys.stdout, logfile)
    sys.stderr = _Tee(sys.stderr, logfile)
    print(f"[log] Writing full output to: {path}")
    print(f"[log] Started at {datetime.datetime.now().isoformat()}")
    print(f"[log] argv: {sys.argv}")
    return path


def _hold_terminal_on_crash(exc: BaseException, log_path: str) -> None:
    """Print a loud crash banner and wait for user input so PowerShell stays open.

    Without this, a fatal exception closes the window before you can read the
    traceback. The full trace also lives in `log_path` if you miss it.
    """
    print("\n" + "=" * 70, flush=True)
    print(" SCRAPER CRASHED ", flush=True)
    print("=" * 70, flush=True)
    traceback.print_exc()
    print("=" * 70, flush=True)
    print(f" Full log: {log_path}", flush=True)
    print(f" Exception: {type(exc).__name__}: {exc}", flush=True)
    print("=" * 70, flush=True)
    print("\nPress Enter to close this window...", flush=True)
    try:
        input()
    except (EOFError, KeyboardInterrupt):
        pass


if __name__ == "__main__":
    log_path = _setup_crash_logging()
    try:
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
                       "--restart-fandom", "--restart-source", "--sources"}
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

        # --sources=ao3,ffn  picks an arbitrary subset. Legacy --*-only flags
        # still work and are equivalent to --sources=<one>.
        sources_raw = _parse_arg(argv, "--sources")
        sources_set: set[str] | None = None
        if sources_raw:
            sources_set = {s.strip().lower() for s in sources_raw.split(",") if s.strip()}
            unknown = sources_set - {"ao3", "ffn", "wattpad"}
            if unknown:
                print(f"[error] unknown source(s): {sorted(unknown)}; valid: ao3, ffn, wattpad")
                sys.exit(2)
            if not sources_set:
                print("[error] --sources is empty")
                sys.exit(2)

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
                          wattpad_quality=wattpad_quality, min_words=min_words,
                          sources=sources_set)
        else:
            index_all(clear=should_clear, wattpad_quality=wattpad_quality)

        print(f"\n[log] Finished cleanly at {datetime.datetime.now().isoformat()}")
    except KeyboardInterrupt:
        print("\n[log] Interrupted by user (Ctrl-C)")
        sys.exit(130)
    except SystemExit:
        raise
    except BaseException as exc:
        _hold_terminal_on_crash(exc, log_path)
        sys.exit(1)
