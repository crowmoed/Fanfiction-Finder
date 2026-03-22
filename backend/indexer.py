import os
import sys
import time
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from dotenv import load_dotenv
from data.fandoms import FANDOMS
from ai.embedder import embed_fics_batch
from db.postgres import upsert_fic, get_fic_count, init_db, clear_fandom
from seleniumbase import SB
import random

load_dotenv()

MIN_WORDS = 5000

def scrape_and_embed_ao3(fandom_name: str, sb, first_fandom: bool = False) -> int:
    from scrapers.ao3 import build_search_url, parse_results
    stored = 0
    page = 1

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
        embeddings = embed_fics_batch(fics)
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
            embeddings = embed_fics_batch(fics)
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


def index_fandom(fandom_name: str, clear: bool = False):
    print(f"\n{'='*50}")
    print(f"Indexing: {fandom_name}")
    print(f"{'='*50}")

    if clear:
        clear_fandom(fandom_name)

    total_stored = 0

    with SB(uc=True, headless=False) as sb:
        ao3_stored = scrape_and_embed_ao3(fandom_name, sb, first_fandom=True)
        print(f"\n[AO3] Done: {ao3_stored} fics stored")

        print("\nSwitching to FFN in 15s...")
        time.sleep(15)

        ffn_stored = scrape_and_embed_ffn(fandom_name, sb, first_fandom=True)
        print(f"\n[FFN] Done: {ffn_stored} fics stored")

        total_stored = ao3_stored + ffn_stored

    print(f"\n[Done] {fandom_name}: {total_stored} total fics indexed")
    return total_stored


def index_all(clear: bool = False):
    init_db()
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

            total += ao3_stored + ffn_stored
            print(f"\n[Done] {fandom_name}: {ao3_stored + ffn_stored} fics indexed")

    print(f"\n{'='*50}")
    print(f"Indexing complete. Total fics stored: {total}")


def index_one(fandom_name: str, clear: bool = False):
    if fandom_name not in FANDOMS:
        print(f"Unknown fandom: '{fandom_name}'")
        print(f"Available: {list(FANDOMS.keys())}")
        return
    init_db()
    index_fandom(fandom_name, clear=clear)


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] != "--clear":
        fandom = sys.argv[1]
        should_clear = "--clear" in sys.argv
        index_one(fandom, clear=should_clear)
    else:
        should_clear = "--clear" in sys.argv
        index_all(clear=should_clear)