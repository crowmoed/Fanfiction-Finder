import os
import sys
import time
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from dotenv import load_dotenv
from data.fandoms import FANDOMS
from ai.embedder import embed_fics_batch
from db.postgres import upsert_fic, get_fic_count, init_db, clear_fandom, migrate_embedding_dimensions
from seleniumbase import SB
import random

load_dotenv()

MIN_WORDS = 20000
WATTPAD_QUALITY_OFFSET = 2

def scrape_and_embed_ao3(fandom_name: str, sb, first_fandom: bool = False, start_page: int = 1) -> int:
    from scrapers.ao3 import build_search_url, parse_results
    stored = 0
    page = start_page

    while True:
        url = build_search_url("", fandom=fandom_name, page=page, min_words=MIN_WORDS)
        print(f"\n[AO3] Fetching page {page}: {url}")

        sb.open(url)

        if page == 1 and first_fandom:
            print("[AO3] Waiting 15s — click through any interstitial now...")
            time.sleep(15)
        elif page == 1:
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
        for fic, embedding in zip(fics, embeddings):
            try:
                upsert_fic(fic=fic, fandom=fandom_name, embedding=embedding)
                stored += 1
            except Exception as e:
                print(f"  Skipped '{fic.title}': {e}")

        page += 1
        time.sleep(8)

    return stored


def scrape_and_embed_ffn(fandom_name: str, sb, first_fandom: bool = False) -> int:
    from scrapers.ffn import parse_results
    stored = 0

    ffn_slug = FANDOMS[fandom_name]["ffn"]

    for word_len in [10, 20]:
        label = "40k-100k" if word_len == 10 else "100k+"
        page = 1

        while True:
            url = f"https://www.fanfiction.net/{ffn_slug}/?srt=3&r=10&len={word_len}&p={page}"
            print(f"\n[FFN] Fetching page {page} ({label}): {url}")

            sb.open(url)

            if page == 1 and first_fandom:
                print("[FFN] Waiting 15s for page to load...")
                time.sleep(15)
            elif page == 1:
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
            for fic, embedding in zip(fics, embeddings):
                try:
                    upsert_fic(fic=fic, fandom=fandom_name, embedding=embedding)
                    stored += 1
                except Exception as e:
                    print(f"  Skipped '{fic.title}': {e}")

            page += 1
            delay = random.uniform(5, 10)
            time.sleep(delay)

    return stored


def scrape_and_embed_wattpad(fandom_name: str, quality_offset: int = WATTPAD_QUALITY_OFFSET) -> int:
    from scrapers.wattpad import search
    stored = 0

    query = FANDOMS[fandom_name]["wattpad"]
    fics = search(query, max_pages=0, quality_offset=quality_offset)

    if not fics:
        print(f"[Wattpad] No qualifying fics found for '{fandom_name}'")
        return 0

    # Embed in batches of ~50 (matches scraper page size)
    batch_size = 50
    for batch_start in range(0, len(fics), batch_size):
        batch = fics[batch_start:batch_start + batch_size]
        print(f"[Wattpad] Embedding batch {batch_start // batch_size + 1} "
              f"({len(batch)} fics)...")
        embeddings = embed_fics_batch(batch, fandom=fandom_name)
        for fic, embedding in zip(batch, embeddings):
            try:
                upsert_fic(fic=fic, fandom=fandom_name, embedding=embedding)
                stored += 1
            except Exception as e:
                print(f"  Skipped '{fic.title}': {e}")

    return stored


def index_fandom(fandom_name: str, clear: bool = False, start_page: int = 1, wattpad_quality: int = WATTPAD_QUALITY_OFFSET):
    print(f"\n{'='*50}")
    print(f"Indexing: {fandom_name}")
    print(f"{'='*50}")

    if clear:
        clear_fandom(fandom_name)

    total_stored = 0

    with SB(uc=True, headless=False) as sb:
        ao3_stored = scrape_and_embed_ao3(fandom_name, sb, first_fandom=True, start_page=start_page)
        print(f"\n[AO3] Done: {ao3_stored} fics stored")

        print("\nSwitching to FFN in 15s...")
        time.sleep(15)

        ffn_stored = scrape_and_embed_ffn(fandom_name, sb, first_fandom=True)
        print(f"\n[FFN] Done: {ffn_stored} fics stored")

        total_stored = ao3_stored + ffn_stored

    wattpad_stored = scrape_and_embed_wattpad(fandom_name, quality_offset=wattpad_quality)
    print(f"\n[Wattpad] Done: {wattpad_stored} fics stored")
    total_stored += wattpad_stored

    print(f"\n[Done] {fandom_name}: {total_stored} total fics indexed")
    return total_stored


def index_all(clear: bool = False, wattpad_quality: int = WATTPAD_QUALITY_OFFSET):
    init_db()
    migrate_embedding_dimensions()
    total = 0

    with SB(uc=True, headless=False) as sb:
        for i, fandom_name in enumerate(FANDOMS):
            print(f"\n{'='*50}")
            print(f"Indexing: {fandom_name}")
            print(f"{'='*50}")

            if clear:
                clear_fandom(fandom_name)

            ao3_stored = scrape_and_embed_ao3(fandom_name, sb, first_fandom=(i == 0))
            print(f"\n[AO3] Done: {ao3_stored} fics stored")

            print("\nSwitching to FFN in 15s...")
            time.sleep(15)

            ffn_stored = scrape_and_embed_ffn(fandom_name, sb, first_fandom=(i == 0))
            print(f"\n[FFN] Done: {ffn_stored} fics stored")

            wattpad_stored = scrape_and_embed_wattpad(fandom_name, quality_offset=wattpad_quality)
            print(f"\n[Wattpad] Done: {wattpad_stored} fics stored")

            total += ao3_stored + ffn_stored + wattpad_stored
            print(f"\n[Done] {fandom_name}: {ao3_stored + ffn_stored + wattpad_stored} fics indexed")

    print(f"\n{'='*50}")
    print(f"Indexing complete. Total fics stored: {total}")


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


def index_one(fandom_name: str, clear: bool = False, start_page: int = 1, wattpad_quality: int = WATTPAD_QUALITY_OFFSET):
    if fandom_name not in FANDOMS:
        print(f"Unknown fandom: '{fandom_name}'")
        print(f"Available: {list(FANDOMS.keys())}")
        return
    init_db()
    migrate_embedding_dimensions()
    index_fandom(fandom_name, clear=clear, start_page=start_page, wattpad_quality=wattpad_quality)


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] != "--clear":
        fandom = sys.argv[1]
        should_clear = "--clear" in sys.argv

        start_page = int(sys.argv[sys.argv.index("--start-page") + 1]) if "--start-page" in sys.argv else 1
        wattpad_quality = int(sys.argv[sys.argv.index("--wattpad-quality") + 1]) if "--wattpad-quality" in sys.argv else WATTPAD_QUALITY_OFFSET

        if "--ffn-only" in sys.argv:
            index_ffn_only(fandom)
        elif "--wattpad-only" in sys.argv:
            index_wattpad_only(fandom, wattpad_quality=wattpad_quality)
        else:
            index_one(fandom, clear=should_clear, start_page=start_page, wattpad_quality=wattpad_quality)
    else:
        should_clear = "--clear" in sys.argv
        wattpad_quality = int(sys.argv[sys.argv.index("--wattpad-quality") + 1]) if "--wattpad-quality" in sys.argv else WATTPAD_QUALITY_OFFSET
        index_all(clear=should_clear, wattpad_quality=wattpad_quality)