"""Tests for the per-fic platform-discriminated `meta` feature.

Validates that each scraper captures the platform-native metadata it previously
dropped, and that the discriminated union round-trips through a plain dict (as
search_rrf reconstructs it from the JSONB column).
"""

from data.schema import Fic, AO3Meta, FFNMeta, WattpadMeta


def test_wattpad_parse_story_captures_meta():
    from scrapers.wattpad import parse_story

    story = {
        "id": "999",
        "title": "A Wattpad Story",
        "url": "https://www.wattpad.com/story/999",
        "description": "desc",
        "tags": ["romance"],
        "voteCount": 1500,
        "readCount": 200000,
        "commentCount": 340,
        "numParts": 22,
        "completed": True,
        "mature": False,
        "cover": "https://img.wattpad.com/cover/999.jpg",
        "user": {"name": "wattuser", "username": "wattuser123", "numFollowers": 5000},
        "lastPublishedPart": {"createDate": "2024-06-01T00:00:00Z"},
        "firstPublishedPart": {"createDate": "2023-01-01T00:00:00Z"},
        "language": {"id": 1, "name": "English"},
    }
    fic = parse_story(story)

    assert fic.platform == "wattpad"
    assert isinstance(fic.meta, WattpadMeta)
    assert fic.meta.type == "wattpad"
    assert fic.meta.author == "wattuser"
    assert fic.meta.author_username == "wattuser123"
    assert fic.meta.author_followers == 5000
    assert fic.meta.votes == 1500
    assert fic.meta.reads == 200000
    assert fic.meta.comments == 340
    assert fic.meta.parts == 22
    assert fic.meta.complete is True
    assert fic.meta.mature is False
    assert fic.meta.cover == "https://img.wattpad.com/cover/999.jpg"
    assert fic.meta.language == "English"
    assert fic.meta.published == "2023-01-01T00:00:00Z"
    assert fic.meta.updated == "2024-06-01T00:00:00Z"


def test_ffn_parse_results_captures_meta():
    from scrapers.ffn import parse_results

    html = """<div class="z-list">
      <a class="stitle" href="/s/123/1/Title">My FFN Fic</a>
      <a href="/u/456/AuthorName">AuthorName</a>
      <div class="z-indent z-padtop">A summary.
        <div class="z-padtop2 xgray">Rated: T - English - Romance/Adventure - Harry P., Hermione G. - Chapters: 12 - Words: 45,000 - Reviews: 300 - Favs: 500 - Follows: 400 - Updated: Jun 1 - Published: Jan 1 - Status: Complete - id: 123</div>
      </div>
    </div>"""
    fics = parse_results(html)

    assert len(fics) == 1
    m = fics[0].meta
    assert isinstance(m, FFNMeta)
    assert m.author == "AuthorName"
    assert m.rating == "T"
    assert "Romance" in m.genres and "Adventure" in m.genres
    assert "Harry P." in m.characters
    assert m.language == "English"
    assert m.chapters == 12
    assert m.favs == 500
    assert m.follows == 400
    assert m.reviews == 300
    assert m.complete is True
    assert m.updated == "Jun 1"
    assert m.published == "Jan 1"
    assert fics[0].word_count == 45000
    assert fics[0].kudos == 500


def test_ao3_parse_results_captures_meta():
    from scrapers.ao3 import parse_results

    html = """<li class="work blurb group">
      <div class="header module">
        <h4 class="heading"><a href="/works/12345">My AO3 Work</a> by <a rel="author" href="/users/Someone">Someone</a></h4>
        <ul class="required-tags">
          <li><span class="rating-teen rating" title="Teen And Up Audiences">T</span></li>
          <li><span class="warning-no warnings" title="No Archive Warnings Apply">No</span></li>
          <li><span class="category-slash category" title="M/M">M/M</span></li>
          <li><span class="complete-yes iswip" title="Complete Work">C</span></li>
        </ul>
      </div>
      <blockquote class="userstuff summary">A summary.</blockquote>
      <ul class="tags commas"><li class="freeforms"><a class="tag">Fluff</a></li></ul>
      <dl class="stats">
        <dd class="language">English</dd>
        <dd class="words">12,345</dd>
        <dd class="chapters">5/12</dd>
        <dd class="comments">42</dd>
        <dd class="kudos">1,234</dd>
        <dd class="bookmarks">99</dd>
        <dd class="hits">56,789</dd>
      </dl>
      <p class="datetime">21 Jun 2024</p>
    </li>"""
    fics = parse_results(html)

    assert len(fics) == 1
    m = fics[0].meta
    assert isinstance(m, AO3Meta)
    assert m.author == "Someone"
    assert m.rating == "Teen And Up Audiences"
    assert m.categories == ["M/M"]
    assert m.warnings == ["No Archive Warnings Apply"]
    assert m.freeforms == ["Fluff"]
    assert m.complete is True
    assert m.chapters == "5/12"
    assert m.language == "English"
    assert m.kudos == 1234
    assert m.hits == 56789
    assert m.bookmarks == 99
    assert m.comments == 42
    assert m.updated == "21 Jun 2024"


