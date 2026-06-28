from bs4 import BeautifulSoup
from typing import Optional
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from data.schema import Fic, AO3Meta
from data.fandoms import FANDOMS
from urllib.parse import urlencode, quote, quote_plus

# lxml builds a smaller, faster DOM than html.parser. Falls back gracefully
# if lxml isn't installed — the parser swap is a memory win, not a correctness
# requirement.
try:
    import lxml  # noqa: F401
    _BS_PARSER = "lxml"
except ImportError:
    _BS_PARSER = "html.parser"

def build_search_url(query: str, fandom: Optional[str] = None, page: int = 1, min_words: int = 0) -> str:
    ao3_tag = FANDOMS[fandom]["ao3"]
    if ao3_tag is None:
        return None
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
        ("tag_id", ao3_tag),
    ]

    param_string = urlencode(params, quote_via=quote_plus)

    return f"https://archiveofourown.org/works?{param_string}"


def parse_results(html: str) -> list[Fic]:
    soup = BeautifulSoup(html, _BS_PARSER)
    try:
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
            # AO3 blurbs class each tag <li> by kind — keep the flat list (for search)
            # and the classified subsets (for meta). Blurbs truncate; the backfill
            # scraper fills the complete lists from the work page.
            tags = []
            rel_tags, char_tags, free_tags = [], [], []
            for li in work.select("ul.tags li"):
                txt = li.text.strip()
                if not txt:
                    continue
                tags.append(txt)
                cls = li.get("class") or []
                if "relationships" in cls:
                    rel_tags.append(txt)
                elif "characters" in cls:
                    char_tags.append(txt)
                elif "freeforms" in cls:
                    free_tags.append(txt)
            fandoms = [a.text.strip() for a in work.select("h5.fandoms a")]
            stats = work.select_one("dl.stats")
            kudos, hits, word_count = None, None, None
            bookmarks, comments, chapters, language = None, None, None, None
            if stats:
                kudos_tag = stats.select_one("dd.kudos")
                hits_tag = stats.select_one("dd.hits")
                words_tag = stats.select_one("dd.words")
                bookmarks_tag = stats.select_one("dd.bookmarks")
                comments_tag = stats.select_one("dd.comments")
                chapters_tag = stats.select_one("dd.chapters")
                language_tag = stats.select_one("dd.language")
                kudos = parse_int(kudos_tag.text if kudos_tag else None)
                hits = parse_int(hits_tag.text if hits_tag else None)
                word_count = parse_int(words_tag.text if words_tag else None)
                bookmarks = parse_int(bookmarks_tag.text if bookmarks_tag else None)
                comments = parse_int(comments_tag.text if comments_tag else None)
                chapters = chapters_tag.text.strip() if chapters_tag else None
                language = language_tag.text.strip() if language_tag else None

            # Author(s), rating/category/warnings (required-tags), status, and the
            # blurb's updated date. Each guarded — a missed selector degrades to None.
            authors = [a.text.strip() for a in work.select('a[rel="author"]')]
            author = ", ".join(authors) if authors else None

            def _req_tag(selector: str) -> Optional[str]:
                tag = work.select_one(selector)
                if not tag:
                    return None
                return (tag.get("title") or tag.text or "").strip() or None

            rating = _req_tag("span.rating")
            category = _req_tag("span.category")
            warning = _req_tag("span.warnings")
            complete = None
            if work.select_one("span.complete-yes"):
                complete = True
            elif work.select_one("span.complete-no"):
                complete = False
            datetime_tag = work.select_one("p.datetime")
            updated = datetime_tag.text.strip() if datetime_tag else None

            meta = AO3Meta(
                author=author,
                rating=rating,
                categories=[category] if category else [],
                warnings=[warning] if warning else [],
                fandoms=fandoms,
                relationships=rel_tags,
                characters=char_tags,
                freeforms=free_tags,
                language=language,
                chapters=chapters,
                complete=complete,
                kudos=kudos,
                hits=hits,
                bookmarks=bookmarks,
                comments=comments,
                updated=updated,
            )

            fics.append(Fic(
                title=title,
                url=url,
                platform="ao3",
                summary=summary,
                tags=tags,
                word_count=word_count,
                kudos=kudos,
                hits=hits,
                meta=meta,
            ))
        return fics
    finally:
        # Break circular parent/child refs so the DOM frees immediately
        # instead of waiting for cyclic GC. Matters across hundreds of pages.
        soup.decompose()


def parse_int(text: Optional[str]) -> Optional[int]:
    if not text:
        return None
    try:
        return int(text.strip().replace(",", ""))
    except ValueError:
        return None


def parse_work_page(html: str) -> AO3Meta:
    """Parse a full AO3 work page (/works/ID) into rich AO3Meta.

    The work page exposes the COMPLETE tag taxonomy (fandoms, relationships,
    characters, freeforms), all warnings/categories, series + collections, and the
    published date — none of which the search blurb gives in full. Best-effort:
    every field is guarded so a layout change degrades to None/[] instead of raising.
    """
    soup = BeautifulSoup(html, _BS_PARSER)
    try:
        def tag_list(dd_class: str) -> list[str]:
            return [a.text.strip() for a in soup.select(f"dd.{dd_class} ul li a") if a.text.strip()]

        # rel=author appears in both the byline and the meta block — de-dupe, keep order.
        seen: set[str] = set()
        author_names: list[str] = []
        for a in soup.select('a[rel="author"]'):
            name = a.text.strip()
            if name and name not in seen:
                seen.add(name)
                author_names.append(name)
        author = ", ".join(author_names) if author_names else None

        rating_tag = soup.select_one("dd.rating ul li a")
        rating = rating_tag.text.strip() if rating_tag else None

        lang_tag = soup.select_one("dd.language")
        language = lang_tag.text.strip() if lang_tag else None

        def stat(cls: str) -> Optional[str]:
            t = soup.select_one(f"dl.stats dd.{cls}")
            return t.text.strip() if t else None

        # dt.status reads "Completed:" (done) or "Updated:" (WIP); dd.status holds the date.
        complete = None
        status_dt = soup.select_one("dl.stats dt.status")
        if status_dt:
            complete = "complete" in status_dt.text.lower()

        series = [s.get_text(" ", strip=True) for s in soup.select("dd.series span.position")]
        if not series:
            series = [a.text.strip() for a in soup.select('dd.series a[href^="/series/"]')]
        collections = [a.text.strip() for a in soup.select("dd.collections a")]

        return AO3Meta(
            author=author,
            rating=rating,
            categories=tag_list("category"),
            warnings=tag_list("warning"),
            fandoms=tag_list("fandom"),
            relationships=tag_list("relationship"),
            characters=tag_list("character"),
            freeforms=tag_list("freeform"),
            language=language,
            chapters=stat("chapters"),
            complete=complete,
            kudos=parse_int(stat("kudos")),
            hits=parse_int(stat("hits")),
            bookmarks=parse_int(stat("bookmarks")),
            comments=parse_int(stat("comments")),
            published=stat("published"),
            updated=stat("status"),
            series=series,
            collections=collections,
        )
    finally:
        soup.decompose()