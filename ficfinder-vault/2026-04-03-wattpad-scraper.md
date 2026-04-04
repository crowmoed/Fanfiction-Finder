# Wattpad scraper + fandom cleanup
**Date:** April 3, 2026  
**Tags:** #scraping #ai  
**Links:** ← [[2026-04-02-bedrock-live]] → [[2026-04-04-parallel-scraping]]

## What happened
Built and integrated the Wattpad scraper. Also cleaned up fandom mappings.

## Wattpad discovery
No Selenium needed. Wattpad has an internal v4 API:
```
GET https://www.wattpad.com/v4/search/stories/
  ?query={fandom}
  &offset={n}
  &limit=20
  &fields=id,title,description,voteCount,readCount,...
```
Offset/limit pagination, returns structured JSON.

## Field mapping
| Wattpad | FicFinder DB |
|---------|-------------|
| `voteCount` | `kudos` |
| `readCount` | `hits` |
| `length` | `word_count = None` (it's character count, not words) |

## No new DB tables
Wattpad fics map to existing schema.

## ⚠️ ToS issue
Wattpad's ToS explicitly states users must be human, not programs collecting data. Automated scraping is prohibited. → [[2026-04-04-today]]

## Dynamic quality filter
Wattpad has no fandom taxonomy — can't rely on fandom-level search quality. Built 2-phase calibration:

**Phase 1:** Sample first 10 pages → compute vote/read ratio distribution for this fandom  
**Phase 2:** Scrape all results, apply percentile cutoff based on fandom size:
- < 5K stories → P40
- 5K–20K → P60
- 20K–50K → P75
- 50K+ → **P85**

Tested P65 (40% pass), P80 (27%), P85 (18%). Settled on P85 for large fandoms → ~10-11K projected Naruto fics.

`EARLY_STOP_ENABLED = False` — don't early-stop, find all hidden gems.

## Fandom mappings fixed
- All FFN slugs capitalized (e.g. `book/harry-potter` → `book/Harry-Potter`)
- AO3 canonical tags corrected (added media qualifiers, umbrella tags)
- NCT added: `{"ao3": "NCT (Band)", "ffn": None}` (no FFN category for K-pop)
- FFN scraper guard needed for `ffn: None`

## Integration
Wired into `fandoms.py`, `indexer.py`, frontend types, route handler.

## Next test
Index NCT first to validate Wattpad scraper end-to-end (Wattpad-heavy fandom).
