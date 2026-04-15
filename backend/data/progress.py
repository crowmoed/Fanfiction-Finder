"""
Scraping progress checkpoint.

Tracks which (fandom, source) pairs are done and where to resume
partially-finished ones. Written atomically after every page so a
crash loses at most one page of work.

Schema:
    {
      "fandoms": {
        "Harry Potter": {
          "ao3":     {"done": false, "page": 7},
          "ffn":     {"done": false, "word_len": 10, "page": 3},
          "wattpad": {"done": true}
        }
      }
    }
"""

import json
import os
import tempfile
from typing import Any

PROGRESS_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "scrape_progress.json")

SOURCES = ("ao3", "ffn", "wattpad")


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


def get_resume_point(fandom: str, source: str) -> dict:
    """Return the stored resume state for (fandom, source), or {} if none."""
    data = load()
    entry = data.get("fandoms", {}).get(fandom, {}).get(source)
    if not entry or entry.get("done"):
        return {}
    return {k: v for k, v in entry.items() if k != "done"}


def mark_progress(fandom: str, source: str, **state: Any) -> None:
    """Record in-progress state for (fandom, source). Clears done flag."""
    data = load()
    entry = _entry(data, fandom, source)
    entry.clear()
    entry["done"] = False
    entry.update(state)
    _save(data)


def mark_done(fandom: str, source: str) -> None:
    data = load()
    entry = _entry(data, fandom, source)
    entry.clear()
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
