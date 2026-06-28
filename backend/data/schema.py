from pydantic import BaseModel, Field
from typing import Optional, Literal, Annotated, Union


# ── Platform-specific per-fic metadata ────────────────────────────────────────
# One tagged blob per fic, discriminated by `type` (== the fic's platform). The
# frontend switches on `meta.type` to render the platform-native fields. Every
# field is optional: the index-time scrapers fill what the list/API exposes, and
# the backfill scraper (which fetches each fic's own page) fills the rest — so a
# partially-populated or legacy NULL blob is always valid.

class AO3Meta(BaseModel):
    """AO3 metadata. List blurbs give a truncated/lumped view; the work page gives
    the full separated tag taxonomy + series/collections/published date."""
    type: Literal["ao3"] = "ao3"
    author: Optional[str] = None          # co-authors joined with ", "
    rating: Optional[str] = None          # General Audiences / Teen / Mature / Explicit / Not Rated
    categories: list[str] = []            # F/F, F/M, Gen, M/M, Multi, Other
    warnings: list[str] = []              # archive warnings
    fandoms: list[str] = []
    relationships: list[str] = []
    characters: list[str] = []
    freeforms: list[str] = []             # additional / freeform tags
    language: Optional[str] = None
    chapters: Optional[str] = None        # "5/12" (posted/total); "?" total ⇒ WIP
    complete: Optional[bool] = None
    kudos: Optional[int] = None
    hits: Optional[int] = None
    bookmarks: Optional[int] = None
    comments: Optional[int] = None
    published: Optional[str] = None       # work page only
    updated: Optional[str] = None
    series: list[str] = []                # work page only — "Series Name (3 of 5)"
    collections: list[str] = []           # work page only


class FFNMeta(BaseModel):
    """FanFiction.Net metadata. The z-list row already exposes the full field set
    (the story page adds only the full summary), so this is captured at index time."""
    type: Literal["ffn"] = "ffn"
    author: Optional[str] = None
    rating: Optional[str] = None          # K / K+ / T / M
    genres: list[str] = []
    characters: list[str] = []
    language: Optional[str] = None
    chapters: Optional[int] = None
    complete: Optional[bool] = None
    favs: Optional[int] = None
    follows: Optional[int] = None
    reviews: Optional[int] = None
    updated: Optional[str] = None
    published: Optional[str] = None


class WattpadMeta(BaseModel):
    """Wattpad v4 search-API metadata (no per-story endpoint exists)."""
    type: Literal["wattpad"] = "wattpad"
    author: Optional[str] = None
    author_username: Optional[str] = None
    author_followers: Optional[int] = None
    mature: Optional[bool] = None
    complete: Optional[bool] = None
    parts: Optional[int] = None
    votes: Optional[int] = None
    reads: Optional[int] = None
    comments: Optional[int] = None
    cover: Optional[str] = None
    language: Optional[str] = None        # language.name
    published: Optional[str] = None       # firstPublishedPart.createDate
    updated: Optional[str] = None         # lastPublishedPart.createDate


# Discriminated union — frontend parses by `meta.type`.
FicMeta = Annotated[Union[AO3Meta, FFNMeta, WattpadMeta], Field(discriminator="type")]


class Fic(BaseModel):
    title: str
    url: str
    platform: str
    fandom: Optional[str] = None
    summary: Optional[str] = None
    tags: list[str] = []
    word_count: Optional[int] = None
    kudos: Optional[int] = None
    hits: Optional[int] = None
    meta: Optional[FicMeta] = None        # platform-specific rich metadata (tagged by `type`)
    match_score: Optional[int] = None
    match_reason: Optional[str] = None
