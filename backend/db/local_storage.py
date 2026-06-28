"""
Local-first fic storage using parquet + numpy files.

Write path is append-only: each scrape batch writes a new part file under
`parts/` rather than rewriting the full fandom corpus. A `compact()` call
merges parts back into the canonical `fics.parquet` + `embeddings.npy` that
the devtool reads. This keeps per-batch memory O(batch_size) instead of
O(fandom_size), which matters when running several scrapers in parallel.

Falls back to Neon DB if local storage fails.
"""

import datetime
import json
import os
import sys
import time
from pathlib import Path
from typing import Optional

import numpy as np
import polars as pl

# Resolve paths
DEVTOOL_DIR = Path(__file__).parent.parent.parent / "fanfic-devtool"
FANDOMS_DIR = DEVTOOL_DIR / "fandoms"
EMBEDDING_DIMS = 768

CANONICAL_PARQUET = "fics.parquet"
CANONICAL_NPY = "embeddings.npy"
PARTS_SUBDIR = "parts"


def slugify(fandom: str) -> str:
    return fandom.lower().replace(" ", "_").replace("/", "_").replace(".", "")


def fandom_dir(fandom: str) -> Path:
    return FANDOMS_DIR / slugify(fandom)


def _parts_dir(fandom: str) -> Path:
    return fandom_dir(fandom) / PARTS_SUBDIR


# ── Cross-process write lock ─────────────────────────────────────────────────

class _FandomLock:
    """Simple cross-process lock scoped to a fandom directory.

    Uses O_CREAT|O_EXCL on a lockfile — portable across Windows and POSIX
    without pulling in msvcrt/fcntl. Stale locks older than 5 min are broken
    (a crashed scraper shouldn't wedge the fandom forever).
    """

    STALE_SECONDS = 300

    def __init__(self, fandom: str):
        self.path = fandom_dir(fandom) / ".write.lock"
        self.acquired = False

    def __enter__(self):
        self.path.parent.mkdir(parents=True, exist_ok=True)
        deadline = time.monotonic() + 60  # up to 60s waiting
        while True:
            try:
                fd = os.open(str(self.path), os.O_CREAT | os.O_EXCL | os.O_WRONLY)
                os.write(fd, str(os.getpid()).encode())
                os.close(fd)
                self.acquired = True
                return self
            except FileExistsError:
                try:
                    age = time.time() - self.path.stat().st_mtime
                    if age > self.STALE_SECONDS:
                        self.path.unlink(missing_ok=True)
                        continue
                except FileNotFoundError:
                    continue
                if time.monotonic() > deadline:
                    raise TimeoutError(f"Could not acquire lock on {self.path}")
                time.sleep(0.25)

    def __exit__(self, exc_type, exc, tb):
        if self.acquired:
            try:
                self.path.unlink(missing_ok=True)
            except OSError:
                pass


# ── Part-file IO ─────────────────────────────────────────────────────────────

def _next_part_index(fandom: str) -> int:
    """Return the next unused part index for atomic append."""
    pd = _parts_dir(fandom)
    if not pd.exists():
        return 0
    existing = list(pd.glob("fics_*.parquet"))
    if not existing:
        return 0
    idxs = []
    for p in existing:
        stem = p.stem  # fics_0001
        try:
            idxs.append(int(stem.split("_")[-1]))
        except ValueError:
            continue
    return (max(idxs) + 1) if idxs else 0


def _write_part(fandom: str, rows: list[dict], embs: np.ndarray) -> None:
    """Write one part file atomically (tmp then rename)."""
    pd = _parts_dir(fandom)
    pd.mkdir(parents=True, exist_ok=True)

    idx = _next_part_index(fandom)
    name = f"fics_{idx:06d}"
    parquet_tmp = pd / f".{name}.parquet.tmp"
    # np.save() appends .npy if the path doesn't end in .npy already, so we
    # have to give it a .npy suffix on the temp path too.
    npy_tmp = pd / f".{name}.tmp.npy"
    parquet_final = pd / f"{name}.parquet"
    npy_final = pd / f"{name}.npy"

    df = pl.DataFrame(rows)
    df.write_parquet(parquet_tmp)
    np.save(npy_tmp, embs)

    os.replace(parquet_tmp, parquet_final)
    os.replace(npy_tmp, npy_final)


def _list_parts(fandom: str) -> list[tuple[Path, Path]]:
    pd = _parts_dir(fandom)
    if not pd.exists():
        return []
    pairs = []
    for parquet in sorted(pd.glob("fics_*.parquet")):
        npy = pd / (parquet.stem + ".npy")
        if npy.exists():
            pairs.append((parquet, npy))
    return pairs


_TAGS_LEGACY_WARNED = False


