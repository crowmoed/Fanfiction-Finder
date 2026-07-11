"""Hard content block: sexual content involving minors must never surface.

Applied at three layers (defense in depth):
  1. Search time — `db/postgres.py:_search_rrf` drops blocked rows before they
     become candidates. Authoritative gate: covers everything already in the
     index, including rows re-introduced by the devtool's raw INSERTs.
  2. Index time — `indexer.py` drops blocked fics after scraping, before
     embedding (saves the embedding call too).
  3. Upsert time — `db/postgres.py:upsert_fic` refuses blocked fics as a
     backstop for any other write path.

The scalpel: this targets sexual content involving minors — the AO3 "Underage"
archive warning (renamed "Underage Sex"), loli/shota tags, CSA/CSAM tags,
adult/minor pairing tags, and the same signals in FFN/Wattpad summaries (those
platforms have no warning taxonomy). It deliberately does NOT block non-sexual
child abuse / neglect / trauma-recovery themes ("Child Abuse", "Child Neglect",
"Childhood Trauma"), innocent underage-X tags ("Underage Drinking", "Underage
Magic"), "minor" meaning slight/side ("Minor Character Death", "Minor Sexual
Content"), adult kink ("Daddy Kink", "Age Play"), or lookalike words
("Shotaro", "Lolita Fashion", "Torpedo", "Undercover Agent").

Core rule learned from scanning the live index: TAGS ARE DECLARATIVE, PROSE IS
DISCURSIVE. A tag "Pedophilia" declares content; a summary saying "dodge a
pedophile snake" is an Orochimaru joke, "That would be pedophilia. Ew." is a
disclaimer, and Spanish "en pedo" means drunk. So:
  - Tag rules are strict, and any unrecognized "Underage <x>" tag defaults to
    BLOCKED (allowlist covers the innocent activities).
  - Prose rules require context: pedo/CSA-family terms only count inside a
    warning declaration ("WARNINGS: Pedophilia", "TW:", "mentions of ...");
    "underage" only counts paired with a sexual/content noun, inside a warning
    declaration, or right after a sex word — and reader age-gates ("if you
    are underage, do not read", "underage DNI") are exempt.
  - Negation exempts ("No Underage Sex", "is not a pedophile", "I do NOT
    write underage sex") — those assert absence.
  - "shota" is exempt when the string names the MHA character or another real
    Shota ("Aizawa", "My Hero Academia", "Imanaga" — the single biggest
    false-positive source found in the live index).
  - Bare "loli" in prose is exempt when followed by a verb/adverb, which is
    the fused "lol i"/"lol I" typo ("discord loli may start accepting...").

Evasion hardening (red-team verified): split spellings ("under-age sex"),
underscore/hashtag fusions ("#underagesex", "Underage_Sex", "#shotalolicon"),
"statutory rape" / "child rape", "adult x minor" ship notation, kid/children
porn variants, "below the age of consent".

Known deliberate calls (bias: over-block rather than under-block):
  - Referenced/implied CSA and underage tags ARE blocked ("Implied/Referenced
    Underage Sex", "Past Childhood Sexual Abuse") — never surface the topic.
  - "Underage Marriage" and "Underage Character" stay blocked (often co-tags
    on explicit content); "Underage Dating"/"Runaway"/"Magic" are allowed.
  - "Under 18"/"U18" are NOT matched — dominated by reader age-gate
    disclaimers on adult fics. "Minor Rape"/"Minor Sexual Content" are NOT
    matched — "minor" there means "slight". Bare "Lolita" is NOT blocked
    (street fashion); "Loli"/"Lolicon" are. "Grooming" alone is NOT blocked.

Only stdlib imports here — keep this module dependency-free so tests and every
entry point (api, indexer, scripts) can use it without side effects.
"""

import json
import re
from typing import Any, Iterable, Optional

# ── Unconditional patterns — unambiguous anywhere (tags AND prose) ───────────
# The -con pattern has no leading \b so fused hashtags ("#shotalolicon") hit.
_HARD_PATTERNS = [
    r"(?:shota|loli|toddler|baby)cons?\b",
    r"\bcsam\b",
    r"\bcsem\b",
    r"\bjailbait\b",
    r"\b(?:hebe|ephebo)phil\w*",
]
_HARD_RE = re.compile("|".join(_HARD_PATTERNS), re.IGNORECASE)

