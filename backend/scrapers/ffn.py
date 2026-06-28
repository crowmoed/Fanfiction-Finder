from bs4 import BeautifulSoup
from typing import Optional
import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from data.schema import Fic, FFNMeta

try:
    import lxml  # noqa: F401
    _BS_PARSER = "lxml"
except ImportError:
    _BS_PARSER = "html.parser"

BASE_URL = "https://www.fanfiction.net"


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

            author_tag = work.select_one('a[href^="/u/"]')
            author = author_tag.text.strip() if author_tag else None

            summary_tag = work.select_one("div.z-padtop")
            summary = summary_tag.text.strip() if summary_tag else None

            stats_tag = work.select_one("div.z-padtop2")
            stats_text = stats_tag.text if stats_tag else ""

            word_count, kudos, tags = None, None, []
            # Typed metadata captured alongside the tag list (the tags still feed search).
            m_rating = m_language = None
            m_genres, m_characters = [], []
            m_chapters = m_reviews = m_follows = None
            m_updated = m_published = m_complete = None

            # FFN listing stats format:
            #   "Rated: T - English - Romance/Drama - Harry P., Hermione G. - Chapters: 12
            #    - Words: 45,000 - Reviews: 300 - Favs: 500 - Follows: 400
            #    - Updated: ... - Published: ... - Status: Complete - id: 12345"
            # Only Words/Favs are numeric stats; everything else (rating, language,
            # genre, characters/pairings, status) is a meaningful tag signal. FFN's
            # tag culture is thin, so extract every descriptor we can find.
            parts = [p.strip() for p in stats_text.split(" - ") if p.strip()]
            for idx, part in enumerate(parts):
                if part.startswith("Words:"):
                    word_count = parse_int(part.replace("Words:", "").strip())
                    continue
                if part.startswith("Favs:"):
                    kudos = parse_int(part.replace("Favs:", "").strip())
                    continue
                if part.startswith("Chapters:"):
                    m_chapters = parse_int(part.replace("Chapters:", "").strip())
                    continue
                if part.startswith("Reviews:"):
                    m_reviews = parse_int(part.replace("Reviews:", "").strip())
                    continue
                if part.startswith("Follows:"):
                    m_follows = parse_int(part.replace("Follows:", "").strip())
                    continue
                if part.startswith("Updated:"):
                    m_updated = part.replace("Updated:", "").strip() or None
                    continue
                if part.startswith("Published:"):
                    m_published = part.replace("Published:", "").strip() or None
                    continue
                if part.startswith("id:"):
                    continue

                if part.startswith("Rated:"):
                    m_rating = part.replace("Rated:", "").strip() or None
                    if m_rating:
                        tags.append(f"Rated {m_rating}")
                    continue
                if part.startswith("Status:"):
                    status = part.replace("Status:", "").strip()
                    if status:
                        tags.append(status)
                        m_complete = status.lower().startswith("complete")
                    continue

                # Unlabeled descriptors appear in a predictable order near the start:
                #   [language] - [genre(s)] - [characters/pairings]
                # Language is a single word; genre uses "/"; characters use ",".
                if idx <= 4:
                    if "/" in part:
                        g = [t.strip() for t in part.split("/") if t.strip()]
                        m_genres.extend(g)
                        tags.extend(g)
                    elif "," in part:
                        c = [t.strip() for t in part.split(",") if t.strip()]
                        m_characters.extend(c)
                        tags.extend(c)
                    elif part and not part[0].isdigit():
                        if m_language is None:
                            m_language = part
                        tags.append(part)

            meta = FFNMeta(
                author=author,
                rating=m_rating,
                genres=m_genres,
                characters=m_characters,
                language=m_language,
                chapters=m_chapters,
                complete=m_complete,
                favs=kudos,
                follows=m_follows,
                reviews=m_reviews,
                updated=m_updated,
                published=m_published,
            )

            fics.append(Fic(
                title=title,
                url=url,
                platform="ffn",
                summary=summary,
                tags=tags,
                word_count=word_count,
                kudos=kudos,
                hits=None,
                meta=meta,
            ))

        return fics
    finally:
        soup.decompose()