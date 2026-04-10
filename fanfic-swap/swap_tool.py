#!/usr/bin/env python3
"""
FanFicFinder Local Fandom Swap Tool

Manages local fandom storage (parquet + numpy) and hot-swaps selected
combinations into the live Neon database.

Directory structure:
    fandoms/
        naruto/
            fics.parquet      # structured fic data
            embeddings.npy    # 768-dim float32 vectors
            meta.json         # fandom stats (count, last export date, etc.)
        hxh/
            ...
    swap_tool.py
    config.yaml

Usage:
    python swap_tool.py export <fandom>           Export a fandom from Neon to local storage
    python swap_tool.py list                       List locally stored fandoms
    python swap_tool.py preview                    Preview what's available + sizes
    python swap_tool.py push                       Interactive: select fandoms + filters, push to Neon
    python swap_tool.py push --config swap.yaml    Push using a preset config file
"""

import os
import sys
import json
import time
import datetime
from pathlib import Path
from typing import Optional

import typer
import numpy as np
import polars as pl
from rich.console import Console
from rich.table import Table
from rich.prompt import Prompt, Confirm, IntPrompt
from rich.progress import Progress, SpinnerColumn, TextColumn, BarColumn, TaskProgressColumn
from rich import print as rprint

from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv(Path(__file__).parent.parent / ".env")

app = typer.Typer(help="FanFicFinder Local Fandom Swap Tool")
console = Console()

FANDOMS_DIR = Path(__file__).parent / "fandoms"
EMBEDDING_DIMS = 768

# ─── Helpers ────────────────────────────────────────────────────────────────

def get_engine():
    """Create SQLAlchemy engine from DATABASE_URL env var."""
    url = os.getenv("DATABASE_URL")
    if not url:
        console.print("[red]ERROR: DATABASE_URL not set. Add it to .env or export it.[/red]")
        raise typer.Exit(1)
    return create_engine(url, pool_pre_ping=True, pool_recycle=300)


def slugify(fandom: str) -> str:
    """Convert fandom display name to a safe directory name."""
    return fandom.lower().replace(" ", "_").replace("/", "_").replace(".", "")


def fandom_dir(fandom_slug: str) -> Path:
    return FANDOMS_DIR / fandom_slug


def load_meta(fandom_slug: str) -> dict:
    meta_path = fandom_dir(fandom_slug) / "meta.json"
    if meta_path.exists():
        return json.loads(meta_path.read_text())
    return {}


def save_meta(fandom_slug: str, meta: dict):
    meta_path = fandom_dir(fandom_slug) / "meta.json"
    meta_path.write_text(json.dumps(meta, indent=2, default=str))


# ─── EXPORT: Neon → Local ──────────────────────────────────────────────────

