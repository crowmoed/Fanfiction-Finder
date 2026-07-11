"""Tests for content_filter — hard block on sexual content involving minors.

The scalpel: fics depicting/centering sexual content with minors (AO3 "Underage"
archive warning, loli/shota, CSA tags, etc.) must NEVER surface in search. But
child-ABUSE / neglect / trauma-recovery fics (hitting, neglect — non-sexual) are
legitimate hurt/comfort themes and must NOT be caught.
"""

import types

import pytest

from content_filter import is_blocked, filter_fics


# ── Tag-level: must be BLOCKED ────────────────────────────────────────────────

BLOCKED_TAG_CASES = [
    # AO3 archive warning (pre-2024 name and current name)
    ["Underage"],
    ["Underage Sex"],
    # AO3 blurb puts warnings in the flat tag list alongside everything else
    ["Fluff", "Slow Burn", "Underage"],
    ["Creator Chose Not To Use Archive Warnings", "Underage Sex", "Angst"],
    # underage freeform variants
    ["Underage - Freeform"],
    ["Underage Rape/Non-Con"],
    ["Underage Prostitution"],
    ["Implied Underage"],
    ["Referenced Underage"],
    ["Underage Kink"],
    ["underage sex"],  # case-insensitive
    ["Underage Drinking", "Underage Sex"],  # innocent + guilty in same list
    # loli / shota family
    ["Shota"],
    ["Shotacon"],
    ["Loli"],
    ["Lolicon"],
    ["Toddlercon"],
    # pedophilia family
    ["Pedophilia"],
    ["Paedophilia"],
    ["Pedophile Character"],
    ["Hebephilia"],
    ["Ephebophilia"],
    # CSA cluster — including referenced variants (deliberate: never surface)
    ["Child Sexual Abuse"],
    ["Childhood Sexual Abuse"],
    ["Past Childhood Sexual Abuse"],
    ["Implied/Referenced Child Sexual Abuse"],
    ["CSA"],
    ["Implied/Referenced Csa"],
    ["CSEM"],
    ["CSAM"],
    ["Sexual Abuse of a Child"],
    ["Sexual Assault of a Minor"],
    ["Child Molestation"],
    ["Molestation of a Child"],
    ["Sex With A Minor"],
    # adult/minor pairing tags
    ["Adult/Minor Relationship"],
    ["Minor/Adult Relationship"],
    ["Adult/Teen Relationship"],
    # misc sexualization-of-minors
    ["Jailbait"],
    ["Sexualization of Minors"],
    ["Sexualised Children"],
    ["Child Pornography"],
    ["Kiddie Porn"],
    # real trigger tags from the live-index scan — must stay blocked
    ["Consensual Underage Sex"],
    ["Implied/Referenced Underage Sex"],
    ["Implied/Referenced Underage Prostitution"],
    ["Underage Sex - Freeform"],
    ["Past Underage Sex"],
    ["Non-Consensual Underage Sex"],  # "non" must NOT read as negation
    # red-team: split spellings and fused/hashtag forms
    ["Under Age"],
    ["Under-Age"],
    ["Under Age Sex"],
    ["Under-age Relationship"],
    ["Underage_Sex"],
    ["#underagesex"],
    ["UnderageSex"],
    ["#shotalolicon"],
    ["Toddlercons"],
    # red-team: phrasings with no pattern before
    ["Statutory Rape"],
    ["Child Rape"],
    ["Raping a Minor"],
    ["Kid Porn"],
    ["Children Porn"],
    ["child-porn"],
    ["Below Age of Consent"],
    ["Under the Age of Consent"],
    ["Child Sexualization"],
    ["Molested A Child"],
    ["Sexual Relationship With A Minor"],
    # red-team: adult/minor ship notation variants
    ["Adult/Child Relationship"],
    ["Adult x Minor"],
    ["Minor x Adult"],
    ["AdultxMinor"],
    ["Child/Adult"],
    # deliberate conservative calls — stay blocked
    ["Underage Marriage"],
    ["Underage Character"],
]


@pytest.mark.parametrize("tags", BLOCKED_TAG_CASES)
def test_blocked_tags(tags):
    assert is_blocked(tags=tags), f"should be BLOCKED: {tags}"


# ── Tag-level: must be ALLOWED (the scalpel) ─────────────────────────────────

