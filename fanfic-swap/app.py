#!/usr/bin/env python3
"""
FanFicFinder Swap Manager — Terminal UI (Textual)

A clickable, interactive terminal app for managing fandom data between
local storage and the live Neon database, plus scraping controls.

Run:  python app.py
"""

import datetime
import json
import os
import sys
import time
from pathlib import Path

import numpy as np
import polars as pl
from dotenv import load_dotenv
from sqlalchemy import text
from textual import work
from textual.app import App, ComposeResult
from textual.containers import Horizontal, Vertical, VerticalScroll
from textual.widgets import (
    Button,
    Checkbox,
    DataTable,
    Footer,
    Header,
    Label,
    Log,
    ProgressBar,
    Rule,
    Select,
    Input,
    Static,
    TabbedContent,
    TabPane,
)

load_dotenv()

sys.path.insert(0, str(Path(__file__).parent))
from swap_tool import FANDOMS_DIR, fandom_dir, get_engine, load_meta, save_meta, slugify

# Add backend to path for scraper imports
BACKEND_DIR = Path(__file__).parent.parent / "backend"
sys.path.insert(0, str(BACKEND_DIR))

CONSTRUCTED_DIR = Path(__file__).parent / "constructed"
NEON_SIZE_LIMIT_GB = 0.5
BYTES_PER_FIC_ESTIMATE = 5100

MIN_WORDS_OPTIONS = [
    ("None", 0),
    ("5,000", 5000),
    ("10,000", 10000),
    ("20,000", 20000),
    ("40,000", 40000),
    ("60,000", 60000),
    ("80,000", 80000),
    ("100,000", 100000),
]

PLATFORM_OPTIONS = [
    ("All (AO3 + FFN + Wattpad)", "all"),
    ("AO3 only", "ao3"),
    ("FFN only", "ffn"),
    ("Wattpad only", "wattpad"),
]

WATTPAD_QUALITY_OPTIONS = [
    ("Default (0)", 0),
    ("Looser (-1)", -1),
    ("Looser (-2)", -2),
    ("Stricter (+1)", 1),
    ("Stricter (+2)", 2),
]


# ─── Helpers ─────────────────────────────────────────────────────────────────


def fmt_bytes(b):
    if b >= 1_073_741_824:
        return f"{b / 1_073_741_824:.2f} GB"
    if b >= 1_048_576:
        return f"{b / 1_048_576:.1f} MB"
    if b >= 1024:
        return f"{b / 1024:.1f} KB"
    return f"{b} B"


def get_local_fandoms():
    if not FANDOMS_DIR.exists():
        return []
    result = []
    for d in sorted(FANDOMS_DIR.iterdir()):
        if d.is_dir() and (d / "meta.json").exists():
            meta = load_meta(d.name)
            if meta:
                result.append(meta)
    return result


def get_neon_fandoms():
    engine = get_engine()
    with engine.connect() as conn:
        rows = conn.execute(text(
            "SELECT fandom, COUNT(*) as cnt, MIN(word_count), MAX(word_count) "
            "FROM fics WHERE embedding IS NOT NULL "
            "GROUP BY fandom ORDER BY cnt DESC"
        )).fetchall()
    return [
        {"fandom": r[0] or "NULL", "count": int(r[1]),
         "min_wc": int(r[2] or 0), "max_wc": int(r[3] or 0)}
        for r in rows
    ]


def get_db_size():
    engine = get_engine()
    with engine.connect() as conn:
        db_bytes = conn.execute(
            text("SELECT pg_database_size(current_database())")
        ).scalar() or 0
        tbl_bytes = conn.execute(
            text("SELECT pg_total_relation_size('fics')")
        ).scalar() or 0
    return db_bytes, tbl_bytes


def load_constructed_meta():
    path = CONSTRUCTED_DIR / "meta.json"
    if path.exists():
        return json.loads(path.read_text())
    return None


def get_fandom_list():
    """Load the FANDOMS dict from backend."""
    try:
        from data.fandoms import FANDOMS
        return FANDOMS
    except ImportError:
        return {}


def get_db_platform_counts(fandom: str):
    """Get per-platform fic counts from DB for a fandom."""
    engine = get_engine()
    with engine.connect() as conn:
        rows = conn.execute(text(
            "SELECT platform, COUNT(*) FROM fics "
            "WHERE fandom = :fandom GROUP BY platform"
        ), {"fandom": fandom}).fetchall()
    counts = {"ao3": 0, "ffn": 0, "wattpad": 0}
    for platform, count in rows:
        if platform in counts:
            counts[platform] = count
    return counts


# ─── Construct row widget ────────────────────────────────────────────────────


class ConstructRow(Horizontal):
    """A single fandom row: checkbox + min-words dropdown."""

    DEFAULT_CSS = """
    ConstructRow {
        height: 3;
        margin-bottom: 1;
        align: left middle;
    }
    ConstructRow Checkbox {
        width: 1fr;
    }
    ConstructRow Label {
        width: auto;
        margin: 0 1;
    }
    ConstructRow Select {
        width: 18;
    }
    """

    def __init__(self, slug: str, label: str, cb_id: str, sel_id: str):
        super().__init__()
        self._slug = slug
        self._label = label
        self._cb_id = cb_id
        self._sel_id = sel_id

    def compose(self) -> ComposeResult:
        yield Checkbox(self._label, id=self._cb_id)
        yield Label("min words:")
        yield Select(MIN_WORDS_OPTIONS, value=0, id=self._sel_id, allow_blank=True)


# ─── CSS ─────────────────────────────────────────────────────────────────────