@app.command()
def export(fandom: str):
    """Export a fandom from the live Neon database to local parquet + npy files."""
    engine = get_engine()
    slug = slugify(fandom)
    out_dir = fandom_dir(slug)
    out_dir.mkdir(parents=True, exist_ok=True)

    console.print(f"\n[bold]Exporting fandom:[/bold] {fandom}")

    with engine.connect() as conn:
        # Get count first
        count = conn.execute(
            text("SELECT COUNT(*) FROM fics WHERE fandom = :f AND embedding IS NOT NULL"),
            {"f": fandom}
        ).scalar()

        if count == 0:
            console.print(f"[yellow]No fics found for fandom '{fandom}' (with embeddings).[/yellow]")
            raise typer.Exit(0)

        console.print(f"  Found [cyan]{count:,}[/cyan] fics with embeddings")

        # Fetch all data
        with Progress(
            SpinnerColumn(),
            TextColumn("[progress.description]{task.description}"),
            BarColumn(),
            TaskProgressColumn(),
            console=console,
        ) as progress:
            task = progress.add_task("Fetching from Neon...", total=None)

            result = conn.execute(text(
                "SELECT id, title, url, platform, summary, tags, "
                "word_count, kudos, hits, fandom, indexed_at, "
                "embedding::text as embedding_text "
                "FROM fics WHERE fandom = :f AND embedding IS NOT NULL"
            ), {"f": fandom})
            rows = result.fetchall()
            columns = result.keys()
            progress.update(task, completed=len(rows), total=len(rows))

    # Parse into structured data + embeddings
    fic_data = []
    embeddings = []

    with Progress(
        SpinnerColumn(),
        TextColumn("[progress.description]{task.description}"),
        BarColumn(),
        TaskProgressColumn(),
        console=console,
    ) as progress:
        task = progress.add_task("Parsing embeddings...", total=len(rows))
        for row in rows:
            row_dict = dict(zip(columns, row))
            emb_text = row_dict.pop("embedding_text")

            # Parse pgvector text format: "[0.1,0.2,...]"
            emb = np.fromstring(emb_text.strip("[]"), sep=",", dtype=np.float32)
            embeddings.append(emb)

            # Convert indexed_at to string for parquet
            if row_dict.get("indexed_at"):
                row_dict["indexed_at"] = str(row_dict["indexed_at"])

            fic_data.append(row_dict)
            progress.update(task, advance=1)

    # Save parquet
    df = pl.DataFrame(fic_data)
    parquet_path = out_dir / "fics.parquet"
    df.write_parquet(parquet_path)

    # Save embeddings
    emb_array = np.stack(embeddings)
    npy_path = out_dir / "embeddings.npy"
    np.save(npy_path, emb_array)

    # Save metadata
    meta = {
        "fandom_name": fandom,
        "slug": slug,
        "fic_count": len(fic_data),
        "embedding_dims": EMBEDDING_DIMS,
        "exported_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "parquet_size_mb": round(parquet_path.stat().st_size / 1024 / 1024, 2),
        "npy_size_mb": round(npy_path.stat().st_size / 1024 / 1024, 2),
        "word_count_range": {
            "min": df["word_count"].min(),
            "max": df["word_count"].max(),
            "median": int(df["word_count"].median()) if df["word_count"].median() is not None else None,
        },
    }
    save_meta(slug, meta)

    console.print(f"\n[green]✓ Exported {len(fic_data):,} fics to {out_dir}/[/green]")
    console.print(f"  Parquet: {meta['parquet_size_mb']} MB")
    console.print(f"  Embeddings: {meta['npy_size_mb']} MB")
    console.print(f"  Total: {meta['parquet_size_mb'] + meta['npy_size_mb']:.2f} MB\n")


# ─── LIST: Show local fandoms ──────────────────────────────────────────────

@app.command(name="list")
def list_fandoms():
    """List all locally stored fandoms with stats."""
    if not FANDOMS_DIR.exists():
        console.print("[yellow]No fandoms directory found. Export a fandom first.[/yellow]")
        raise typer.Exit(0)

    table = Table(title="Local Fandoms")
    table.add_column("#", style="dim", width=4)
    table.add_column("Fandom", style="bold")
    table.add_column("Fics", justify="right")
    table.add_column("Word Count Range", justify="right")
    table.add_column("Size (MB)", justify="right")
    table.add_column("Exported", justify="right")

    idx = 0
    for d in sorted(FANDOMS_DIR.iterdir()):
        if not d.is_dir():
            continue
        meta = load_meta(d.name)
        if not meta:
            continue
        idx += 1
        wc = meta.get("word_count_range", {})
        wc_str = f"{wc.get('min', '?'):,} – {wc.get('max', '?'):,}" if wc else "?"
        size = meta.get("parquet_size_mb", 0) + meta.get("npy_size_mb", 0)
        exported = meta.get("exported_at", "?")[:10]
        table.add_row(
            str(idx),
            meta.get("fandom_name", d.name),
            f"{meta.get('fic_count', '?'):,}",
            wc_str,
            f"{size:.1f}",
            exported,
        )

    if idx == 0:
        console.print("[yellow]No fandoms stored locally yet.[/yellow]")
    else:
        console.print(table)


# ─── PREVIEW: Show what's on Neon ──────────────────────────────────────────

@app.command()
def preview():
    """Show what fandoms are currently live on Neon."""
    engine = get_engine()

    with engine.connect() as conn:
        result = conn.execute(text(
            "SELECT fandom, COUNT(*) as cnt, "
            "MIN(word_count) as min_wc, MAX(word_count) as max_wc "
            "FROM fics WHERE embedding IS NOT NULL "
            "GROUP BY fandom ORDER BY cnt DESC"
        ))
        rows = result.fetchall()

    table = Table(title="Live on Neon")
    table.add_column("Fandom", style="bold")
    table.add_column("Fics", justify="right")
    table.add_column("Word Count Range", justify="right")

    for row in rows:
        table.add_row(
            row[0] or "NULL",
            f"{row[1]:,}",
            f"{row[2]:,} – {row[3]:,}",
        )

    console.print(table)


