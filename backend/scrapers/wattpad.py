"""
Wattpad scraper for FicFinder.

Uses Wattpad's internal v4 search API (JSON, no Selenium needed).
Paginates via offset/limit and applies quality filtering based on
vote count, read count, and vote-to-read ratio.

Unlike AO3/FFN, Wattpad has no fandom taxonomy — scraping is keyword-based.

Quality filtering uses a two-phase approach:
  1. CALIBRATION: Sample the first N pages to compute fandom-specific
     engagement stats (median ratio, P75 ratio, read distribution).
  2. SCRAPING: Paginate through all results using calibrated thresholds.

This adapts automatically to different fandom cultures — kpop fandoms
with high engagement get stricter thresholds, older fandoms with casual
readers get looser ones.
"""

import requests
import time
import random
import statistics
import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from data.schema import Fic

BASE_URL = "https://www.wattpad.com/v4/search/stories/"

# Fields to request — keeps response lean but retains useful metadata
FIELDS = (
    "stories("
    "id,title,voteCount,readCount,commentCount,description,"
    "completed,url,numParts,isPaywalled,length,"
    "language(id),user(name),lastPublishedPart(createDate),"
    "mature,tags"
    "),total,nextUrl"
)

LIMIT = 50  # max results per request

# ── Calibration settings ─────────────────────────────────────────────────────

CALIBRATION_PAGES = 10            # pages to sample during calibration phase
MIN_READS_FLOOR = 1_000           # ignore stories below this read count entirely

# Percentile cutoff scales with fandom size — big fandoms are stricter
# (fandom_total_threshold, percentile_to_use)
# Checked in order, first match wins
FANDOM_SIZE_TIERS = [
    (5_000,   40),    # < 5K stories:  keep top 60% (P40 cutoff)
    (20_000,  60),    # 5K–20K:        keep top 40% (P60 cutoff)
    (50_000,  75),    # 20K–50K:       keep top 25% (P75 cutoff)
    (None,    85),    # 50K+:          keep top 15% (P85 cutoff)
]

# ── Early stop (disabled — we want to search everything) ─────────────────────

EARLY_STOP_ENABLED = False
MAX_EMPTY_PAGES = 5  # consecutive pages with 0 qualifying fics before stopping


# ── HTTP session setup ────────────────────────────────────────────────────────

def _make_session() -> requests.Session:
    session = requests.Session()
    session.headers.update({
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                       "(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        "Accept": "application/json",
        "Referer": "https://www.wattpad.com/",
    })
    return session


def build_search_url(query: str, offset: int = 0) -> str:
    """Build the Wattpad v4 search API URL."""
    return (
        f"{BASE_URL}?query={requests.utils.quote(query)}"
        f"&limit={LIMIT}"
        f"&fields={FIELDS}"
        f"&offset={offset}"
    )


# ── Calibration ──────────────────────────────────────────────────────────────

def _get_percentile_for_total(total: int, quality_offset: int = 0) -> int:
    """Return the percentile cutoff based on fandom size, shifted by quality_offset."""
    for max_total, percentile in FANDOM_SIZE_TIERS:
        if max_total is None or total < max_total:
            return min(percentile + quality_offset, 99)
    return min(FANDOM_SIZE_TIERS[-1][1] + quality_offset, 99)


def _is_valid_story(story: dict) -> bool:
    """Check if a story passes basic filters (not paywalled, English, enough reads)."""
    if story.get("isPaywalled", False):
        return False
    lang = story.get("language", {})
    if isinstance(lang, dict) and lang.get("id") != 1:
        return False
    reads = story.get("readCount", 0) or 0
    if reads < MIN_READS_FLOOR:
        return False
    return True


def _get_ratio(story: dict) -> float:
    """Compute vote/read ratio for a story."""
    votes = story.get("voteCount", 0) or 0
    reads = story.get("readCount", 0) or 0
    if reads == 0:
        return 0.0
    return votes / reads


def calibrate(query: str, session: requests.Session, quality_offset: int = 0) -> dict:
    """
    Sample the first CALIBRATION_PAGES pages of results and compute
    fandom-specific engagement thresholds.

    Returns a dict with:
        total: total search results
        min_ratio: the calibrated minimum vote/read ratio
        percentile_used: which percentile was applied
        sample_size: how many valid stories were sampled
        median_ratio: median ratio in the sample
        p75_ratio: 75th percentile ratio
    """
    ratios = []
    total = None

    for page in range(CALIBRATION_PAGES):
        offset = page * LIMIT
        url = build_search_url(query, offset=offset)

        try:
            resp = session.get(url, timeout=30)
            resp.raise_for_status()
            data = resp.json()
        except (requests.RequestException, ValueError):
            break

        if total is None:
            total = data.get("total", 0)

        stories = data.get("stories", [])
        if not stories:
            break

        for story in stories:
            if _is_valid_story(story):
                ratios.append(_get_ratio(story))

        # Don't sample more pages than exist
        if total and (page + 1) * LIMIT >= total:
            break

        time.sleep(random.uniform(1.0, 2.0))

    if not ratios or total is None:
        # Fallback: very loose filter if calibration fails
        return {
            "total": total or 0,
            "min_ratio": 0.01,
            "percentile_used": 0,
            "sample_size": 0,
            "median_ratio": 0,
            "p75_ratio": 0,
        }

    ratios.sort()
    percentile = _get_percentile_for_total(total, quality_offset)
    # Compute the ratio at the chosen percentile
    idx = int(len(ratios) * percentile / 100)
    idx = min(idx, len(ratios) - 1)
    min_ratio = ratios[idx]

    median_ratio = statistics.median(ratios)
    p75_idx = min(int(len(ratios) * 0.75), len(ratios) - 1)
    p75_ratio = ratios[p75_idx]

    return {
        "total": total,
        "min_ratio": min_ratio,
        "percentile_used": percentile,
        "sample_size": len(ratios),
        "median_ratio": median_ratio,
        "p75_ratio": p75_ratio,
    }