APP_CSS = """
Screen {
    background: $surface;
}
#sidebar {
    width: 52;
    dock: left;
    background: $surface-darken-1;
    border-right: solid $primary-background-darken-2;
    padding: 1;
}
#swap-panel {
    width: 1fr;
    padding: 1 2;
    border-right: solid $primary-background-darken-2;
}
#scraper-panel {
    width: 1fr;
    padding: 1 2;
}
.section-title {
    color: $text-muted;
    text-style: bold;
    margin-bottom: 1;
}
.log-box {
    height: 10;
    border: solid $primary-background-darken-2;
    background: $surface-darken-1;
    margin-top: 1;
}
.log-box-tall {
    height: 1fr;
    min-height: 8;
    border: solid $primary-background-darken-2;
    background: $surface-darken-1;
    margin-top: 1;
}
.info-card {
    background: $surface-darken-1;
    border: solid $primary-background-darken-2;
    padding: 1 2;
    margin-bottom: 1;
}
.db-gauge {
    background: $surface-darken-1;
    border: solid $primary-background-darken-2;
    padding: 1 2;
    margin-top: 1;
}
.constructed-card {
    background: $surface-darken-1;
    border: solid $primary-background-darken-2;
    padding: 1 2;
    margin-bottom: 1;
}
Button.destructive {
    background: darkred;
    color: white;
}
Button.destructive:hover {
    background: red;
}
DataTable {
    height: auto;
    max-height: 10;
}
#construct-list {
    height: 1fr;
    border: solid $primary-background-darken-2;
    background: $surface-darken-1;
    padding: 1;
}
#import-input {
    width: 1fr;
}
#import-row {
    height: 3;
}
#export-progress {
    margin: 1 0;
}
#scrape-fandom-select {
    width: 1fr;
}
#scrape-platform-select {
    width: 1fr;
}
#scrape-quality-select {
    width: 1fr;
}
.scrape-option-row {
    height: 3;
    margin-bottom: 1;
    align: left middle;
}
.scrape-option-row Label {
    width: 18;
    margin-right: 1;
}
#coverage-fandom-select {
    width: 1fr;
}
.coverage-row {
    height: 3;
    margin-bottom: 1;
    align: left middle;
}
"""


# ─── App ─────────────────────────────────────────────────────────────────────


