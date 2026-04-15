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

# Wattpad's v4 search caps pagination at offset 10,000 regardless of total.
# To cover fandoms larger than that, we shard the corpus by story length
# (minParts/maxParts) and walk each shard independently, deduping by id.
OFFSET_CAP = 10_000

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


def build_search_url(
    query: str,
    offset: int = 0,
    min_parts: int | None = None,
    max_parts: int | None = None,
    update_younger_than: int | None = None,
) -> str:
    """Build the Wattpad v4 search API URL."""
    url = (
        f"{BASE_URL}?query={requests.utils.quote(query)}"
        f"&limit={LIMIT}"
        f"&fields={FIELDS}"
        f"&offset={offset}"
    )
    if min_parts is not None:
        url += f"&minParts={min_parts}"
    if max_parts is not None:
        url += f"&maxParts={max_parts}"
    if update_younger_than is not None:
        url += f"&updateYoungerThan={update_younger_than}"
    return url


# A shard is (min_parts, max_parts, update_younger_than_days).
# `None` on max_parts means open-ended. `None` on the age field means no age filter.
Shard = tuple[int | None, int | None, int | None]


def _get_total(session: requests.Session, query: str, shard: Shard) -> int:
    """Cheap probe: total results for a given shard."""
    lo, hi, age = shard
    url = build_search_url(query, offset=0, min_parts=lo, max_parts=hi,
                           update_younger_than=age)
    try:
        resp = session.get(url, timeout=30)
        resp.raise_for_status()
        return resp.json().get("total", 0) or 0
    except (requests.RequestException, ValueError):
        return 0


# Age cutoffs (days since last update) used to split single-parts buckets that
# still overflow. Applied in ascending order so each shard covers the delta
# between consecutive cutoffs; we post-process to form disjoint age ranges.
AGE_CUTOFFS_DAYS = [30, 180, 365, 1095, 3650]  # ~1mo, 6mo, 1yr, 3yr, 10yr


def _plan_shards(session: requests.Session, query: str) -> list[Shard]:
    """
    Build a list of shards that each fit under OFFSET_CAP.

    Strategy:
      1. Start from coarse minParts buckets.
      2. Binary-subdivide any overflow bucket on the parts axis.
      3. If a single-width parts bucket still overflows (e.g. 1-part stories),
         fall back to splitting it on updateYoungerThan (age) windows.
    """
    initial: list[Shard] = [
        (1, 1, None), (2, 2, None), (3, 3, None), (4, 5, None),
        (6, 10, None), (11, 20, None), (21, 50, None), (51, None, None),
    ]

    final: list[Shard] = []
    queue: list[Shard] = list(initial)
    age_split_attempted: set[tuple[int | None, int | None]] = set()

    while queue:
        shard = queue.pop(0)
        lo, hi, age = shard
        total = _get_total(session, query, shard)
        if total == 0:
            continue
        if total <= OFFSET_CAP:
            final.append(shard)
            continue

        # Overflow — try to subdivide on the parts axis first
        if hi is None:
            new_hi = max(lo + 1, lo * 4)
            queue.append((lo, new_hi, age))
            queue.append((new_hi + 1, None, age))
            continue
        if hi > lo:
            mid = (lo + hi) // 2
            queue.append((lo, mid, age))
            queue.append((mid + 1, hi, age))
            continue

        # Parts axis exhausted (lo == hi). Fall back to age-window splits.
        # Age cutoffs are cumulative ("updated within N days"), so shards
        # overlap — dedup by id handles the overlap cheaply.
        if age is not None or (lo, hi) in age_split_attempted:
            # Already tried age splitting or already on an age shard — accept
            # what we can reach (first OFFSET_CAP results of this shard).
            print(f"[Wattpad] shard {shard} still overflows ({total}); "
                  f"accepting first {OFFSET_CAP} only")
            final.append(shard)
            continue

        print(f"[Wattpad] single-parts shard [{lo},{hi}] overflows "
              f"({total}) — splitting by age")
        age_split_attempted.add((lo, hi))
        for days in AGE_CUTOFFS_DAYS:
            queue.append((lo, hi, days))
        # Also keep the unrestricted shard to sweep stories older than the
        # largest cutoff; dedup by id removes overlap with the age shards.
        # On requeue it will fall into the "already attempted" branch above
        # and be accepted as a best-effort up-to-10k shard.
        queue.append((lo, hi, None))

    # Preserve ascending order for nicer logs: parts first, then age
    final.sort(key=lambda s: (
        s[0] if s[0] is not None else 0,
        s[1] if s[1] is not None else 10**9,
        s[2] if s[2] is not None else 10**9,
    ))
    return final


