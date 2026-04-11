# FanFicFinder Swap Tool

Local fandom storage manager. Import fandoms from Neon to local parquet + numpy files, construct a combined dataset, then export it back to the live database.

## Quick Start

```bash
cd d:\Fanfiction-Finder\fanfic-swap
pip install -r requirements.txt
python app.py
```

An interactive terminal UI will open — click buttons, type in fields, use tabs. Runs right in your terminal.

## Prerequisites

1. **Python 3.10+**
2. **`DATABASE_URL`** — add your Neon pooler connection string to a `.env` file in this directory:

```text
DATABASE_URL=postgresql://user:pass@host/dbname?sslmode=require
```

1. **Dependencies:**

```bash
pip install -r requirements.txt
```

## Interactive TUI (`app.py`)

Run `python app.py` to get a full interactive terminal UI powered by [Textual](https://textual.textualize.io/). Click buttons, type in input fields, switch between tabs — all in the terminal.

**Sidebar** shows local storage, Neon status, and a DB size gauge (0.5 GB limit).

**Tabs:** Import, Construct, Export, Nuke.

### Workflow

1. **Import** — type a fandom name exactly as stored in Neon. Downloads fic data + embeddings as `fandoms/<slug>/fics.parquet` + `embeddings.npy`.
2. **Construct** — pick which imported fandoms to include, set a min word count filter per fandom, and save a combined dataset to `constructed/`.
3. **Export** — push the constructed dataset to Neon. Truncates the live table first, bulk-inserts, rebuilds the HNSW index.
4. **Nuke** — wipe the live fics table (two confirmations required, local storage untouched).

## CLI (`swap_tool.py`)

The standalone CLI still works for scripting:

```bash
python swap_tool.py export "Naruto"
python swap_tool.py list
python swap_tool.py preview
python swap_tool.py push
python swap_tool.py push --config swap.yaml --yes
python swap_tool.py nuke
```

## Directory Structure

```text
fanfic-swap/
  app.py               <- interactive TUI (Textual)
  swap_tool.py         <- standalone CLI commands
  requirements.txt
  swap.yaml            <- example config for CLI push
  fandoms/             <- local fandom storage (never auto-deleted)
    naruto/
      fics.parquet
      embeddings.npy
      meta.json
    hunter_x_hunter/
      ...
  constructed/         <- combined dataset ready to push (auto-generated)
    combined.parquet
    combined.npy
    meta.json
```

## Notes

- **Downtime during export:** The Export step truncates then re-inserts. The live app returns no results for roughly 1-3 minutes during a swap.
- **HNSW index:** Dropped before bulk insert, rebuilt after. Build time ~30-60s per 50K fics.
- **Storage:** Parquet + numpy is compact. ~34K fics = 100-150 MB locally.
- **DB limit:** Neon free tier is 0.5 GB. The sidebar gauge tracks usage so you know when you're close.
- **Re-importing:** Re-running Import on a fandom overwrites the local files for that fandom only.