# ── Tag/warning-only patterns — declarative there, too noisy for prose ───────
# NOTE: "minor sexual abuse/content" is deliberately absent — as a tag prefix,
# "minor" means "slight" ("Minor Sexual Content" = adult fic, brief content).
_MINOR_WORDS = r"(?:child(?:ren)?|minors?|kids?)"
_TAG_ONLY_PATTERNS = [
    r"\bcsa\b",
    r"\b(?:child(?:hood)?|kid)s?[\s\-_]+sexual[\s\-_]+(?:abuse|assault)\b",
    r"\bsexual[\s\-_]+(?:abuse|assault)[\s\-_]+of[\s\-_]+(?:a[\s\-_]+)?" + _MINOR_WORDS + r"\b",
    r"\bsex\w*[\s\-_]+(?:\w+[\s\-_]+)?with[\s\-_]+(?:a[\s\-_]+)?" + _MINOR_WORDS + r"\b",
    r"\bchild(?:hood)?[\s\-_]*molest\w*",
    r"\bmolest\w*[\s\-_]+(?:of[\s\-_]+)?(?:a[\s\-_]+|the[\s\-_]+)?" + _MINOR_WORDS + r"\b",
    r"\badult[\s\-_]*(?:/|x|×)[\s\-_]*(?:minors?|teen\w*|child(?:ren)?|kids?)\b",
    r"\b(?:minors?|teens?|teenagers?|child(?:ren)?|kids?)[\s\-_]*(?:/|x|×)[\s\-_]*adult",
    r"\b(?:child(?:ren)?|kids?|kiddie|toddlers?|bab(?:y|ies))[\s\-_]*porn\w*",
    r"\bstatutory[\s\-_]+rape\b",
    r"\b(?:child(?:ren)?|kids?)[\s\-_]+rape\b",
    r"\brap(?:e|ed|ing)[\s\-_]+(?:of[\s\-_]+)?(?:a[\s\-_]+|the[\s\-_]+)?" + _MINOR_WORDS + r"\b",
    r"\b(?:under|below)[\s\-_]+(?:the[\s\-_]+)?age[\s\-_]+of[\s\-_]+consent\b",
    r"\blolis?\b",
    r"\bsexuali[sz]\w*[\s\-_]+(?:of[\s\-_]+)?(?:minors?|children|kids?|a[\s\-_]+child)\b",
    r"\b(?:child(?:hood)?|kid)s?[\s\-_]*sexuali[sz]\w*",
]
_TAG_ONLY_RE = re.compile("|".join(_TAG_ONLY_PATTERNS), re.IGNORECASE)

# Pedo-family — blocked in tags unless negated ("mori ougai is not a pedophile
# (bungou stray dogs)" is a real joke tag in the index). Prose is warn-gated.
_PEDO_RE = re.compile(r"\bp(?:a)?edo\b|\bp(?:a)?edophil\w*", re.IGNORECASE)

# ── "shota" — blocked unless the string names a real/canon Shota ─────────────
_SHOTA_RE = re.compile(r"\bshotas?\b", re.IGNORECASE)
_SHOTA_EXEMPT_RE = re.compile(
    r"aizawa|eraserhead|dadzawa|imanaga|my hero academia|boku no hero"
    r"|\bbnha\b|\bmha\b|class 1-?a|ua high",
    re.IGNORECASE,
)

# ── "underage" rules ─────────────────────────────────────────────────────────
# Loose token: catches "underage", "underaged", "under age", "under-age".
_UNDERAGE_TOKEN = r"\bunder[\s\-–—_]*aged?\b"
_UNDERAGE_RE = re.compile(
    _UNDERAGE_TOKEN + r"[\s\-–—:,.?!&+/']*([a-z']+)?", re.IGNORECASE
)
# Fused forms have no word boundary ("underagesex", "UnderageSex") — pair the
# token directly with a sexual/content noun instead.
_UNDERAGE_PAIR_RE = re.compile(
    r"\bunder[\s\-–—_]*aged?[\s\-–—_:,.]*"
    r"(?:sex\w*|smut|rape|porn\w*|lemon|lime|noncon|non[\s\-_]?con|incest"
    r"|kink\w*|love|romance|relationship\w*|content|themes?)",
    re.IGNORECASE,
)
# Innocent "Underage <activity>" tags — the escapes from the default-deny rule.
_UNDERAGE_ALLOWED_NEXT = {
    "drinking", "drinker", "drinkers", "drink", "drinks",
    "smoking", "smoker", "smokers", "vaping",
    "alcohol", "alcoholism",
    "drug", "drugs", "substance", "substances",
    "gambling", "driving", "driver", "drivers",
    "kissing", "dating",
    "runaway", "runaways",
    "magic", "wizardry", "wandless", "apparition", "sorcery",
    "tattoo", "tattoos", "tattooing",
}
# Followers that read as negation or as a reader age-gate, not content:
# "Underage? No.", "if you are underage, do not read", "underage DNI".
_UNDERAGE_GATE_NEXT = {
    "no", "not", "never",
    "reader", "readers", "viewer", "viewers", "audience", "audiences",
    "people", "folks", "followers", "dni", "don't", "dont", "do", "please",
}
# Prose: nouns that make a bare "underage" mention content-declaring.
_UNDERAGE_SEX_NOUNS = {
    "sex", "sexual", "smut", "rape", "porn", "lemon", "lime", "noncon",
    "incest", "kink", "kinky", "love", "romance", "relationship",
    "relationships", "content", "theme", "themes", "couple", "pairing",
    "ship", "shipping", "stuff", "elements", "prostitution", "nudity",
    "fic", "fics",
}
# Prose: a sex word right before "underage" also declares content
# ("Full smut, underage, both are only twelve").
_SEX_BEFORE_RE = re.compile(
    r"\bsmut\b|\bsex\w*|\bporn\w*|\bexplicit\b|\blemon\b|\bnoncon\b|\bnsfw\b|\bpwp\b",
    re.IGNORECASE,
)