# ── Calibration ──────────────────────────────────────────────────────────────

def _get_percentile_for_total(total: int, quality_offset: int = 0) -> int:
    """Return the percentile cutoff based on fandom size, shifted by quality_offset.

    Positive offset → stricter filter (fewer, higher-quality fics).
    Negative offset → looser filter (more fics).
    Clamped to [1, 99].
    """
    for max_total, percentile in FANDOM_SIZE_TIERS:
        if max_total is None or total < max_total:
            return max(1, min(percentile + quality_offset, 99))
    return max(1, min(FANDOM_SIZE_TIERS[-1][1] + quality_offset, 99))


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

    # ── Phase 2: Plan shards to work around the 10k offset cap ────────────
    print(f"\n[Wattpad] ── Planning shards (corpus: {total:,}) ──")
    shards = _plan_shards(session, query)
    print(f"[Wattpad] {len(shards)} shards: {shards}")

    # ── Phase 3: Scrape each shard, dedupe by story id ────────────────────
    print(f"\n[Wattpad] ── Scraping with calibrated filter (min ratio: {min_ratio:.2%}) ──")

    seen_ids: set[str] = set()
    results: list[Fic] = []
    pages_fetched = 0
    budget_exhausted = False

    for shard_idx, (min_parts, max_parts, age_days) in enumerate(shards, 1):
        parts_label = f"parts[{min_parts},{max_parts if max_parts is not None else '∞'}]"
        age_label = f" age<={age_days}d" if age_days is not None else ""
        shard_label = parts_label + age_label
        print(f"\n[Wattpad] ── Shard {shard_idx}/{len(shards)} {shard_label} ──")

        offset = 0
        shard_qualified = 0
        consecutive_empty = 0

        while True:
            url = build_search_url(query, offset=offset,
                                   min_parts=min_parts, max_parts=max_parts,
                                   update_younger_than=age_days)
            print(f"[Wattpad] {shard_label} offset {offset}...")

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
                print(f"[Wattpad] No stories at offset {offset} — shard done")
                break

            page_qualified = 0
            page_new = 0
            for story in stories:
                if not _is_valid_story(story):
                    continue
                ratio = _get_ratio(story)
                if ratio < min_ratio:
                    continue

                sid = str(story.get("id", ""))
                if not sid or sid in seen_ids:
                    continue
                seen_ids.add(sid)

                results.append(parse_story(story))
                page_qualified += 1
                page_new += 1

            shard_qualified += page_qualified
            print(f"[Wattpad] {shard_label} page {pages_fetched + 1}: "
                  f"{len(stories)} fetched, {page_qualified} qualified, "
                  f"{page_new} new (total unique: {len(results)})")

            pages_fetched += 1

            if EARLY_STOP_ENABLED:
                if page_qualified == 0:
                    consecutive_empty += 1
                    if consecutive_empty >= MAX_EMPTY_PAGES:
                        print(f"[Wattpad] {MAX_EMPTY_PAGES} empty pages — stopping shard")
                        break
                else:
                    consecutive_empty = 0

            if max_pages > 0 and pages_fetched >= max_pages:
                print(f"[Wattpad] Reached max_pages={max_pages} — stopping all shards")
                budget_exhausted = True
                break

            offset += LIMIT
            if offset >= OFFSET_CAP:
                print(f"[Wattpad] {shard_label} hit offset cap ({OFFSET_CAP}) — shard done")
                break

            if not data.get("nextUrl"):
                print(f"[Wattpad] {shard_label} no nextUrl — shard done")
                break

            time.sleep(random.uniform(1.5, 3.0))

        print(f"[Wattpad] Shard {shard_label} done: {shard_qualified} qualified")
        if budget_exhausted:
            break

    print(f"\n[Wattpad] Done: {len(results)} unique qualifying fics from "
          f"{pages_fetched} pages across {len(shards)} shards")
    if pages_fetched:
        print(f"[Wattpad] Pass rate: {len(results)}/{pages_fetched * LIMIT} "
              f"({len(results) / (pages_fetched * LIMIT):.1%})")
    return results


if __name__ == "__main__":
    fics = search("naruto", max_pages=20)
    for fic in fics:
        ratio = (fic.kudos / fic.hits * 100) if fic.hits else 0
        print(f"{fic.title} | {fic.kudos} votes | {fic.hits} reads | {ratio:.1f}% | tags: {fic.tags[:3]}")