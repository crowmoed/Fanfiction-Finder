---
date: 2026-04-03
tags: [scraping, wattpad, quality-filtering]
---
Basically added wattpad to be one of the websites that is scraped. It was simpler then others because it didnt require any web browser based tokens like AO3, just a backend api call. The real main problem was an algorithm that added fics. Theres a lot of slop on ao3 so we had to be strict with it. 

our final and unfixed problem is the fact that currently the ao3 backend api just stops at 10000, pretty sure anything after that is just straight up un accessible. 
# Apr 3 — Wattpad Scraper

## What happened
- Built and integrated Wattpad scraper using their internal v4 API (no Selenium needed)
- Dynamic quality filtering system implemented
- AO3 + FFN fandom slug corrections + NCT added

## Wattpad v4 API
```
GET https://www.wattpad.com/v4/search/stories/
  ?query={fandom}
  &offset={offset}
  &limit=20
  &fields=id,title,voteCount,readCount,description,completed,url,...
```

## Field mapping
| Wattpad field | FicFinder field                                            |
| ------------- | ---------------------------------------------------------- |
| `voteCount`   | `kudos`                                                    |
| `readCount`   | `hits`                                                     |
| `length`      | `word_count = None` (length is character count, not words) |

## Dynamic quality filtering
Challenge: Wattpad has no fandom taxonomy — engagement metrics vary wildly by fandom culture.

**Solution: 2-phase calibration**
1. Sample first 10 pages → compute vote/read ratio distribution
2. Select percentile cutoff based on fandom size:
   - < 5K stories → P40
   - 5K–20K → P60
   - 20K–50K → P75
   - 50K+ → P85

Tested at P65 (40% pass), P80 (27% pass), P85 (18% pass). Settled on P85 for large fandoms → ~10-11K projected Naruto fics.

`EARLY_STOP_ENABLED = False` — don't miss hidden gems.

## Fandom corrections
- All FFN slugs capitalized to match canonical URLs
- Multiple AO3 tag strings corrected (verified canonical)
- NCT added: `{"ao3": "NCT (Band)", "ffn": None}`

## ⚠️ ToS note
Wattpad's ToS explicitly states users must be human (not programs collecting data). First thing they mention on sign-up.

## Links
- [[Apr 2 - Bedrock Live and HyDE Pipeline]]
- [[Apr 4 - Parallel Scraping and Retry]]