# ── Prose warning-declaration gate ───────────────────────────────────────────
# Pedo/CSA-family terms in prose count only inside a warning declaration —
# discursive mentions (villain jokes, disclaimers, Spanish "en pedo" = drunk)
# must not block.
_WARN_TERMS_RE = re.compile(
    "|".join([
        r"\bp(?:a)?edo\b",
        r"\bp(?:a)?edophil\w*",
        r"\bcsa\b",
        r"\b(?:child(?:ren)?|kids?|kiddie|toddlers?|bab(?:y|ies))[\s\-_]*porn\w*",
        r"\bsexuali[sz]\w*[\s\-_]+(?:of[\s\-_]+)?(?:minors?|children|kids?|a[\s\-_]+child)\b",
        r"\b(?:child(?:hood)?|kid)s?[\s\-_]+sexual[\s\-_]+(?:abuse|assault)\b",
        r"\bsexual[\s\-_]+(?:abuse|assault)[\s\-_]+of[\s\-_]+(?:a[\s\-_]+)?" + _MINOR_WORDS + r"\b",
        r"\bsex\w*[\s\-_]+(?:\w+[\s\-_]+)?with[\s\-_]+(?:a[\s\-_]+)?" + _MINOR_WORDS + r"\b",
        r"\bmolest\w*[\s\-_]+(?:of[\s\-_]+)?(?:a[\s\-_]+|the[\s\-_]+)?" + _MINOR_WORDS + r"\b",
        r"\bchild(?:hood)?[\s\-_]*molest\w*",
        r"\bstatutory[\s\-_]+rape\b",
        r"\b(?:child(?:ren)?|kids?)[\s\-_]+rape\b",
        r"\b(?:under|below)[\s\-_]+(?:the[\s\-_]+)?age[\s\-_]+of[\s\-_]+consent\b",
    ]),
    re.IGNORECASE,
)
_WARN_CONTEXT_RE = re.compile(
    r"\bwarnings?\b|\btw\b|\bcw\b|\btrigger\b|\bcontains?\b|\bmentions?\b"
    r"|\bthemes?\b|\bincludes?\b|\bdepict\w*|\brated\b",
    re.IGNORECASE,
)

_NEGATION_RE = re.compile(
    r"\bno\b|\bnot\b|\bnever\b|\bwithout\b|n[’']?t\b|\bdont\b|\bwont\b",
    re.IGNORECASE,
)

# Bare "loli " followed by one of these reads as a fused "lol i" typo
# ("...for you lolI hope you like it", "discord loli may start accepting...").
_LOLI_TEXT_RE = re.compile(r"\b(lolis?)\b(?:\s+([a-zA-Z’']+))?", re.IGNORECASE)
_LOL_I_FOLLOWERS = {
    "hope", "hoped", "think", "thought", "guess", "know", "knew", "love",
    "loved", "hate", "may", "might", "will", "would", "was", "am", "im",
    "just", "really", "also", "swear", "tried", "try", "want", "wanna",
    "need", "gotta", "have", "had", "feel", "felt", "mean", "meant", "cant",
    "cannot", "dont", "didnt", "wont", "should", "could", "gonna", "did",
    "do", "promise", "wish", "actually", "literally", "honestly", "never",
    "only", "still", "even", "already", "made", "forgot", "remember",
}


def _normalize(s: str) -> str:
    """Underscores and hashes defeat \\b anchors — turn them into spaces so
    "Underage_Sex" and Wattpad-style "#underagesex" match like normal text."""
    return s.replace("_", " ").replace("#", " ")


