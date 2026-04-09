# FanFicFinder Swap Tool

Local fandom storage manager. Export fandoms from Neon to local parquet + numpy files, then hot-swap any combination back into the live database.

## Setup

```bash
pip install -r requirements.txt
```

Set `DATABASE_URL` in a `.env` file (Neon pooler connection string).

## Directory Structure

```
fandoms/
  naruto/
    fics.parquet        # structured fic data
    embeddings.npy      # 768-dim float32 vectors  
    meta.json           # fandom stats
  hxh/
    ...
swap_tool.py
config.yaml
```

## Commands

### Export a fandom from Neon to local storage
```bash
python swap_tool.py export "Naruto"
python swap_tool.py export "Hunter x Hunter"
```

### List locally stored fandoms
```bash
python swap_tool.py list
```

### Preview what's currently live on Neon
```bash
python swap_tool.py preview
```

### Interactive push — select fandoms + word count filters
```bash
python swap_tool.py push
```

### Config-based push — use a preset YAML file
```bash
python swap_tool.py push --config swap.yaml --yes
```

### Nuke — clear Neon (double confirmation required)
```bash
python swap_tool.py nuke
```

## Example Workflow

```bash
# 1. Export all your fandoms locally (one-time per fandom)
python swap_tool.py export "Naruto"
python swap_tool.py export "Hunter x Hunter" 
python swap_tool.py export "NCT"

# 2. Push a custom combination to Neon
python swap_tool.py push
# → Select: Naruto (min 20k words) + HxH (min 10k words)
# → Tool truncates Neon, uploads filtered subset, rebuilds HNSW index

# 3. Later, swap to a different combo
python swap_tool.py push
# → Select: NCT (all) + Naruto (min 40k words)
```

## Notes

- **Export before push**: You must export fandoms from Neon before you can push them back. The tool stores data locally so Neon doesn't need to hold everything.
- **Downtime**: The push command truncates then re-inserts. Your live app will return no/partial results for 1-3 minutes during a swap.
- **HNSW index**: Automatically dropped before insert and rebuilt after. Index build time scales with fic count (~30-60s per 50K rows).
- **Storage**: Parquet + numpy is very compact. 34K Naruto fics ≈ 100-150 MB locally.
