"""
Scraping progress checkpoint.

Tracks which (fandom, source) pairs are done and where to resume
partially-finished ones. Written atomically after every page so a
crash loses at most one page of work.

Schema:
    {
      "fandoms": {
        "Harry Potter": {
          "ao3":     {"done": false, "min_words": 20000, "page": 7},
          "ffn":     {"done": false, "word_len": 10, "page": 3},
          "wattpad": {"done": true}
        }
      }
    }

AO3's page numbers are only meaningful relative to a specific min_words
filter (page 7 at min_words=5000 points at different fics than page 7
at min_words=20000). `get_resume_point` takes the current `min_words`
and returns {} if the saved checkpoint was for a different threshold —
i.e. a changed filter forces a fresh scrape for that source. FFN doesn't
honor min_words in its URL (it only supports the coarse word_len buckets
10/20), so FFN checkpoints aren't keyed by min_words.
"""

import json
import os
import tempfile
import time
from typing import Any

PROGRESS_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "scrape_progress.json")
_LOCK_PATH = PROGRESS_PATH + ".lock"
_LOCK_STALE_SECONDS = 300

SOURCES = ("ao3", "ffn", "wattpad")


class _ProgressLock:
    """Cross-process lock for progress mutations.

    The atomic _save() handles single-writer torn-write protection, but
    mark_progress / reset / mark_done are read-modify-write — two scrapers
    can otherwise clobber each other's checkpoints. This serializes them.
    """

    def __init__(self):
        self.acquired = False

    def __enter__(self):
        os.makedirs(os.path.dirname(_LOCK_PATH), exist_ok=True)
        deadline = time.monotonic() + 30
        while True:
            try:
                fd = os.open(_LOCK_PATH, os.O_CREAT | os.O_EXCL | os.O_WRONLY)
                os.write(fd, str(os.getpid()).encode())
                os.close(fd)
                self.acquired = True
                return self
            except FileExistsError:
                try:
                    age = time.time() - os.stat(_LOCK_PATH).st_mtime
                    if age > _LOCK_STALE_SECONDS:
                        try:
                            os.remove(_LOCK_PATH)
                        except OSError:
                            pass
                        continue
                except FileNotFoundError:
                    continue
                if time.monotonic() > deadline:
                    raise TimeoutError(f"Could not acquire {_LOCK_PATH}")
                time.sleep(0.1)

    def __exit__(self, exc_type, exc, tb):
        if self.acquired:
            try:
                os.remove(_LOCK_PATH)
            except OSError:
                pass


def _empty() -> dict:
    return {"fandoms": {}}


def load() -> dict:
    if not os.path.exists(PROGRESS_PATH):
        return _empty()
    try:
        with open(PROGRESS_PATH, "r", encoding="utf-8") as f:
            data = json.load(f)
        if "fandoms" not in data:
            return _empty()
        return data
    except (json.JSONDecodeError, OSError):
        return _empty()


def _save(data: dict) -> None:
    dirpath = os.path.dirname(PROGRESS_PATH)
    os.makedirs(dirpath, exist_ok=True)
    fd, tmp = tempfile.mkstemp(dir=dirpath, prefix=".progress_", suffix=".tmp")
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2)
        os.replace(tmp, PROGRESS_PATH)
    except Exception:
        if os.path.exists(tmp):
            os.remove(tmp)
        raise


def _entry(data: dict, fandom: str, source: str) -> dict:
    fandoms = data.setdefault("fandoms", {})
    fandom_entry = fandoms.setdefault(fandom, {})
    return fandom_entry.setdefault(source, {"done": False})


def is_done(fandom: str, source: str) -> bool:
    data = load()
    return bool(data.get("fandoms", {}).get(fandom, {}).get(source, {}).get("done", False))


def get_resume_point(fandom: str, source: str, min_words: int | None = None) -> dict:
    """Return the stored resume state for (fandom, source), or {} if none.

    If `min_words` is provided and the saved checkpoint was taken under a
    different `min_words` filter, the checkpoint is considered stale and
    {} is returned — resuming at the wrong page under a different filter
    would skip or duplicate fics. Callers that pass `min_words` should
    also pass it to `mark_progress` so future resumes stay consistent.
    """
    data = load()
    entry = data.get("fandoms", {}).get(fandom, {}).get(source)
    if not entry or entry.get("done"):
        return {}
    if min_words is not None:
        saved = entry.get("min_words")
        if saved is not None and saved != min_words:
            return {}
    return {k: v for k, v in entry.items() if k != "done"}


def mark_progress(fandom: str, source: str, **state: Any) -> None:
    """Record in-progress state for (fandom, source). Clears done flag."""
    with _ProgressLock():
        data = load()
        entry = _entry(data, fandom, source)
        entry.clear()
        entry["done"] = False
        entry.update(state)
        _save(data)


def mark_done(fandom: str, source: str) -> None:
    with _ProgressLock():
        data = load()
        entry = _entry(data, fandom, source)
        entry["done"] = True
        _save(data)


def reset(fandom: str | None = None, source: str | None = None) -> None:
    """
    Wipe checkpoint state.
      reset()                      → wipe everything
      reset(fandom="X")            → wipe all sources for fandom X
      reset(fandom="X", source="ao3") → wipe just (X, ao3)
      reset(source="ao3")          → wipe source across all fandoms
    """
    with _ProgressLock():
        if fandom is None and source is None:
            if os.path.exists(PROGRESS_PATH):
                os.remove(PROGRESS_PATH)
            return

        data = load()
        fandoms = data.get("fandoms", {})

        if fandom is not None and source is not None:
            if fandom in fandoms and source in fandoms[fandom]:
                del fandoms[fandom][source]
                if not fandoms[fandom]:
                    del fandoms[fandom]
        elif fandom is not None:
            fandoms.pop(fandom, None)
        elif source is not None:
            for fname in list(fandoms.keys()):
                fandoms[fname].pop(source, None)
                if not fandoms[fname]:
                    del fandoms[fname]

        _save(data)
