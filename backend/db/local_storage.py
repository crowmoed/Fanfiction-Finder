"""
Local-first fic storage using parquet + numpy files.

Saves scraped fics to local parquet/npy files (same format as fanfic-swap).
Falls back to Neon DB if local storage fails.
"""

import datetime
import json
import os
import sys
from pathlib import Path
from typing import Optional

import numpy as np
import polars as pl

# Resolve paths
FANFIC_SWAP_DIR = Path(__file__).parent.parent.parent / "fanfic-swap"
FANDOMS_DIR = FANFIC_SWAP_DIR / "fandoms"
EMBEDDING_DIMS = 768


def slugify(fandom: str) -> str:
    return fandom.lower().replace(" ", "_").replace("/", "_").replace(".", "")


def fandom_dir(fandom: str) -> Path:
    return FANDOMS_DIR / slugify(fandom)


def _load_existing(fandom: str) -> tuple[Optional[pl.DataFrame], Optional[np.ndarray]]:
    """Load existing parquet + embeddings for a fandom, or return (None, None)."""
    d = fandom_dir(fandom)
    parquet_path = d / "fics.parquet"
    npy_path = d / "embeddings.npy"

    if parquet_path.exists() and npy_path.exists():
        try:
            df = pl.read_parquet(parquet_path)
            embs = np.load(npy_path)
            return df, embs
        except Exception:
            return None, None
    return None, None


def _save(fandom: str, df: pl.DataFrame, embs: np.ndarray):
    """Save parquet + embeddings + meta for a fandom."""
    d = fandom_dir(fandom)
    d.mkdir(parents=True, exist_ok=True)

    parquet_path = d / "fics.parquet"
    npy_path = d / "embeddings.npy"

    df.write_parquet(parquet_path)
    np.save(npy_path, embs)

    # Update meta.json
    meta = {
        "fandom_name": fandom,
        "slug": slugify(fandom),
        "fic_count": len(df),
        "embedding_dims": EMBEDDING_DIMS,
        "exported_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "parquet_size_mb": round(parquet_path.stat().st_size / 1024 / 1024, 2),
        "npy_size_mb": round(npy_path.stat().st_size / 1024 / 1024, 2),
        "word_count_range": {
            "min": int(df["word_count"].min()) if df["word_count"].min() is not None else 0,
            "max": int(df["word_count"].max()) if df["word_count"].max() is not None else 0,
            "median": int(df["word_count"].median()) if df["word_count"].median() is not None else 0,
        },
    }
    meta_path = d / "meta.json"
    meta_path.write_text(json.dumps(meta, indent=2, default=str))


def upsert_fic_local(fic, fandom: str, embedding: list[float]) -> bool:
    """
    Insert or update a fic in local parquet/npy storage.

    Returns True on success, False on failure.
    """
    try:
        from data.schema import Fic

        fic_id = f"{fic.platform}:{fic.url}"

        # Load existing data
        existing_df, existing_embs = _load_existing(fandom)

        # Build new row
        new_row = {
            "id": fic_id,
            "title": fic.title,
            "url": fic.url,
            "platform": fic.platform,
            "summary": fic.summary,
            "tags": ", ".join(fic.tags) if fic.tags else None,
            "word_count": fic.word_count,
            "kudos": fic.kudos,
            "hits": fic.hits,
            "fandom": fandom,
            "indexed_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        }
        new_emb = np.array(embedding, dtype=np.float32)

        if existing_df is not None and existing_embs is not None:
            # Check if fic already exists — update it
            mask = existing_df["id"] == fic_id
            if mask.any():
                # Remove old row
                keep_mask = ~mask
                existing_df = existing_df.filter(keep_mask)
                existing_embs = existing_embs[keep_mask.to_numpy()]

            # Append new row
            new_df = pl.DataFrame([new_row], schema=existing_df.schema)
            combined_df = pl.concat([existing_df, new_df])
            combined_embs = np.vstack([existing_embs, new_emb.reshape(1, -1)])
        else:
            # First fic for this fandom
            combined_df = pl.DataFrame([new_row])
            combined_embs = new_emb.reshape(1, -1)

        _save(fandom, combined_df, combined_embs)
        return True

    except Exception as e:
        print(f"  [local] Failed to save '{fic.title}': {e}")
        return False


def upsert_fics_batch_local(fics, fandom: str, embeddings: list[list[float]]) -> tuple[int, int]:
    """
    Batch upsert fics to local storage. Much more efficient than one-at-a-time
    since it only reads/writes the parquet+npy once per batch.

    Returns (success_count, fail_count).
    """
    try:
        fic_ids = [f"{fic.platform}:{fic.url}" for fic in fics]

        # Load existing data
        existing_df, existing_embs = _load_existing(fandom)

        # Build new rows
        now = datetime.datetime.now(datetime.timezone.utc).isoformat()
        new_rows = []
        new_embs = []
        for fic, embedding in zip(fics, embeddings):
            new_rows.append({
                "id": f"{fic.platform}:{fic.url}",
                "title": fic.title,
                "url": fic.url,
                "platform": fic.platform,
                "summary": fic.summary,
                "tags": ", ".join(fic.tags) if fic.tags else None,
                "word_count": fic.word_count,
                "kudos": fic.kudos,
                "hits": fic.hits,
                "fandom": fandom,
                "indexed_at": now,
            })
            new_embs.append(np.array(embedding, dtype=np.float32))

        new_embs_arr = np.stack(new_embs)

        if existing_df is not None and existing_embs is not None:
            # Remove any existing rows with same IDs (for upsert)
            keep_mask = ~existing_df["id"].is_in(fic_ids)
            existing_df = existing_df.filter(keep_mask)
            existing_embs = existing_embs[keep_mask.to_numpy()]

            # Append new rows
            new_df = pl.DataFrame(new_rows, schema=existing_df.schema)
            combined_df = pl.concat([existing_df, new_df])
            combined_embs = np.vstack([existing_embs, new_embs_arr])
        else:
            combined_df = pl.DataFrame(new_rows)
            combined_embs = new_embs_arr

        _save(fandom, combined_df, combined_embs)
        return len(fics), 0

    except Exception as e:
        print(f"  [local] Batch save failed: {e}")
        return 0, len(fics)


def clear_fandom_local(fandom: str):
    """Delete local storage for a fandom."""
    import shutil
    d = fandom_dir(fandom)
    if d.exists():
        shutil.rmtree(d)
        print(f"[local] Cleared local storage for '{fandom}'")
    else:
        print(f"[local] No local storage found for '{fandom}'")