# ─── PUSH: Local → Neon (interactive) ──────────────────────────────────────

@app.command()
def push(
    config: Optional[Path] = typer.Option(None, "--config", "-c", help="YAML config file for non-interactive push"),
    yes: bool = typer.Option(False, "--yes", "-y", help="Skip confirmation prompts"),
):
    """Select fandoms + word count filters, combine, and push to Neon."""

    if not FANDOMS_DIR.exists() or not any(FANDOMS_DIR.iterdir()):
        console.print("[red]No local fandoms found. Run 'export' first.[/red]")
        raise typer.Exit(1)

    # Load selections from config or interactive
    selections = []

    if config:
        import yaml
        cfg = yaml.safe_load(config.read_text())
        for entry in cfg.get("fandoms", []):
            selections.append({
                "slug": slugify(entry["name"]),
                "fandom_name": entry["name"],
                "min_words": entry.get("min_words", 0),
            })
    else:
        # Interactive selection
        available = []
        for d in sorted(FANDOMS_DIR.iterdir()):
            if d.is_dir() and (d / "meta.json").exists():
                meta = load_meta(d.name)
                available.append((d.name, meta))

        if not available:
            console.print("[red]No valid fandoms found in fandoms/ directory.[/red]")
            raise typer.Exit(1)

        console.print("\n[bold]Available fandoms:[/bold]")
        for i, (slug, meta) in enumerate(available, 1):
            wc = meta.get("word_count_range", {})
            console.print(
                f"  [cyan]{i}[/cyan]. {meta.get('fandom_name', slug)} "
                f"({meta.get('fic_count', '?'):,} fics, "
                f"words: {wc.get('min', '?'):,}–{wc.get('max', '?'):,})"
            )

        console.print("\n[dim]Enter fandom numbers separated by commas (e.g. 1,3):[/dim]")
        choices = Prompt.ask("Select fandoms")
        indices = [int(x.strip()) - 1 for x in choices.split(",")]

        for idx in indices:
            if idx < 0 or idx >= len(available):
                console.print(f"[red]Invalid selection: {idx + 1}[/red]")
                raise typer.Exit(1)

            slug, meta = available[idx]
            fandom_name = meta.get("fandom_name", slug)

            min_words = IntPrompt.ask(
                f"  Min word count for [bold]{fandom_name}[/bold]",
                default=0,
            )

            selections.append({
                "slug": slug,
                "fandom_name": fandom_name,
                "min_words": min_words,
            })

    if not selections:
        console.print("[yellow]No fandoms selected.[/yellow]")
        raise typer.Exit(0)

    # Load and filter data
    all_fics = []
    all_embeddings = []

    console.print("\n[bold]Loading and filtering...[/bold]")
    for sel in selections:
        slug = sel["slug"]
        min_words = sel["min_words"]
        fandom_name = sel["fandom_name"]

        df = pl.read_parquet(fandom_dir(slug) / "fics.parquet")
        embs = np.load(fandom_dir(slug) / "embeddings.npy")

        # Filter by word count
        if min_words > 0:
            mask = df["word_count"] >= min_words
            df_filtered = df.filter(mask)
            mask_np = mask.to_numpy()
            embs_filtered = embs[mask_np]
        else:
            df_filtered = df
            embs_filtered = embs

        console.print(
            f"  {fandom_name}: {len(df_filtered):,} fics "
            f"(filtered from {len(df):,}, min {min_words:,} words)"
        )

        all_fics.append(df_filtered)
        all_embeddings.append(embs_filtered)

    # Combine
    combined_df = pl.concat(all_fics)
    combined_embs = np.vstack(all_embeddings)

    total_fics = len(combined_df)
    est_size_mb = (
        combined_df.estimated_size("mb") +
        combined_embs.nbytes / 1024 / 1024
    )

    console.print(f"\n[bold]Combined:[/bold] {total_fics:,} fics, ~{est_size_mb:.1f} MB estimated")

    # Confirmation
    if not yes:
        console.print("\n[yellow]⚠ This will TRUNCATE the live fics table and replace all data.[/yellow]")
        if not Confirm.ask("Proceed?"):
            console.print("[dim]Aborted.[/dim]")
            raise typer.Exit(0)

    # Push to Neon
    engine = get_engine()

    with engine.connect() as conn:
        # Step 1: Drop index (faster bulk insert)
        console.print("\n[dim]Dropping HNSW index if exists...[/dim]")
        conn.execute(text("DROP INDEX IF EXISTS fics_embedding_idx"))
        conn.commit()

        # Step 2: Truncate
        console.print("[dim]Truncating fics table...[/dim]")
        conn.execute(text("TRUNCATE TABLE fics"))
        conn.commit()

        # Step 3: Bulk insert
        console.print("[bold]Inserting fics...[/bold]")

        with Progress(
            SpinnerColumn(),
            TextColumn("[progress.description]{task.description}"),
            BarColumn(),
            TaskProgressColumn(),
            console=console,
        ) as progress:
            task = progress.add_task("Uploading...", total=total_fics)

            BATCH_SIZE = 500
            for batch_start in range(0, total_fics, BATCH_SIZE):
                batch_end = min(batch_start + BATCH_SIZE, total_fics)
                batch_df = combined_df.slice(batch_start, batch_end - batch_start)
                batch_embs = combined_embs[batch_start:batch_end]

                values = []
                params = {}
                for i, row in enumerate(batch_df.iter_rows(named=True)):
                    j = batch_start + i
                    emb_str = "[" + ",".join(f"{x:.8f}" for x in batch_embs[i]) + "]"

                    key = f"b{j}"
                    values.append(
                        f"(:{key}_id, :{key}_title, :{key}_url, :{key}_platform, "
                        f":{key}_summary, :{key}_tags, :{key}_word_count, "
                        f":{key}_kudos, :{key}_hits, :{key}_fandom, "
                        f":{key}_indexed_at, CAST(:{key}_emb AS vector))"
                    )
                    params[f"{key}_id"] = row["id"]
                    params[f"{key}_title"] = row["title"]
                    params[f"{key}_url"] = row["url"]
                    params[f"{key}_platform"] = row["platform"]
                    params[f"{key}_summary"] = row.get("summary")
                    params[f"{key}_tags"] = row.get("tags")
                    params[f"{key}_word_count"] = row.get("word_count")
                    params[f"{key}_kudos"] = row.get("kudos")
                    params[f"{key}_hits"] = row.get("hits")
                    params[f"{key}_fandom"] = row.get("fandom")
                    params[f"{key}_indexed_at"] = row.get("indexed_at")
                    params[f"{key}_emb"] = emb_str

                sql = (
                    "INSERT INTO fics (id, title, url, platform, summary, tags, "
                    "word_count, kudos, hits, fandom, indexed_at, embedding) VALUES "
                    + ", ".join(values)
                    + " ON CONFLICT (id) DO NOTHING"
                )
                conn.execute(text(sql), params)
                conn.commit()
                progress.update(task, advance=batch_end - batch_start)

        # Step 4: Rebuild HNSW index
        console.print("\n[bold]Rebuilding HNSW index...[/bold] (this may take a minute)")
        start = time.time()
        conn.execute(text(
            "CREATE INDEX fics_embedding_idx ON fics "
            "USING hnsw (embedding vector_cosine_ops) "
            "WITH (m = 16, ef_construction = 64)"
        ))
        conn.commit()
        elapsed = time.time() - start
        console.print(f"  Index built in {elapsed:.1f}s")

    # Summary
    console.print(f"\n[green]✓ Pushed {total_fics:,} fics to Neon[/green]")
    for sel in selections:
        console.print(f"  • {sel['fandom_name']} (min {sel['min_words']:,} words)")
    console.print()


# ─── NUKE: Clear Neon ──────────────────────────────────────────────────────

@app.command()
def nuke():
    """Truncate the live fics table on Neon. Use with caution."""
    if not Confirm.ask("[red]This will DELETE ALL fics from Neon. Are you sure?[/red]"):
        raise typer.Exit(0)
    if not Confirm.ask("[red]Really sure?[/red]"):
        raise typer.Exit(0)

    engine = get_engine()
    with engine.connect() as conn:
        conn.execute(text("TRUNCATE TABLE fics"))
        conn.commit()

    console.print("[green]✓ Fics table truncated.[/green]")


if __name__ == "__main__":
    app()