def _negated_before(text: str, start: int) -> bool:
    """True if a negation word sits within the 3 tokens before `start`."""
    preceding = re.findall(r"\S+", text[:start])[-3:]
    return bool(preceding) and bool(_NEGATION_RE.search(" ".join(preceding)))


def _warn_context_before(text: str, start: int) -> bool:
    return bool(_WARN_CONTEXT_RE.search(text[max(0, start - 80):start]))


def _sex_term_before(text: str, start: int) -> bool:
    preceding = re.findall(r"\S+", text[:start])[-3:]
    return bool(preceding) and bool(_SEX_BEFORE_RE.search(" ".join(preceding)))


def _shota_hit(s: str) -> bool:
    return bool(_SHOTA_RE.search(s)) and not _SHOTA_EXEMPT_RE.search(s)


def _underage_pair_hit(s: str) -> bool:
    return any(
        not _negated_before(s, m.start()) for m in _UNDERAGE_PAIR_RE.finditer(s)
    )


def _pedo_tag_hit(tag: str) -> bool:
    return any(
        not _negated_before(tag, m.start()) for m in _PEDO_RE.finditer(tag)
    )


def _tag_blocked(tag: str) -> bool:
    tag = _normalize(tag)
    if _HARD_RE.search(tag) or _TAG_ONLY_RE.search(tag):
        return True
    if _pedo_tag_hit(tag) or _shota_hit(tag) or _underage_pair_hit(tag):
        return True
    # Default-deny: any other "Underage <x>" tag is blocked unless the next
    # word is an innocent activity, a negation, or the mention is negated.
    for m in _UNDERAGE_RE.finditer(tag):
        if _negated_before(tag, m.start()):
            continue
        following = (m.group(1) or "").lower()
        if following in _UNDERAGE_ALLOWED_NEXT or following in _UNDERAGE_GATE_NEXT:
            continue
        return True
    return False


def _text_blocked(text: str) -> bool:
    text = _normalize(text)
    if _HARD_RE.search(text):
        return True
    if _shota_hit(text):
        return True
    for m in _LOLI_TEXT_RE.finditer(text):
        word, following = m.group(1).lower(), (m.group(2) or "").lower()
        if word == "loli" and following in _LOL_I_FOLLOWERS:
            continue  # fused "lol i" typo
        return True
    for m in _WARN_TERMS_RE.finditer(text):
        if _warn_context_before(text, m.start()):
            return True
    if _underage_pair_hit(text):
        return True
    # Bare "underage" in prose: content-declaring only with a sexual/content
    # noun after it, a warning declaration before it, or a sex word before it.
    for m in _UNDERAGE_RE.finditer(text):
        if _negated_before(text, m.start()):
            continue
        following = (m.group(1) or "").lower()
        if following in _UNDERAGE_ALLOWED_NEXT or following in _UNDERAGE_GATE_NEXT:
            continue
        if following in _UNDERAGE_SEX_NOUNS:
            return True
        if _warn_context_before(text, m.start()) or _sex_term_before(text, m.start()):
            return True
    return False


def _meta_warnings(meta: Any) -> list[str]:
    """Pull the warnings list out of a meta blob — JSONB dict from the DB,
    AO3Meta pydantic model at index time, a JSON string from the local
    parquet store, or None."""
    if meta is None:
        return []
    if isinstance(meta, str):
        try:
            meta = json.loads(meta)
        except (ValueError, TypeError):
            return []
    if isinstance(meta, dict):
        warnings = meta.get("warnings")
    else:
        warnings = getattr(meta, "warnings", None)
    return [w for w in (warnings or []) if isinstance(w, str)]


def is_blocked(
    tags: Optional[Iterable[str]] = None,
    warnings: Optional[Iterable[str]] = None,
    title: Optional[str] = None,
    summary: Optional[str] = None,
    meta: Any = None,
) -> bool:
    """True if this fic must never be stored or surfaced."""
    for tag in list(tags or []) + list(warnings or []) + _meta_warnings(meta):
        if isinstance(tag, str) and _tag_blocked(tag):
            return True
    text = " ".join(t for t in (title, summary) if t)
    if text and _text_blocked(text):
        return True
    return False


def fic_is_blocked(fic: Any) -> bool:
    """`is_blocked` for anything Fic-shaped (pydantic Fic, SQL row, namespace)."""
    return is_blocked(
        tags=getattr(fic, "tags", None),
        title=getattr(fic, "title", None),
        summary=getattr(fic, "summary", None),
        meta=getattr(fic, "meta", None),
    )


def filter_fics(fics: list) -> list:
    """Return only the fics that pass the block filter (order preserved)."""
    return [f for f in fics if not fic_is_blocked(f)]