ALLOWED_TAG_CASES = [
    # child abuse / neglect / trauma — non-sexual, explicitly kept
    ["Child Abuse"],
    ["Past Child Abuse"],
    ["Implied/Referenced Child Abuse"],
    ["Child Neglect"],
    ["Childhood Trauma"],
    ["Abusive Parents"],
    ["Hurt/Comfort", "Child Neglect", "Found Family"],
    ["Child Death"],  # tragic, not sexual
    ["Kid Fic"],       # raising-kids trope
    ["Parenthood"],
    # innocent underage-X tags
    ["Underage Drinking"],
    ["Underage Smoking"],
    ["Underage Drinking and Smoking"],
    ["Underage Drug Use"],
    ["Underage Alcohol Use"],
    ["Underage Gambling"],
    ["Underage Driving"],
    ["Underage Kissing"],
    # "minor" meaning "slight" or "side character"
    ["Minor Character Death"],
    ["Minor Sexual Content"],       # = brief sexual content (adult fic)
    ["Minor Sexual Harassment"],
    ["Minor Violence"],
    # adult dynamics / kink between adults
    ["Age Difference"],
    ["Age Gap"],
    ["Daddy Kink"],
    ["Age Play"],
    ["Age Regression/De-Aging"],    # innocent trope
    ["Teacher-Student Relationship"],  # commonly university-age
    ["Sexual Abuse"],               # unqualified — adult-possible
    ["Past Sexual Abuse"],
    ["Rape/Non-Con"],               # adult non-con warning — not in scope
    # word-boundary traps
    ["Hidari Shotarou"],            # Kamen Rider character
    ["Shotaro Ishinomori"],
    ["Lolita Fashion"],             # Japanese street fashion
    ["Gothic Lolita"],
    ["Cubchoo"],                    # 'cub' substring trap
    ["Encyclopedia"],               # 'pedia' ≠ pedo
    ["Pedro Pascal"],               # 'pedo' must be word-bounded... 'pedro' isn't pedo
    ["Torpedo"],
    # plain wholesome
    ["Fluff", "Slow Burn", "Enemies to Lovers"],
    ["First Kiss", "Teen Romance", "High School"],
    [],
    # real false positives found in the live-index scan
    ["Aizawa Shota"],                                # MHA character (Eraserhead)
    ["Shota Aizawa"],
    ["Aizawa Shota | Eraserhead/Yamada Hizashi | Present Mic"],
    ["Dadzawa - An Aizawa Shota Zine"],
    ["No Underage Sex"],                             # asserts absence (aged-up)
    ["No Underage"],
    ["Not Underage"],
    ["Underage Substance Use"],
    ["Underage Substance Abuse"],
    ["mori ougai is not a pedophile (bungou stray dogs)"],  # negated joke tag (live index)
    # red-team false positives: innocent underage-X tropes (HP etc.)
    ["Underage Magic"],
    ["Underage Wizardry"],
    ["Underage Wandless Magic"],
    ["Underage Apparition"],
    ["Underage Dating"],
    ["Underage Runaway"],
    # red-team false positives: negation phrasings
    ["Teacher/Student (Not Underage)"],
    ["No Underage Characters"],
    ["Both Characters Are Adults (Not Underage)"],
    ["Age Gap (Not Underage)"],
    ["Underage? No."],
    # red-team false positives: more Shotas (real people / disambiguation tags)
    ["Shota Imanaga"],
    ["Shota (My Hero Academia)"],
    # word-shape traps for the loosened under-age regex
    ["Under Appreciated"],
    ["Undercover Agent"],
]


@pytest.mark.parametrize("tags", ALLOWED_TAG_CASES)
def test_allowed_tags(tags):
    assert not is_blocked(tags=tags), f"should be ALLOWED: {tags}"


# ── Warnings (AO3 meta.warnings) ─────────────────────────────────────────────

def test_blocked_via_meta_warnings_dict():
    meta = {"type": "ao3", "warnings": ["Underage Sex"]}
    assert is_blocked(tags=["Fluff"], meta=meta)


def test_allowed_meta_warnings():
    meta = {"type": "ao3", "warnings": ["Graphic Depictions Of Violence"]}
    assert not is_blocked(tags=["Whump"], meta=meta)


def test_meta_none_and_malformed():
    assert not is_blocked(tags=["Fluff"], meta=None)
    assert not is_blocked(tags=["Fluff"], meta={"type": "ffn"})  # no warnings key
    assert not is_blocked(tags=None, meta=None)


# ── Text-level (title/summary) — FFN/Wattpad have no warning taxonomy ────────

BLOCKED_TEXT_CASES = [
    "A shota story about forbidden things.",
    "Classic lolicon content, you know what this is.",
    "WARNING: underage sex in later chapters.",
    "underage smut, don't like don't read",
    "Contains child porn themes.",
    "Rated M for underage lemon.",  # old FFN slang for explicit
    # real true positives from the live-index scan
    "Un beso puede desencadenar sentimientos. Yaoi, Shota, LuAce, leve AceSabo",
    "TW: Underage sex, miscarriage, attempted rape and forced bonding.",
    "WARNINGS: Pedophilia Rape MPreg. Rated: M - English - Romance",
    "Hisoka being a red flag (mentions of pedophilia) Murder! Gore!",
    "Warning! Pedo! Mature Content for Omakes!",
    "kawaii loli gals and fun galore in another dimension",
    # red-team: prose coverage the first version missed
    "Warning: under age content, proceed with caution.",
    "Contains explicit under-age smut, do not read if uncomfortable.",
    "TW: underage relationship ahead",
    "An Underage Love Story",
    "Warning: Underage.",
    "Full smut, underage, both are only twelve",
    "WARNINGS: statutory rape, violence, dark themes",
    "#underagesex #nsfw #dontlikedontread",
]