class SwapApp(App):
    TITLE = "FanFicFinder Swap Manager"
    CSS = APP_CSS
    BINDINGS = [
        ("r", "refresh", "Refresh"),
        ("q", "quit", "Quit"),
    ]

    def __init__(self):
        super().__init__()
        self._busy = False
        self._local_fandoms: list[dict] = []
        self._construct_inputs: dict[str, dict] = {}
        self._db_bytes: int = 0
        self._tbl_bytes: int = 0
        self._neon_fic_count: int = 0
        self._fandom_dict: dict = {}

    def compose(self) -> ComposeResult:
        yield Header()
        with Horizontal():
            # ── Sidebar ──
            with Vertical(id="sidebar"):
                yield Label("LOCAL STORAGE", classes="section-title")
                yield DataTable(id="local-table")
                yield Static("", id="local-summary")

                yield Label("CONSTRUCTED", classes="section-title")
                yield Static("No dataset constructed.", id="constructed-card", classes="constructed-card")

                yield Label("NEON DB", classes="section-title")
                yield DataTable(id="neon-table")
                yield Static("", id="neon-summary")

                yield Static("", id="db-gauge", classes="db-gauge")
                yield Button("Refresh All", id="btn-refresh", variant="default")

            # ── Swap Panel (left tabs) ──
            with Vertical(id="swap-panel"):
                yield Label("SWAP", classes="section-title")
                with TabbedContent(id="swap-tabs"):
                    with TabPane("Import", id="tab-import"):
                        yield Label("IMPORT FANDOM FROM NEON TO LOCAL", classes="section-title")
                        yield Label("Pulls fic data + embeddings and saves as local parquet/npy files.")
                        with Horizontal(id="import-row"):
                            yield Input(placeholder="Fandom name (exact match)", id="import-input")
                            yield Button("Import", id="btn-import", variant="primary")
                        yield Log(id="import-log", classes="log-box")
                    with TabPane("Construct", id="tab-construct"):
                        yield Label("SELECT FANDOMS + FILTERS", classes="section-title")
                        yield Label("Check fandoms and pick a min word count, then build a combined dataset.")
                        yield VerticalScroll(id="construct-list")
                        with Horizontal():
                            yield Button("Construct Dataset", id="btn-construct", variant="primary")
                            yield Static("", id="construct-status")
                        yield Log(id="construct-log", classes="log-box")
                    with TabPane("Export", id="tab-export"):
                        yield Label("PUSH CONSTRUCTED DATASET TO NEON", classes="section-title")
                        yield Static("No dataset constructed yet.", id="export-info", classes="info-card")
                        yield Button("Export to Neon", id="btn-export", variant="warning", disabled=True)
                        yield ProgressBar(id="export-progress", show_eta=False)
                        yield Log(id="export-log", classes="log-box")
                    with TabPane("Nuke", id="tab-nuke"):
                        yield Label("NUKE LIVE NEON DB", classes="section-title")
                        yield Static(
                            "Truncates the fics table on the live Neon database.\n"
                            "All fic rows and embedding vectors are deleted.\n"
                            "The schema (table structure) is preserved.\n\n"
                            "Local storage is never affected.",
                            classes="info-card",
                        )
                        yield Button("Nuke Neon DB", id="btn-nuke", classes="destructive")
                        yield Log(id="nuke-log", classes="log-box")

            # ── Scraper Panel (right tabs) ──
            with Vertical(id="scraper-panel"):
                yield Label("SCRAPER", classes="section-title")
                with TabbedContent(id="scraper-tabs"):
                    with TabPane("Scrape", id="tab-scrape"):
                        yield Label("INDEX A FANDOM", classes="section-title")
                        yield Label("Scrape fics from AO3/FFN/Wattpad, embed with Gemini, and store in Neon.")
                        with Horizontal(classes="scrape-option-row"):
                            yield Label("Fandom:")
                            yield Select([], id="scrape-fandom-select", allow_blank=True)
                        with Horizontal(classes="scrape-option-row"):
                            yield Label("Platform:")
                            yield Select(PLATFORM_OPTIONS, value="all", id="scrape-platform-select", allow_blank=False)
                        with Horizontal(classes="scrape-option-row"):
                            yield Label("Wattpad quality:")
                            yield Select(WATTPAD_QUALITY_OPTIONS, value=0, id="scrape-quality-select", allow_blank=False)
                        with Horizontal(classes="scrape-option-row"):
                            yield Checkbox("Clear existing fics first", id="scrape-clear-cb")
                        with Horizontal():
                            yield Button("Start Scraping", id="btn-scrape", variant="success")
                            yield Button("Stop", id="btn-scrape-stop", variant="error", disabled=True)
                        yield Log(id="scrape-log", classes="log-box-tall")

                    with TabPane("Coverage", id="tab-coverage"):
                        yield Label("SCRAPE COVERAGE", classes="section-title")
                        yield Label("Compare indexed fics vs available on each platform.")
                        with Horizontal(classes="coverage-row"):
                            yield Label("Fandom:")
                            yield Select([], id="coverage-fandom-select", allow_blank=True)
                        with Horizontal():
                            yield Button("Check Coverage", id="btn-coverage", variant="primary")
                            yield Button("Check All", id="btn-coverage-all", variant="default")
                        yield DataTable(id="coverage-table")
                        yield Log(id="coverage-log", classes="log-box")

                    with TabPane("Cleanup", id="tab-cleanup"):
                        yield Label("DATABASE CLEANUP", classes="section-title")
                        yield Static(
                            "Delete fics with NULL embeddings and run VACUUM FULL.\n"
                            "This reclaims disk space on Neon.\n\n"
                            "May take a few minutes on large databases.",
                            classes="info-card",
                        )
                        with Horizontal():
                            yield Button("Run Cleanup", id="btn-cleanup", variant="warning")
                            yield Button("Clear Fandom", id="btn-clear-fandom", variant="error")
                        with Horizontal(classes="scrape-option-row"):
                            yield Label("Fandom to clear:")
                            yield Select([], id="cleanup-fandom-select", allow_blank=True)
                        yield Log(id="cleanup-log", classes="log-box-tall")

        yield Footer()

    def on_mount(self) -> None:
        local_tbl = self.query_one("#local-table", DataTable)
        local_tbl.add_columns("Fandom", "Fics", "MB", "Saved")
        local_tbl.cursor_type = "row"

        neon_tbl = self.query_one("#neon-table", DataTable)
        neon_tbl.add_columns("Fandom", "Fics", "Min W", "Max W")
        neon_tbl.cursor_type = "row"

        cov_tbl = self.query_one("#coverage-table", DataTable)
        cov_tbl.add_columns("Fandom", "Platform", "Indexed", "Available", "Gap", "Coverage")
        cov_tbl.cursor_type = "row"

        # Load fandom list for dropdowns
        self._fandom_dict = get_fandom_list()
        fandom_options = [(name, name) for name in self._fandom_dict]
        if fandom_options:
            self.query_one("#scrape-fandom-select", Select).set_options(fandom_options)
            self.query_one("#coverage-fandom-select", Select).set_options(fandom_options)
            self.query_one("#cleanup-fandom-select", Select).set_options(fandom_options)

        self.load_all_data()

    def on_button_pressed(self, event: Button.Pressed) -> None:
        btn = event.button.id
        # Swap buttons
        if btn == "btn-refresh":
            self.load_all_data()
        elif btn == "btn-import":
            self.start_import()
        elif btn == "btn-construct":
            self.start_construct()
        elif btn == "btn-export":
            self.start_export()
        elif btn == "btn-nuke":
            self.confirm_nuke()
        # Scraper buttons
        elif btn == "btn-scrape":
            self.start_scrape()
        elif btn == "btn-scrape-stop":
            self._scrape_stop = True
            self.notify("Stop requested. Will finish current batch.", severity="warning")
        elif btn == "btn-coverage":
            self.start_coverage(all_fandoms=False)
        elif btn == "btn-coverage-all":
            self.start_coverage(all_fandoms=True)
        elif btn == "btn-cleanup":
            self.start_cleanup()
        elif btn == "btn-clear-fandom":
            self.start_clear_fandom()

    def on_input_submitted(self, event: Input.Submitted) -> None:
        if event.input.id == "import-input":
            self.start_import()

    # ── Logging ──────────────────────────────────────────────────────────────

    def _log(self, widget_id: str, msg: str) -> None:
        self.query_one(f"#{widget_id}", Log).write_line(msg)

    def _log_clear(self, widget_id: str) -> None:
        self.query_one(f"#{widget_id}", Log).clear()

    # ── Data loading ─────────────────────────────────────────────────────────

    @work(thread=True)
    def load_all_data(self) -> None:
        try:
            local = get_local_fandoms()
            self._local_fandoms = local
            self.app.call_from_thread(self._populate_local_table, local)
        except Exception as e:
            self.app.call_from_thread(
                self.query_one("#local-summary", Static).update, f"Error: {e}"
            )

        self.app.call_from_thread(self._refresh_constructed_sidebar)

        try:
            neon = get_neon_fandoms()
            self.app.call_from_thread(self._populate_neon_table, neon)
        except Exception:
            self.app.call_from_thread(
                self.query_one("#neon-summary", Static).update, "Unreachable"
            )

        try:
            db_bytes, tbl_bytes = get_db_size()
            self._db_bytes = db_bytes
            self._tbl_bytes = tbl_bytes
            self.app.call_from_thread(self._update_db_gauge, db_bytes, tbl_bytes)
        except Exception:
            self.app.call_from_thread(
                self.query_one("#db-gauge", Static).update, "DB size: unavailable"
            )

    def _populate_local_table(self, fandoms: list[dict]) -> None:
        tbl = self.query_one("#local-table", DataTable)
        tbl.clear()
        total_fics = 0
        for m in fandoms:
            sz = m.get("parquet_size_mb", 0) + m.get("npy_size_mb", 0)
            saved = (m.get("exported_at") or "")[:10] or "-"
            count = m.get("fic_count", 0)
            total_fics += count
            tbl.add_row(m.get("fandom_name", "?"), f"{count:,}", f"{sz:.1f}", saved)
        self.query_one("#local-summary", Static).update(
            f"{len(fandoms)} fandoms, {total_fics:,} fics"
        )
        self._rebuild_construct_list()

    def _populate_neon_table(self, fandoms: list[dict]) -> None:
        tbl = self.query_one("#neon-table", DataTable)
        tbl.clear()
        total = sum(f["count"] for f in fandoms)
        self._neon_fic_count = total
        for f in fandoms:
            tbl.add_row(f["fandom"], f"{f['count']:,}", f"{f['min_wc']:,}", f"{f['max_wc']:,}")
        self.query_one("#neon-summary", Static).update(f"{total:,} fics live")

    def _update_db_gauge(self, db_bytes: int, tbl_bytes: int) -> None:
        limit_bytes = int(NEON_SIZE_LIMIT_GB * 1_073_741_824)
        pct = db_bytes / limit_bytes * 100 if limit_bytes else 0
        other_bytes = max(0, db_bytes - tbl_bytes)

        bar_width = 30
        filled = int(bar_width * min(pct, 100) / 100)
        empty = bar_width - filled

        if pct < 60:
            color = "green"
        elif pct < 85:
            color = "yellow"
        else:
            color = "red"

        bar = f"[{color}]{'█' * filled}[/{color}]{'░' * empty}"
        gauge_text = (
            f"DB:   {fmt_bytes(db_bytes)} / {fmt_bytes(limit_bytes)}\n"
            f"Fics: {fmt_bytes(tbl_bytes)}  Other: {fmt_bytes(other_bytes)}\n"
            f"{bar} {pct:.1f}%"
        )
        self.query_one("#db-gauge", Static).update(gauge_text)

    def _refresh_constructed_sidebar(self) -> None:
        meta = load_constructed_meta()
        sidebar = self.query_one("#constructed-card", Static)
        export_info = self.query_one("#export-info", Static)
        export_btn = self.query_one("#btn-export", Button)

        if not meta:
            sidebar.update("No dataset constructed.")
            export_info.update("No dataset constructed yet.")
            export_btn.disabled = True
            return

        fandoms = ", ".join(meta.get("fandoms", []))
        total = meta.get("fic_count", 0)
        mb = meta.get("size_mb", 0)
        built = (meta.get("constructed_at") or "")[:19].replace("T", " ")

        limit_bytes = int(NEON_SIZE_LIMIT_GB * 1_073_741_824)
        other_bytes = max(0, self._db_bytes - self._tbl_bytes) if self._db_bytes else 8_000_000
        if self._neon_fic_count > 0 and self._tbl_bytes > 0:
            bytes_per_fic = self._tbl_bytes / self._neon_fic_count
        else:
            bytes_per_fic = BYTES_PER_FIC_ESTIMATE
        est_db_bytes = int(total * bytes_per_fic)
        est_total = est_db_bytes + other_bytes
        est_pct = est_total / limit_bytes * 100 if limit_bytes else 0

        if est_pct < 60:
            est_color = "green"
        elif est_pct < 85:
            est_color = "yellow"
        else:
            est_color = "red"

        bar_width = 30
        filled = int(bar_width * min(est_pct, 100) / 100)
        empty = bar_width - filled
        est_bar = f"[{est_color}]{'█' * filled}[/{est_color}]{'░' * empty}"

        sidebar_text = (
            f"{total:,} fics  |  {mb:.1f} MB local\n"
            f"{fandoms}\n"
            f"Built: {built}\n\n"
            f"Est. DB after export:\n"
            f"{fmt_bytes(est_total)} / {fmt_bytes(limit_bytes)}\n"
            f"{est_bar} {est_pct:.1f}%"
        )
        sidebar.update(sidebar_text)

        export_text = (
            f"{total:,} fics  |  {mb:.1f} MB  |  {fandoms}\n"
            f"Built: {built}\n\n"
            f"Est. Neon size after export:\n"
            f"{fmt_bytes(est_total)} / {fmt_bytes(limit_bytes)}\n"
            f"{est_bar} {est_pct:.1f}%"
        )
        export_info.update(export_text)
        export_btn.disabled = False

    # ── Construct list ───────────────────────────────────────────────────────

    def _rebuild_construct_list(self) -> None:
        container = self.query_one("#construct-list", VerticalScroll)
        container.remove_children()
        self._construct_inputs.clear()

        for meta in self._local_fandoms:
            slug = meta.get("slug", "")
            name = meta.get("fandom_name", slug)
            count = meta.get("fic_count", 0)
            wc = meta.get("word_count_range", {})

            cb_id = f"cb-{slug}"
            sel_id = f"sel-{slug}"
            self._construct_inputs[slug] = {"cb_id": cb_id, "sel_id": sel_id, "meta": meta}

            label = f"{name} ({count:,} fics, {wc.get('min',0):,}-{wc.get('max',0):,} words)"
            container.mount(ConstructRow(slug, label, cb_id, sel_id))

    # ── Import ───────────────────────────────────────────────────────────────

    def start_import(self) -> None:
        if self._busy:
            self.notify("An operation is already running.", severity="warning")
            return
        fandom = self.query_one("#import-input", Input).value.strip()
        if not fandom:
            self.notify("Enter a fandom name.", severity="warning")
            return
        self._log_clear("import-log")
        self.run_import(fandom)

    @work(thread=True)
    def run_import(self, fandom: str) -> None:
        self._busy = True
        log = lambda m: self.app.call_from_thread(self._log, "import-log", m)
        try:
            engine = get_engine()
            slug = slugify(fandom)
            out_dir = fandom_dir(slug)
            out_dir.mkdir(parents=True, exist_ok=True)

            log(f"Importing: {fandom}")
            with engine.connect() as conn:
                count = conn.execute(
                    text("SELECT COUNT(*) FROM fics WHERE fandom = :f AND embedding IS NOT NULL"),
                    {"f": fandom},
                ).scalar()
                if not count:
                    log(f"No fics found for '{fandom}' with embeddings.")
                    return
                log(f"Found {count:,} fics")

                result = conn.execute(text(
                    "SELECT id,title,url,platform,summary,tags,word_count,kudos,hits,"
                    "fandom,indexed_at,embedding::text as embedding_text "
                    "FROM fics WHERE fandom = :f AND embedding IS NOT NULL"
                ), {"f": fandom})
                rows = result.fetchall()
                cols = list(result.keys())

            log("Parsing embeddings...")
            fic_data, embeddings = [], []
            for i, row in enumerate(rows):
                d = dict(zip(cols, row))
                emb = np.fromstring(d.pop("embedding_text").strip("[]"), sep=",", dtype=np.float32)
                embeddings.append(emb)
                if d.get("indexed_at"):
                    d["indexed_at"] = str(d["indexed_at"])
                fic_data.append(d)

            log("Saving parquet + embeddings...")
            df = pl.DataFrame(fic_data)
            parquet_path = out_dir / "fics.parquet"
            df.write_parquet(parquet_path)
            npy_path = out_dir / "embeddings.npy"
            np.save(npy_path, np.stack(embeddings))

            meta = {
                "fandom_name": fandom, "slug": slug, "fic_count": len(fic_data),
                "exported_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
                "parquet_size_mb": round(parquet_path.stat().st_size / 1024 / 1024, 2),
                "npy_size_mb": round(npy_path.stat().st_size / 1024 / 1024, 2),
                "word_count_range": {
                    "min": int(df["word_count"].min() or 0),
                    "max": int(df["word_count"].max() or 0),
                    "median": int(df["word_count"].median() or 0),
                },
            }
            save_meta(slug, meta)
            mb = meta["parquet_size_mb"] + meta["npy_size_mb"]
            log(f"Done - {len(fic_data):,} fics saved ({mb:.1f} MB)")
            self.app.call_from_thread(self.load_all_data)
        except Exception as e:
            log(f"ERROR: {e}")
        finally:
            self._busy = False

    # ── Construct ────────────────────────────────────────────────────────────

    def start_construct(self) -> None:
        if self._busy:
            self.notify("An operation is already running.", severity="warning")
            return

        selected = []
        for slug, info in self._construct_inputs.items():
            cb = self.query_one(f"#{info['cb_id']}", Checkbox)
            if cb.value:
                sel = self.query_one(f"#{info['sel_id']}", Select)
                min_words = sel.value if sel.value is not Select.BLANK else 0
                selected.append((slug, info["meta"], min_words))

        if not selected:
            self.notify("Check at least one fandom.", severity="warning")
            return

        self._log_clear("construct-log")
        self.run_construct(selected)

    @work(thread=True)
    def run_construct(self, selected: list) -> None:
        self._busy = True
        log = lambda m: self.app.call_from_thread(self._log, "construct-log", m)
        status = lambda m: self.app.call_from_thread(
            self.query_one("#construct-status", Static).update, m
        )
        try:
            CONSTRUCTED_DIR.mkdir(parents=True, exist_ok=True)
            all_fics, all_embs = [], []
            fandom_names = []

            log("Loading + filtering local fandoms...")
            for slug, meta, min_words in selected:
                name = meta.get("fandom_name", slug)
                fandom_names.append(name)

                df = pl.read_parquet(fandom_dir(slug) / "fics.parquet")
                embs = np.load(fandom_dir(slug) / "embeddings.npy")
                if min_words > 0:
                    mask = df["word_count"] >= min_words
                    df = df.filter(mask)
                    embs = embs[mask.to_numpy()]
                log(f"  {name}: {len(df):,} fics (min {min_words:,} words)")
                all_fics.append(df)
                all_embs.append(embs)

            combined_df = pl.concat(all_fics)
            combined_embs = np.vstack(all_embs)
            total = len(combined_df)
            log(f"Combined: {total:,} fics total")

            limit_bytes = int(NEON_SIZE_LIMIT_GB * 1_073_741_824)
            other = max(0, self._db_bytes - self._tbl_bytes) if self._db_bytes else 8_000_000
            if self._neon_fic_count > 0 and self._tbl_bytes > 0:
                bpf = self._tbl_bytes / self._neon_fic_count
            else:
                bpf = BYTES_PER_FIC_ESTIMATE
            est_bytes = int(total * bpf)
            est_pct = (est_bytes + other) / limit_bytes * 100
            log(f"Est. Neon size: ~{fmt_bytes(est_bytes + other)} ({est_pct:.0f}% of {fmt_bytes(limit_bytes)})")

            log("Saving combined dataset...")
            status("Saving...")
            parquet_path = CONSTRUCTED_DIR / "combined.parquet"
            npy_path = CONSTRUCTED_DIR / "combined.npy"
            combined_df.write_parquet(parquet_path)
            np.save(npy_path, combined_embs)

            mb = parquet_path.stat().st_size / 1024 / 1024 + npy_path.stat().st_size / 1024 / 1024
            out_meta = {
                "fic_count": total,
                "fandoms": fandom_names,
                "constructed_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
                "size_mb": round(mb, 2),
            }
            (CONSTRUCTED_DIR / "meta.json").write_text(json.dumps(out_meta, indent=2))

            log(f"Done - {total:,} fics ({mb:.1f} MB)")
            log(f"Fandoms: {', '.join(fandom_names)}")
            status(f"{total:,} fics ready")
            self.app.call_from_thread(self._refresh_constructed_sidebar)
        except Exception as e:
            log(f"ERROR: {e}")
            status("Failed")
        finally:
            self._busy = False

    # ── Export ───────────────────────────────────────────────────────────────

    def start_export(self) -> None:
        if self._busy:
            self.notify("An operation is already running.", severity="warning")
            return
        meta = load_constructed_meta()
        if not meta:
            self.notify("Construct a dataset first.", severity="warning")
            return

        fandoms = ", ".join(meta.get("fandoms", []))
        total = meta.get("fic_count", 0)
        self.notify(
            f"Pushing {total:,} fics ({fandoms}) - will TRUNCATE current table.",
            severity="warning",
        )
        self._log_clear("export-log")
        self.run_export()

    @work(thread=True)
    def run_export(self) -> None:
        self._busy = True
        log = lambda m: self.app.call_from_thread(self._log, "export-log", m)
        def set_progress(pct):
            self.app.call_from_thread(
                self.query_one("#export-progress", ProgressBar).update, total=100, progress=pct
            )
        try:
            log("Loading constructed dataset...")
            combined_df = pl.read_parquet(CONSTRUCTED_DIR / "combined.parquet")
            combined_embs = np.load(CONSTRUCTED_DIR / "combined.npy")
            total = len(combined_df)
            log(f"{total:,} fics loaded")
            set_progress(0)

            engine = get_engine()
            with engine.connect() as conn:
                log("Dropping HNSW index...")
                conn.execute(text("DROP INDEX IF EXISTS fics_embedding_idx"))
                conn.commit()

                log("Truncating fics table...")
                conn.execute(text("TRUNCATE TABLE fics"))
                conn.commit()

                log(f"Inserting {total:,} fics in batches of 500...")
                BATCH = 500
                for start in range(0, total, BATCH):
                    end = min(start + BATCH, total)
                    batch_df = combined_df.slice(start, end - start)
                    batch_embs = combined_embs[start:end]

                    values, params = [], {}
                    for i, row in enumerate(batch_df.iter_rows(named=True)):
                        j = start + i
                        emb_str = "[" + ",".join(f"{x:.8f}" for x in batch_embs[i]) + "]"
                        k = f"b{j}"
                        values.append(
                            f"(:{k}_id,:{k}_title,:{k}_url,:{k}_platform,:{k}_summary,"
                            f":{k}_tags,:{k}_word_count,:{k}_kudos,:{k}_hits,:{k}_fandom,"
                            f":{k}_indexed_at,:{k}_emb::vector)"
                        )
                        params.update({
                            f"{k}_id": row["id"], f"{k}_title": row["title"],
                            f"{k}_url": row["url"], f"{k}_platform": row["platform"],
                            f"{k}_summary": row.get("summary"), f"{k}_tags": row.get("tags"),
                            f"{k}_word_count": row.get("word_count"), f"{k}_kudos": row.get("kudos"),
                            f"{k}_hits": row.get("hits"), f"{k}_fandom": row.get("fandom"),
                            f"{k}_indexed_at": row.get("indexed_at"), f"{k}_emb": emb_str,
                        })
                    conn.execute(
                        text(
                            "INSERT INTO fics (id,title,url,platform,summary,tags,"
                            "word_count,kudos,hits,fandom,indexed_at,embedding) VALUES "
                            + ",".join(values)
                        ),
                        params,
                    )
                    conn.commit()
                    set_progress(int(end / total * 100))

                log("Rebuilding HNSW index (may take a minute)...")
                t0 = time.time()
                conn.execute(text(
                    "CREATE INDEX fics_embedding_idx ON fics "
                    "USING hnsw (embedding vector_cosine_ops) "
                    "WITH (m = 16, ef_construction = 64)"
                ))
                conn.commit()
                log(f"Index built in {time.time() - t0:.1f}s")

            set_progress(100)
            log(f"Done - {total:,} fics live on Neon")
            self.app.call_from_thread(self.load_all_data)
        except Exception as e:
            log(f"ERROR: {e}")
        finally:
            self._busy = False

    # ── Nuke ─────────────────────────────────────────────────────────────────

    def confirm_nuke(self) -> None:
        if self._busy:
            self.notify("An operation is already running.", severity="warning")
            return
        if hasattr(self, "_nuke_armed") and self._nuke_armed:
            self._nuke_armed = False
            self._log_clear("nuke-log")
            self.run_nuke()
        else:
            self._nuke_armed = True
            self._log_clear("nuke-log")
            self._log("nuke-log", "Nuke armed. Click again within 5 seconds to confirm.")
            self.notify("Click Nuke again within 5 seconds to confirm.", severity="warning")
            self.set_timer(5, self._disarm_nuke)

    def _disarm_nuke(self) -> None:
        if hasattr(self, "_nuke_armed") and self._nuke_armed:
            self._nuke_armed = False
            self._log("nuke-log", "Nuke disarmed (timed out).")

    @work(thread=True)
    def run_nuke(self) -> None:
        self._busy = True
        log = lambda m: self.app.call_from_thread(self._log, "nuke-log", m)
        try:
            log("Truncating fics table on Neon...")
            engine = get_engine()
            with engine.connect() as conn:
                conn.execute(text("TRUNCATE TABLE fics"))
                conn.commit()
            log("Fics table truncated. Local storage untouched.")
            self.app.call_from_thread(self.load_all_data)
        except Exception as e:
            log(f"ERROR: {e}")
        finally:
            self._busy = False

    # ═══════════════════════════════════════════════════════════════════════════
    # SCRAPER PANEL
    # ═══════════════════════════════════════════════════════════════════════════

    # ── Scrape ───────────────────────────────────────────────────────────────

    def start_scrape(self) -> None:
        if self._busy:
            self.notify("An operation is already running.", severity="warning")
            return

        fandom_sel = self.query_one("#scrape-fandom-select", Select)
        platform_sel = self.query_one("#scrape-platform-select", Select)
        quality_sel = self.query_one("#scrape-quality-select", Select)
        clear_cb = self.query_one("#scrape-clear-cb", Checkbox)

        fandom = fandom_sel.value
        if fandom is Select.BLANK or not fandom:
            self.notify("Select a fandom.", severity="warning")
            return

        platform = platform_sel.value if platform_sel.value is not Select.BLANK else "all"
        quality = quality_sel.value if quality_sel.value is not Select.BLANK else 0
        clear = clear_cb.value

        self._scrape_stop = False
        self._log_clear("scrape-log")
        self.query_one("#btn-scrape", Button).disabled = True
        self.query_one("#btn-scrape-stop", Button).disabled = False
        self.run_scrape(fandom, platform, quality, clear)

    @work(thread=True)
    def run_scrape(self, fandom: str, platform: str, quality: int, clear: bool) -> None:
        self._busy = True
        log = lambda m: self.app.call_from_thread(self._log, "scrape-log", m)

        # Redirect print output to the log
        import io

        class LogWriter(io.TextIOBase):
            def __init__(self, log_fn):
                self._log_fn = log_fn
                self._buf = ""
            def write(self, s):
                self._buf += s
                while "\n" in self._buf:
                    line, self._buf = self._buf.split("\n", 1)
                    if line.strip():
                        self._log_fn(line)
                return len(s)
            def flush(self):
                if self._buf.strip():
                    self._log_fn(self._buf.strip())
                    self._buf = ""

        old_stdout = sys.stdout
        sys.stdout = LogWriter(log)

        try:
            from db.postgres import init_db, migrate_embedding_dimensions, clear_fandom
            init_db()
            migrate_embedding_dimensions()

            if clear:
                log(f"Clearing existing fics for {fandom}...")
                clear_fandom(fandom)

            total = 0

            if platform in ("all", "ao3"):
                log(f"--- AO3 scraping for {fandom} ---")
                try:
                    from seleniumbase import SB
                    with SB(uc=True, headless=False) as sb:
                        from indexer import scrape_and_embed_ao3
                        stored = scrape_and_embed_ao3(fandom, sb, first_fandom=True)
                        log(f"[AO3] Done: {stored} fics stored")
                        total += stored
                except Exception as e:
                    log(f"[AO3] Error: {e}")

            if self._scrape_stop:
                log("Stopped by user.")
                return

            if platform in ("all", "ffn"):
                ffn_slug = self._fandom_dict.get(fandom, {}).get("ffn")
                if ffn_slug:
                    log(f"--- FFN scraping for {fandom} ---")
                    try:
                        from seleniumbase import SB
                        with SB(uc=True, headless=False) as sb:
                            from indexer import scrape_and_embed_ffn
                            stored = scrape_and_embed_ffn(fandom, sb, first_fandom=True)
                            log(f"[FFN] Done: {stored} fics stored")
                            total += stored
                    except Exception as e:
                        log(f"[FFN] Error: {e}")
                else:
                    log(f"[FFN] No FFN slug for {fandom} — skipping")

            if self._scrape_stop:
                log("Stopped by user.")
                return

            if platform in ("all", "wattpad"):
                log(f"--- Wattpad scraping for {fandom} ---")
                try:
                    from indexer import scrape_and_embed_wattpad
                    stored = scrape_and_embed_wattpad(fandom, quality_offset=quality)
                    log(f"[Wattpad] Done: {stored} fics stored")
                    total += stored
                except Exception as e:
                    log(f"[Wattpad] Error: {e}")

            log(f"\nTotal: {total} fics indexed for {fandom}")
            self.app.call_from_thread(self.load_all_data)
        except Exception as e:
            log(f"ERROR: {e}")
        finally:
            sys.stdout = old_stdout
            self._busy = False
            self.app.call_from_thread(self._scrape_buttons_reset)

    def _scrape_buttons_reset(self) -> None:
        self.query_one("#btn-scrape", Button).disabled = False
        self.query_one("#btn-scrape-stop", Button).disabled = True

    # ── Coverage ─────────────────────────────────────────────────────────────

    def start_coverage(self, all_fandoms: bool = False) -> None:
        if self._busy:
            self.notify("An operation is already running.", severity="warning")
            return

        if all_fandoms:
            fandoms = list(self._fandom_dict.keys())
        else:
            sel = self.query_one("#coverage-fandom-select", Select)
            fandom = sel.value
            if fandom is Select.BLANK or not fandom:
                self.notify("Select a fandom.", severity="warning")
                return
            fandoms = [fandom]

        self._log_clear("coverage-log")
        self.query_one("#coverage-table", DataTable).clear()
        self.run_coverage(fandoms)

    @work(thread=True)
    def run_coverage(self, fandoms: list[str]) -> None:
        self._busy = True
        log = lambda m: self.app.call_from_thread(self._log, "coverage-log", m)

        try:
            import requests
            import re

            all_rows = []
            for fandom in fandoms:
                log(f"Checking {fandom}...")
                db_counts = get_db_platform_counts(fandom)
                fandom_cfg = self._fandom_dict.get(fandom, {})

                for platform, key in [("AO3", "ao3"), ("FFN", "ffn"), ("Wattpad", "wattpad")]:
                    indexed = db_counts.get(key, 0)
                    available = None

                    try:
                        if key == "ao3" and fandom_cfg.get("ao3"):
                            ao3_tag = fandom_cfg["ao3"]
                            encoded = ao3_tag.replace(" ", "+").replace("&", "*a*")
                            url = (
                                f"https://archiveofourown.org/works"
                                f"?commit=Sort+and+Filter"
                                f"&work_search%5Bsort_column%5D=kudos_count"
                                f"&work_search%5Bwords_from%5D=20000"
                                f"&tag_id={encoded}"
                            )
                            resp = requests.get(url, timeout=15, headers={
                                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
                            })
                            match = re.search(r"of\s+([\d,]+)\s+Works?", resp.text)
                            if not match:
                                match = re.search(r"([\d,]+)\s+Works?", resp.text)
                            if match:
                                available = int(match.group(1).replace(",", ""))
                        elif key == "ffn" and fandom_cfg.get("ffn"):
                            url = f"https://www.fanfiction.net/{fandom_cfg['ffn']}/?srt=3&r=10"
                            resp = requests.get(url, timeout=15, headers={
                                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
                            })
                            match = re.search(r"([\d,]+)\s+stories", resp.text, re.IGNORECASE)
                            if match:
                                available = int(match.group(1).replace(",", ""))
                        elif key == "wattpad" and fandom_cfg.get("wattpad"):
                            query = fandom_cfg["wattpad"]
                            url = (
                                f"https://www.wattpad.com/v4/search/stories/"
                                f"?query={requests.utils.quote(query)}&limit=1&fields=total"
                            )
                            resp = requests.get(url, timeout=10, headers={
                                "User-Agent": "Mozilla/5.0",
                                "Accept": "application/json",
                                "Referer": "https://www.wattpad.com/",
                            })
                            resp.raise_for_status()
                            available = resp.json().get("total")
                    except Exception:
                        pass

                    if available is not None and available > 0:
                        gap = available - indexed
                        pct = indexed / available * 100
                        coverage_str = f"{pct:.0f}%"
                    elif available == 0:
                        gap = 0
                        coverage_str = "-"
                    else:
                        gap = None
                        coverage_str = "?"

                    gap_str = f"{gap:,}" if gap is not None else "?"
                    avail_str = f"{available:,}" if available is not None else "?"

                    all_rows.append((fandom, platform, f"{indexed:,}", avail_str, gap_str, coverage_str))

            def populate():
                tbl = self.query_one("#coverage-table", DataTable)
                tbl.clear()
                for row in all_rows:
                    tbl.add_row(*row)

            self.app.call_from_thread(populate)
            log(f"Done - checked {len(fandoms)} fandom(s)")
        except Exception as e:
            log(f"ERROR: {e}")
        finally:
            self._busy = False

    # ── Cleanup ──────────────────────────────────────────────────────────────

    def start_cleanup(self) -> None:
        if self._busy:
            self.notify("An operation is already running.", severity="warning")
            return
        self._log_clear("cleanup-log")
        self.run_cleanup()

    @work(thread=True)
    def run_cleanup(self) -> None:
        self._busy = True
        log = lambda m: self.app.call_from_thread(self._log, "cleanup-log", m)
        try:
            engine = get_engine()

            log("Deleting fics with NULL embeddings...")
            with engine.connect() as conn:
                result = conn.execute(text("DELETE FROM fics WHERE embedding IS NULL"))
                conn.commit()
                log(f"Deleted {result.rowcount} fics")

            log("Running VACUUM FULL ANALYZE (may take a few minutes)...")
            with engine.connect().execution_options(isolation_level="AUTOCOMMIT") as conn:
                conn.execute(text("VACUUM FULL ANALYZE fics"))
            log("VACUUM FULL complete.")

            db_bytes, tbl_bytes = get_db_size()
            log(f"DB size:    {fmt_bytes(db_bytes)}")
            log(f"Fics table: {fmt_bytes(tbl_bytes)}")
            log("Done.")
            self.app.call_from_thread(self.load_all_data)
        except Exception as e:
            log(f"ERROR: {e}")
        finally:
            self._busy = False

    def start_clear_fandom(self) -> None:
        if self._busy:
            self.notify("An operation is already running.", severity="warning")
            return
        sel = self.query_one("#cleanup-fandom-select", Select)
        fandom = sel.value
        if fandom is Select.BLANK or not fandom:
            self.notify("Select a fandom to clear.", severity="warning")
            return

        if hasattr(self, "_clear_armed") and self._clear_armed == fandom:
            self._clear_armed = None
            self._log_clear("cleanup-log")
            self.run_clear_fandom(fandom)
        else:
            self._clear_armed = fandom
            self._log_clear("cleanup-log")
            self._log("cleanup-log", f"Click again within 5 seconds to confirm clearing {fandom}.")
            self.notify(f"Click again to confirm clearing {fandom}.", severity="warning")
            self.set_timer(5, self._disarm_clear)

    def _disarm_clear(self) -> None:
        if hasattr(self, "_clear_armed") and self._clear_armed:
            self._log("cleanup-log", "Clear disarmed (timed out).")
            self._clear_armed = None

    @work(thread=True)
    def run_clear_fandom(self, fandom: str) -> None:
        self._busy = True
        log = lambda m: self.app.call_from_thread(self._log, "cleanup-log", m)
        try:
            log(f"Deleting all fics for {fandom}...")
            engine = get_engine()
            with engine.connect() as conn:
                result = conn.execute(
                    text("DELETE FROM fics WHERE fandom = :f"), {"f": fandom}
                )
                conn.commit()
                log(f"Deleted {result.rowcount} fics for {fandom}.")
            self.app.call_from_thread(self.load_all_data)
        except Exception as e:
            log(f"ERROR: {e}")
        finally:
            self._busy = False

    # ── Actions ──────────────────────────────────────────────────────────────

    def action_refresh(self) -> None:
        self.load_all_data()


if __name__ == "__main__":
    SwapApp().run()