# ── Fic parsing ──────────────────────────────────────────────────────────────

def parse_story(story: dict) -> Fic:
    """Convert a Wattpad API story object to a Fic model."""
    tags = story.get("tags", []) or []

    return Fic(
        title=story.get("title", "").strip(),
        url=story.get("url", f"https://www.wattpad.com/story/{story.get('id', '')}"),
        platform="wattpad",
        summary=story.get("description"),
        tags=tags,
        word_count=None,  # Wattpad 'length' is characters, not reliable as word count
        kudos=story.get("voteCount"),
        hits=story.get("readCount"),
    )


# ── Main search ──────────────────────────────────────────────────────────────

def search(query: str, max_pages: int = 0, quality_offset: int = 0) -> list[Fic]:
    """
    Search Wattpad with dynamic quality filtering.

    Phase 1: Samples first pages to calibrate fandom-specific thresholds.
    Phase 2: Paginates through all results using calibrated filter.

    Args:
        query: Search keyword (e.g. "naruto", "harry potter")
        max_pages: Max pages to fetch in phase 2 (0 = no limit, paginate until exhausted)

    Returns:
        List of Fic objects that passed quality filtering
    """
    session = _make_session()

    # ── Phase 1: Calibration ──────────────────────────────────────────────
    print(f"\n[Wattpad] ── Calibrating for '{query}' ({CALIBRATION_PAGES} sample pages)... ──")
    cal = calibrate(query, session, quality_offset)

    print(f"[Wattpad] Fandom total: {cal['total']:,} stories")
    print(f"[Wattpad] Sample size: {cal['sample_size']} stories")
    print(f"[Wattpad] Median ratio: {cal['median_ratio']:.2%}")
    print(f"[Wattpad] P75 ratio: {cal['p75_ratio']:.2%}")
    print(f"[Wattpad] Using P{cal['percentile_used']} cutoff → min ratio: {cal['min_ratio']:.2%}")

    min_ratio = cal["min_ratio"]
    total = cal["total"]

    # ── Phase 2: Full scrape ──────────────────────────────────────────────
    print(f"\n[Wattpad] ── Scraping with calibrated filter (min ratio: {min_ratio:.2%}) ──")

    results = []
    offset = 0
    pages_fetched = 0
    consecutive_empty = 0

    while True:
        url = build_search_url(query, offset=offset)
        print(f"\n[Wattpad] Fetching offset {offset}...")

        try:
            resp = session.get(url, timeout=30)
            resp.raise_for_status()
            data = resp.json()
        except requests.RequestException as e:
            print(f"[Wattpad] Request failed at offset {offset}: {e}")
            break
        except ValueError:
            print(f"[Wattpad] Invalid JSON at offset {offset}")
            break

        stories = data.get("stories", [])
        if not stories:
            print(f"[Wattpad] No stories returned at offset {offset} — done")
            break

        # Filter and convert
        page_qualified = 0
        for story in stories:
            if not _is_valid_story(story):
                continue

            ratio = _get_ratio(story)
            if ratio >= min_ratio:
                fic = parse_story(story)
                results.append(fic)
                page_qualified += 1

        print(f"[Wattpad] Page {pages_fetched + 1}: {len(stories)} fetched, "
              f"{page_qualified} qualified (total qualified: {len(results)})")

        pages_fetched += 1

        # Early stop: consecutive pages with no qualifying fics
        if EARLY_STOP_ENABLED:
            if page_qualified == 0:
                consecutive_empty += 1
                if consecutive_empty >= MAX_EMPTY_PAGES:
                    print(f"[Wattpad] {MAX_EMPTY_PAGES} consecutive empty pages — stopping early")
                    break
            else:
                consecutive_empty = 0

        # Max pages limit
        if max_pages > 0 and pages_fetched >= max_pages:
            print(f"[Wattpad] Reached max_pages={max_pages} — stopping")
            break

        # Pagination: check if more results exist
        offset += LIMIT
        if total and offset >= total:
            print(f"[Wattpad] Reached end of results (offset {offset} >= total {total})")
            break

        next_url = data.get("nextUrl")
        if not next_url:
            print(f"[Wattpad] No nextUrl — done")
            break

        # Rate limiting — be polite
        delay = random.uniform(1.5, 3.0)
        time.sleep(delay)

    print(f"\n[Wattpad] Done: {len(results)} qualifying fics from {pages_fetched} pages")
    print(f"[Wattpad] Pass rate: {len(results)}/{pages_fetched * LIMIT} "
          f"({len(results) / max(pages_fetched * LIMIT, 1):.1%})")
    return results


if __name__ == "__main__":
    fics = search("naruto", max_pages=20)
    for fic in fics:
        ratio = (fic.kudos / fic.hits * 100) if fic.hits else 0
        print(f"{fic.title} | {fic.kudos} votes | {fic.hits} reads | {ratio:.1f}% | tags: {fic.tags[:3]}")