def _normalize_tags_column(df: pl.DataFrame) -> pl.DataFrame:
    """Migrate legacy comma-string `tags` columns to `list[str]` at read time.

    Older part/canonical files were written when `tags` was a single comma-joined
    string; newer files write `list[str]`. Concatenation across schema versions
    fails without this normalization.
    """
    if "tags" not in df.columns:
        return df
    dtype = df.schema["tags"]
    if dtype == pl.Utf8:
        global _TAGS_LEGACY_WARNED
        if not _TAGS_LEGACY_WARNED:
            print("[local] Found legacy comma-string tags in parquet — converting to list[str] on read.")
            _TAGS_LEGACY_WARNED = True
        df = df.with_columns(
            pl.when(pl.col("tags").is_null() | (pl.col("tags") == ""))
            .then(pl.lit([], dtype=pl.List(pl.Utf8)))
            .otherwise(pl.col("tags").str.split(", "))
            .alias("tags")
        )
    return df


# ── Canonical IO (used by devtool and compaction) ────────────────────────────

def _canonical_paths(fandom: str) -> tuple[Path, Path]:
    d = fandom_dir(fandom)
    return d / CANONICAL_PARQUET, d / CANONICAL_NPY


def _load_canonical(fandom: str) -> tuple[Optional[pl.DataFrame], Optional[np.ndarray]]:
    parquet_path, npy_path = _canonical_paths(fandom)
    if parquet_path.exists() and npy_path.exists():
        try:
            return _normalize_tags_column(pl.read_parquet(parquet_path)), np.load(npy_path)
        except Exception:
            return None, None
    return None, None


def _write_canonical(fandom: str, df: pl.DataFrame, embs: np.ndarray) -> None:
    parquet_path, npy_path = _canonical_paths(fandom)
    parquet_path.parent.mkdir(parents=True, exist_ok=True)

    parquet_tmp = parquet_path.with_suffix(".parquet.tmp")
    # np.save auto-appends .npy unless the path already has it
    npy_tmp = npy_path.with_suffix(".tmp.npy")

    df.write_parquet(parquet_tmp)
    np.save(npy_tmp, embs)

    os.replace(parquet_tmp, parquet_path)
    os.replace(npy_tmp, npy_path)

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
    (fandom_dir(fandom) / "meta.json").write_text(json.dumps(meta, indent=2, default=str))


# ── Public API ───────────────────────────────────────────────────────────────

def _row_from_fic(fic, fandom: str, now: str) -> dict:
    return {
        "id": f"{fic.platform}:{fic.url}",
        "title": fic.title,
        "url": fic.url,
        "platform": fic.platform,
        "summary": fic.summary,
        "tags": list(fic.tags) if fic.tags else [],
        "word_count": fic.word_count,
        "kudos": fic.kudos,
        "hits": fic.hits,
        # Platform-specific metadata, stored as a JSON string (the parquet column stays
        # a flat Utf8 — `meta` is heterogeneous per platform, so no struct schema).
        "meta": json.dumps(fic.meta.model_dump(mode="json")) if getattr(fic, "meta", None) else None,
        "fandom": fandom,
        "indexed_at": now,
    }


def upsert_fics_batch_local(fics, fandom: str, embeddings: list[list[float]]) -> tuple[int, int]:
    """Append a batch as one part file. O(batch_size) memory — no corpus rewrite."""
    if not fics:
        return 0, 0
    try:
        now = datetime.datetime.now(datetime.timezone.utc).isoformat()
        rows = [_row_from_fic(fic, fandom, now) for fic in fics]
        embs = np.asarray(embeddings, dtype=np.float32)
        if embs.ndim == 1:
            embs = embs.reshape(1, -1)
        with _FandomLock(fandom):
            _write_part(fandom, rows, embs)
        return len(fics), 0
    except Exception as e:
        print(f"  [local] Batch save failed: {e}")
        return 0, len(fics)


def update_meta_local(fandom: str, id_to_meta: dict) -> int:
    """Set the `meta` column for the given fic ids in the local canonical store, so the
    backfill keeps local in sync with the cloud. `id_to_meta` maps fic id → meta dict.
    Returns the number of rows updated. No-op if the fandom isn't compacted locally."""
    if not id_to_meta:
        return 0
    with _FandomLock(fandom):
        df, embs = _load_canonical(fandom)
        if df is None or embs is None:
            return 0
        meta_json = {fid: json.dumps(m) for fid, m in id_to_meta.items()}
        existing = df["meta"].to_list() if "meta" in df.columns else [None] * df.height
        ids = df["id"].to_list()
        new_meta = [meta_json.get(fid, existing[i]) for i, fid in enumerate(ids)]
        df = df.with_columns(pl.Series("meta", new_meta, dtype=pl.Utf8))
        _write_canonical(fandom, df, embs)
        return sum(1 for fid in ids if fid in meta_json)


def list_local_fandoms() -> list[str]:
    """Display names of every fandom that has a local canonical store."""
    if not FANDOMS_DIR.exists():
        return []
    names = []
    for d in sorted(FANDOMS_DIR.iterdir()):
        if d.is_dir() and (d / CANONICAL_PARQUET).exists():
            mj = d / "meta.json"
            name = d.name
            if mj.exists():
                try:
                    name = json.loads(mj.read_text()).get("fandom_name", d.name)
                except Exception:
                    pass
            names.append(name)
    return names


