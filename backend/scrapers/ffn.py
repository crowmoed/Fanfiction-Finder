from seleniumbase import SB
from bs4 import BeautifulSoup
from typing import Optional
import time
import random
import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from data.schema import Fic
from data.fandoms import FANDOMS

try:
    import lxml  # noqa: F401
    _BS_PARSER = "lxml"
except ImportError:
    _BS_PARSER = "html.parser"

BASE_URL = "https://www.fanfiction.net"


def build_category_url(ffn_slug: str, page: int = 1, sort: int = 3, word_len: int = 0) -> str:
    len_param = f"&len={word_len}" if word_len > 0 else ""
    return f"{BASE_URL}/{ffn_slug}/?srt={sort}&r=10{len_param}&p={page}"


def parse_int(text: Optional[str]) -> Optional[int]:
    if not text:
        return None
    try:
        return int(text.strip().replace(",", ""))
    except ValueError:
        return None


def parse_results(html: str) -> list[Fic]:
    soup = BeautifulSoup(html, _BS_PARSER)
    try:
        results = soup.select("div.z-list")

        if not results:
            print("Warning: no results found")
            return []

        fics = []
        for work in results:
            title_tag = work.select_one("a.stitle")
            if not title_tag:
                continue

            title = title_tag.text.strip()
            url = BASE_URL + title_tag["href"]

            summary_tag = work.select_one("div.z-padtop")
            summary = summary_tag.text.strip() if summary_tag else None

            stats_tag = work.select_one("div.z-padtop2")
            stats_text = stats_tag.text if stats_tag else ""

            word_count, kudos, tags = None, None, []

            # FFN listing stats format:
            #   "Rated: T - English - Romance/Drama - Harry P., Hermione G. - Chapters: 12
            #    - Words: 45,000 - Reviews: 300 - Favs: 500 - Follows: 400
            #    - Updated: ... - Published: ... - Status: Complete - id: 12345"
            # Only Words/Favs are numeric stats; everything else (rating, language,
            # genre, characters/pairings, status) is a meaningful tag signal. FFN's
            # tag culture is thin, so extract every descriptor we can find.
            LABELED_STATS = ("Chapters:", "Words:", "Reviews:", "Favs:", "Follows:",
                             "Updated:", "Published:", "id:")

            parts = [p.strip() for p in stats_text.split(" - ") if p.strip()]
            for idx, part in enumerate(parts):
                if part.startswith("Words:"):
                    word_count = parse_int(part.replace("Words:", "").strip())
                    continue
                if part.startswith("Favs:"):
                    kudos = parse_int(part.replace("Favs:", "").strip())
                    continue
                if any(part.startswith(label) for label in LABELED_STATS):
                    continue

                if part.startswith("Rated:"):
                    rating = part.replace("Rated:", "").strip()
                    if rating:
                        tags.append(f"Rated {rating}")
                    continue
                if part.startswith("Status:"):
                    status = part.replace("Status:", "").strip()
                    if status:
                        tags.append(status)
                    continue

                # Unlabeled descriptors appear in a predictable order near the start:
                #   [language] - [genre(s)] - [characters/pairings]
                # Language is a single word; genre uses "/"; characters use ",".
                if idx <= 4:
                    if "/" in part:
                        tags.extend(t.strip() for t in part.split("/") if t.strip())
                    elif "," in part:
                        tags.extend(t.strip() for t in part.split(",") if t.strip())
                    elif part and not part[0].isdigit():
                        tags.append(part)

            fics.append(Fic(
                title=title,
                url=url,
                platform="ffn",
                summary=summary,
                tags=tags,
                word_count=word_count,
                kudos=kudos,
                hits=None
            ))

        return fics
    finally:
        soup.decompose()


def search(fandom_name: str, pages: int = 1, sort: int = 3) -> list[Fic]:
    if fandom_name not in FANDOMS:
        print(f"Error: '{fandom_name}' not in fandom list")
        return []

    ffn_slug = FANDOMS[fandom_name]["ffn"]
    if ffn_slug is None:
        print(f"Skipping FFN: no slug configured for '{fandom_name}'")
        return []
    results = []

    with SB(uc=True, headless=False) as sb:
        for page in range(1, pages + 1):
            url = build_category_url(ffn_slug, page=page, sort=sort)
            print(f"Fetching page {page}: {url}")

            sb.open(url)

            if page == 1:
                print("Waiting 10 seconds for FFN to load...")
                time.sleep(10)

            try:
                sb.wait_for_element("div.z-list", timeout=20)
            except Exception:
                print(f"Page {page}: no results or timed out")
                break

            html = sb.get_page_source()
            fics = parse_results(html)
            results.extend(fics)
            print(f"Page {page}: found {len(fics)} results")

            if page < pages:
                delay = 0
                print(f"Waiting {delay:.1f}s...")
                time.sleep(delay)

    return results


if __name__ == "__main__":
    fics = search("Harry Potter", pages=2)
    for fic in fics:
        print(f"{fic.title} | {fic.kudos} favs | {fic.word_count} words")