def test_ao3_parse_work_page_captures_full_taxonomy():
    # The backfill scraper parses the full work page — the complete, separated tag
    # taxonomy + series/collections/published only exist here, not on the blurb.
    from scrapers.ao3 import parse_work_page

    html = """
    <h2 class="title heading">My Work</h2>
    <h3 class="byline heading"><a rel="author" href="/users/Someone">Someone</a></h3>
    <dl class="work meta group">
      <dt class="rating tags">Rating:</dt>
      <dd class="rating tags"><ul class="commas"><li><a class="tag">Mature</a></li></ul></dd>
      <dt class="warning tags">Archive Warnings:</dt>
      <dd class="warning tags"><ul class="commas"><li><a class="tag">Graphic Depictions Of Violence</a></li><li><a class="tag">Major Character Death</a></li></ul></dd>
      <dt class="category tags">Categories:</dt>
      <dd class="category tags"><ul class="commas"><li><a>M/M</a></li><li><a>Gen</a></li></ul></dd>
      <dt class="fandom tags">Fandoms:</dt>
      <dd class="fandom tags"><ul class="commas"><li><a>Harry Potter</a></li></ul></dd>
      <dt class="relationship tags">Relationships:</dt>
      <dd class="relationship tags"><ul class="commas"><li><a>Draco Malfoy/Harry Potter</a></li></ul></dd>
      <dt class="character tags">Characters:</dt>
      <dd class="character tags"><ul class="commas"><li><a>Harry Potter</a></li><li><a>Draco Malfoy</a></li></ul></dd>
      <dt class="freeform tags">Additional Tags:</dt>
      <dd class="freeform tags"><ul class="commas"><li><a>Slow Burn</a></li><li><a>Enemies to Lovers</a></li></ul></dd>
      <dt class="language">Language:</dt>
      <dd class="language">English</dd>
      <dt class="series">Series:</dt>
      <dd class="series"><span class="series"><span class="position">Part <a href="/series/9">2</a> of <a href="/series/9">My Series</a></span></span></dd>
      <dt class="collections">Collections:</dt>
      <dd class="collections"><a href="/collections/Cool">Cool Collection</a></dd>
      <dt class="stats">Stats:</dt>
      <dd class="stats"><dl class="stats">
        <dt class="published">Published:</dt><dd class="published">2020-01-01</dd>
        <dt class="status">Completed:</dt><dd class="status">2020-06-01</dd>
        <dt class="words">Words:</dt><dd class="words">123,456</dd>
        <dt class="chapters">Chapters:</dt><dd class="chapters">20/20</dd>
        <dt class="comments">Comments:</dt><dd class="comments">500</dd>
        <dt class="kudos">Kudos:</dt><dd class="kudos">9,999</dd>
        <dt class="bookmarks">Bookmarks:</dt><dd class="bookmarks">1,234</dd>
        <dt class="hits">Hits:</dt><dd class="hits">250,000</dd>
      </dl></dd>
    </dl>"""
    m = parse_work_page(html)

    assert m.type == "ao3"
    assert m.author == "Someone"
    assert m.rating == "Mature"
    assert m.categories == ["M/M", "Gen"]
    assert m.warnings == ["Graphic Depictions Of Violence", "Major Character Death"]
    assert m.fandoms == ["Harry Potter"]
    assert m.relationships == ["Draco Malfoy/Harry Potter"]
    assert m.characters == ["Harry Potter", "Draco Malfoy"]
    assert m.freeforms == ["Slow Burn", "Enemies to Lovers"]
    assert m.language == "English"
    assert m.chapters == "20/20"
    assert m.complete is True
    assert m.kudos == 9999
    assert m.hits == 250000
    assert m.bookmarks == 1234
    assert m.comments == 500
    assert m.published == "2020-01-01"
    assert m.updated == "2020-06-01"
    assert m.series == ["Part 2 of My Series"]
    assert m.collections == ["Cool Collection"]


def test_fic_meta_discriminated_union_roundtrips():
    # search_rrf reconstructs Fic(meta=<dict from JSONB>); the discriminator must
    # pick the right platform model from a plain dict.
    for meta in (AO3Meta(author="a"), FFNMeta(author="b"), WattpadMeta(author="c")):
        fic = Fic(title="t", url="u", platform=meta.type, meta=meta)
        dumped = fic.model_dump(mode="json")
        assert dumped["meta"]["type"] == meta.type

        rebuilt = Fic(**dumped)
        assert type(rebuilt.meta) is type(meta)
        assert rebuilt.meta.author == meta.author

    # A legacy row with NULL meta is valid.
    assert Fic(title="t", url="u", platform="ao3", meta=None).meta is None