def get_local_fics_needing_meta(fandom: str | None = None, platform: str | None = None,
                                limit: int | None = None) -> list[dict]:
    """Backfill work-list from the LOCAL canonical parquet store: {id, url, platform,
    fandom} for fics whose `meta` is null/missing. The local store is the source we
    enrich; a later `swap_tool push` publishes it to AWS."""
    fandoms = [fandom] if fandom else list_local_fandoms()
    out: list[dict] = []
    for fn in fandoms:
        parquet_path, _ = _canonical_paths(fn)
        if not parquet_path.exists():
            continue
        df = pl.read_parquet(parquet_path)
        has_meta = "meta" in df.columns
        for row in df.iter_rows(named=True):
            if platform and row.get("platform") != platform:
                continue
            if has_meta and row.get("meta") is not None:
                continue
            out.append({"id": row["id"], "url": row["url"],
                        "platform": row["platform"], "fandom": fn})
            if limit and len(out) >= limit:
                return out
    return out


def compact(fandom: str) -> int:
    """Merge all part files into the canonical parquet/npy and delete parts.

    Deduplicates by fic id, keeping the last-written row (later parts win).
    Returns total fic count after compaction.
    """
    with _FandomLock(fandom):
        parts = _list_parts(fandom)
        existing_df, existing_embs = _load_canonical(fandom)

        if not parts and existing_df is None:
            return 0
        if not parts:
            return len(existing_df) if existing_df is not None else 0

        dfs: list[pl.DataFrame] = []
        emb_arrays: list[np.ndarray] = []

        if existing_df is not None and existing_embs is not None:
            dfs.append(existing_df)
            emb_arrays.append(existing_embs)

        for parquet_path, npy_path in parts:
            try:
                dfs.append(_normalize_tags_column(pl.read_parquet(parquet_path)))
                emb_arrays.append(np.load(npy_path))
            except Exception as e:
                print(f"  [local] Skipping unreadable part {parquet_path.name}: {e}")

        if not dfs:
            return 0

        # Align schemas before concat (part files may have different null types)
        target_schema = dfs[0].schema
        aligned = [dfs[0]]
        for d in dfs[1:]:
            try:
                aligned.append(d.cast(target_schema))
            except Exception:
                aligned.append(d)

        combined_df = pl.concat(aligned, how="diagonal_relaxed")
        combined_embs = np.vstack(emb_arrays)

        # Dedupe by id, keeping the last occurrence
        n = len(combined_df)
        combined_df = combined_df.with_row_index("_row_idx")
        keep_idx = (
            combined_df.group_by("id")
            .agg(pl.col("_row_idx").max())
            .get_column("_row_idx")
            .to_numpy()
        )
        # to_numpy() on a polars column may be a read-only zero-copy view,
        # so copy before in-place sort.
        keep_idx = np.array(keep_idx, copy=True)
        keep_idx.sort()
        combined_df = combined_df[keep_idx].drop("_row_idx")
        combined_embs = combined_embs[keep_idx]

        _write_canonical(fandom, combined_df, combined_embs)

        # Remove part files only after canonical write succeeded
        for parquet_path, npy_path in parts:
            try:
                parquet_path.unlink(missing_ok=True)
                npy_path.unlink(missing_ok=True)
            except OSError:
                pass
        try:
            _parts_dir(fandom).rmdir()
        except OSError:
            pass

        print(f"[local] Compacted '{fandom}': {n} rows -> {len(combined_df)} unique")
        return len(combined_df)


def get_local_fic_count(fandom: str, platform: str = "all") -> int:
    """Count rows across canonical + parts. Used by the devtool for live counts."""
    total = 0

    parquet_path, _ = _canonical_paths(fandom)
    if parquet_path.exists():
        try:
            df = pl.read_parquet(parquet_path, columns=["platform"])
            if platform == "all":
                total += df.height
            else:
                total += int(df.filter(pl.col("platform") == platform).height)
        except Exception:
            pass

    for parquet_path, _ in _list_parts(fandom):
        try:
            df = pl.read_parquet(parquet_path, columns=["platform"])
            if platform == "all":
                total += df.height
            else:
                total += int(df.filter(pl.col("platform") == platform).height)
        except Exception:
            pass

    return total


def get_platform_counts(fandom: str) -> dict:
    """Per-platform counts across canonical + parts."""
    counts = {"ao3": 0, "ffn": 0, "wattpad": 0}

    def _tally(path: Path):
        try:
            df = pl.read_parquet(path, columns=["platform"])
            for platform, count in df.group_by("platform").len().iter_rows():
                if platform in counts:
                    counts[platform] += int(count)
        except Exception:
            pass

    parquet_path, _ = _canonical_paths(fandom)
    if parquet_path.exists():
        _tally(parquet_path)
    for parquet_path, _ in _list_parts(fandom):
        _tally(parquet_path)

    return counts


def clear_fandom_local(fandom: str):
    """Delete local storage for a fandom (canonical + parts + lock)."""
    import shutil
    d = fandom_dir(fandom)
    if d.exists():
        shutil.rmtree(d)
        print(f"[local] Cleared local storage for '{fandom}'")
    else:
        print(f"[local] No local storage found for '{fandom}'")
