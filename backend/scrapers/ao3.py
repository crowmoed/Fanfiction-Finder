from seleniumbase import SB
from bs4 import BeautifulSoup
from typing import Optional
import time
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from data.schema import Fic
from data.fandoms import FANDOMS
from urllib.parse import urlencode, quote, quote_plus

def build_search_url(query: str, fandom: Optional[str] = None, page: int = 1, min_words: int = 0) -> str:
    ao3_tag = FANDOMS[fandom]["ao3"]
    encoded_tag = ao3_tag.replace(" ", "+").replace("&", "*a*")
    
    params = [
        ("commit", "Sort and Filter"),
        ("work_search[sort_column]", "kudos_count"),
        ("work_search[other_tag_names]", ""),
        ("work_search[excluded_tag_names]", ""),
        ("work_search[crossover]", ""),
        ("work_search[complete]", ""),
        ("work_search[words_from]", str(min_words)),
        ("work_search[words_to]", ""),
        ("work_search[date_from]", ""),
        ("work_search[date_to]", ""),
        ("work_search[query]", ""),
        ("work_search[language_id]", ""),
        ("page", str(page)),
    ]

    param_string = urlencode(
        params,
        quote_via=quote_plus
    ) + f"&tag_id={encoded_tag}"

    return f"https://archiveofourown.org/works?{param_string}"


def parse_results(html: str) -> list[Fic]:
    soup = BeautifulSoup(html, "html.parser")
    works = soup.select("li.work.blurb.group")
    fics = []
    for work in works:
        title_tag = work.select_one("h4.heading a:first-child")
        if not title_tag:
            continue
        title = title_tag.text.strip()
        url = "https://archiveofourown.org" + title_tag["href"]
        summary_tag = work.select_one("blockquote.summary")
        summary = summary_tag.text.strip() if summary_tag else None
        tags = [t.text.strip() for t in work.select("ul.tags li")]
        stats = work.select_one("dl.stats")
        kudos, hits, word_count = None, None, None
        if stats:
            kudos_tag = stats.select_one("dd.kudos")
            hits_tag = stats.select_one("dd.hits")
            words_tag = stats.select_one("dd.words")
            kudos = parse_int(kudos_tag.text if kudos_tag else None)
            hits = parse_int(hits_tag.text if hits_tag else None)
            word_count = parse_int(words_tag.text if words_tag else None)
        fics.append(Fic(
            title=title,
            url=url,
            platform="ao3",
            summary=summary,
            tags=tags,
            word_count=word_count,
            kudos=kudos,
            hits=hits
        ))
    return fics


def search(query: str, fandom: Optional[str] = None, pages: int = 1) -> list[Fic]:
    results = []
    with SB(uc=True, headless=False) as sb:
        for page in range(1, pages + 1):
            url = build_search_url(query, fandom=fandom, page=page)
            print(f"Fetching page {page}: {url}")
            sb.open(url)
            if page == 1:
                print("If AO3 shows an interstitial, click through it now.")
                print("Waiting 10 seconds...")
                time.sleep(10)
            try:
                sb.wait_for_element("li.work.blurb.group", timeout=20)
            except Exception:
                print(f"Page {page}: no results found or timed out")
                break
            html = sb.get_page_source()
            fics = parse_results(html)
            results.extend(fics)
            print(f"Page {page}: found {len(fics)} results")
            if page < pages:
                time.sleep(0)
    return results

def parse_int(text: Optional[str]) -> Optional[int]:
    if not text:
        return None
    try:
        return int(text.strip().replace(",", ""))
    except ValueError:
        return None
        
if __name__ == "__main__":
    fics = search("enemies to lovers slow burn", fandom="Harry Potter", pages=2)
    for fic in fic:
        print(f"{fic.title} | {fic.kudos} kudos | {fic.word_count} words")