ALLOWED_TEXT_CASES = [
    "Two rival CEOs fall in love over espresso.",
    "After years of neglect and abuse, Harry finds a real family.",
    "There's underage drinking at the party, and someone makes a bad decision.",
    "The kids sneak out for a night of underage driving and regret.",
    "She loved lolita fashion and wore it everywhere.",
    "Shotaro joins the team and everything changes.",
    "A story about surviving childhood trauma and healing.",
    "An encyclopedia of magical creatures, annotated by two idiots in love.",
    # real false positives from the live-index scan
    "Born by dysfunctional parents, Shota Aizawa takes it upon himself to adopt kids.",
    "Aparecen en una ciudad dominada por héroes, donde Shota Aizawa es testigo.",
    "ripped straight form discord loli may start accepting requests too <3",       # "lol i" typo
    "if that sweetens the deal for you lolI hope you like it :)",                  # "lol I" typo
    "Please stop leaving comments about how pedophiliac it is. He is 19 in this book.",
    "get ready to dodge a pedophile snake and drag her dying brother home",        # villain joke
    "GETTING RID OF THE WEIRD THING. LUKE IS NOT A PEDO.",                         # disclaimer
    "tiene su gay awakening. a los 24 años. en una fiesta. en pedo. con armin.",   # Spanish: drunk
    "Also, not BakuDeku. That would be pedophilia. Ew.",                           # disclaimer
    "The only things I do NOT write are underage sex and rape/non-con.",           # negated
    "There will be no underage sex or something like that here.",                  # negated
    "due to the site's decision to allow literal child pornography, i'm boycotting the site",
    "I do not support any accusations of sexualizing minors, you must be 18+",     # disclaimer
    # reader age-gate disclaimers on adult fics — must NOT be blocked
    "Warning: if you are underage, do not read this.",
    "18+ only. No underage readers, please.",
    "NSFW blog: underage DNI",
    # discursive mentions, word-shape traps
    "the detective spent years investigating statutory rape charges downtown",
    "He went undercover as an agent at the academy.",
    "Shota Imanaga takes the mound in the crossover nobody asked for.",
]


@pytest.mark.parametrize("text", BLOCKED_TEXT_CASES)
def test_blocked_summary_text(text):
    assert is_blocked(tags=[], summary=text), f"should be BLOCKED: {text!r}"


@pytest.mark.parametrize("text", ALLOWED_TEXT_CASES)
def test_allowed_summary_text(text):
    assert not is_blocked(tags=[], summary=text), f"should be ALLOWED: {text!r}"


def test_blocked_title():
    assert is_blocked(tags=[], title="Shotacon Adventures")
    assert not is_blocked(tags=[], title="The Adventures of Shotaro")


# ── filter_fics: works on Fic-shaped objects (attrs) and dicts ───────────────

def _fic(title="A Fic", summary="", tags=None, meta=None):
    return types.SimpleNamespace(
        title=title, summary=summary, tags=tags or [], meta=meta
    )


def test_filter_fics_drops_blocked_keeps_allowed():
    good = _fic(title="Slow Burn", tags=["Fluff", "Child Neglect"])
    bad_tag = _fic(title="Nope", tags=["Underage Sex"])
    bad_warning = _fic(title="Nope2", tags=[], meta={"warnings": ["Underage"]})
    bad_text = _fic(title="Nope3", summary="pure lolicon", tags=[])

    kept = filter_fics([good, bad_tag, bad_warning, bad_text])
    assert kept == [good]


def test_filter_fics_empty_and_missing_fields():
    assert filter_fics([]) == []
    bare = types.SimpleNamespace(title=None, summary=None, tags=None, meta=None)
    assert filter_fics([bare]) == [bare]


# ── Search gate: _search_rrf must drop blocked rows before returning ─────────

def test_search_rrf_filters_blocked_rows(monkeypatch):
    import db.postgres as pg

    def row(id_, title, tags, meta=None, summary=""):
        return types.SimpleNamespace(
            id=id_, title=title, url=f"https://x/{id_}", platform="ao3",
            fandom="Naruto", summary=summary, tags=tags, word_count=50000,
            kudos=100, hits=1000, meta=meta, rrf_score=0.5,
        )

    rows = [
        row("a", "Good Fic", ["Fluff", "Child Neglect"]),
        row("b", "Bad Fic", ["Underage Sex"]),
        row("c", "Bad Warning Fic", ["Angst"], meta={"type": "ao3", "warnings": ["Underage"]}),
        row("d", "Another Good Fic", ["Hurt/Comfort"]),
    ]

    class FakeResult:
        def all(self):
            return rows

    class FakeConn:
        def execute(self, *a, **k):
            return FakeResult()

        def __enter__(self):
            return self

        def __exit__(self, *a):
            return False

    monkeypatch.setattr(pg.engine, "connect", lambda: FakeConn())

    fics = pg.search_rrf(embeddings=[[0.0] * pg.EMBEDDING_DIMS], fandom="Naruto")
    titles = [f.title for f in fics]
    assert titles == ["Good Fic", "Another Good Fic"]
