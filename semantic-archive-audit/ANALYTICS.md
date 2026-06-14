# Analytics — what's tracked and how to pull resume metrics

Two sinks, both best-effort (analytics never breaks a request):

1. **CloudWatch Logs** — every `/search` and `/auth/login` emits a structured JSON
   line (via the existing logging middleware). Free, retroactive from the deploy that
   ships this, queryable with **CloudWatch Logs Insights**. Retention follows your log
   group's setting (default: forever, or whatever you set).
2. **DynamoDB durable events** — each search also writes a `search_event:<ts>:<uuid>`
   item to the `ficfinder-users` table, so history survives the **weekly reset** of the
   `searches_used` rate-limit counter. This is the source of truth for long-range
   time-series. No raw query text is stored (privacy; not needed for counts).

## Fields recorded
`search` event: `user_id, tier, fandom, all_fandoms, strict, candidates` (RRF pool size),
`returned, latency_ms`.
`login` event: `user_id, tier, new_signup` (true only on first-ever login).
Durable item adds: `event_ts` (ISO), `day` (YYYY-MM-DD grouping key).

---

## Resume-ready metrics — CloudWatch Logs Insights queries
Console → CloudWatch → Logs Insights → select the App Runner **application** log group
(`/aws/apprunner/fanficfinder-backend/.../application`) → paste → Run.

**Total searches over a period** (set the time range in the UI):
```
fields @timestamp | filter event = "search" | stats count() as searches
```

**Searches per day** (the growth chart):
```
filter event = "search"
| stats count() as searches by bin(1d) as day
| sort day asc
```

**Unique users who searched (active users):**
```
filter event = "search" | stats count_distinct(user_id) as active_users by bin(1d)
```

**Most-searched fandoms (top 10):**
```
filter event = "search" and all_fandoms = 0
| stats count() as searches by fandom
| sort searches desc | limit 10
```

**Search latency p50 / p95 / p99 (performance story):**
```
filter event = "search"
| stats pct(latency_ms,50) as p50, pct(latency_ms,95) as p95, pct(latency_ms,99) as p99, avg(latency_ms) as avg
```

**Avg candidate pool size (shows the RRF pipeline scale):**
```
filter event = "search" | stats avg(candidates) as avg_pool, max(candidates) as max_pool
```

**Signups per day (user growth):**
```
filter event = "login" and new_signup = 1
| stats count() as signups by bin(1d) as day | sort day asc
```

**Free vs paid search volume (engagement by tier):**
```
filter event = "search" | stats count() as searches by tier
```

---

## Durable metrics — straight from DynamoDB (survive log retention)
Total searches ever recorded (one-liner; scans only the event items):
```bat
aws dynamodb scan --region us-east-1 --table-name ficfinder-users ^
  --filter-expression "begins_with(id, :p)" ^
  --expression-attribute-values "{\":p\":{\"S\":\"search_event:\"}}" ^
  --select COUNT
```
Total signups (real users, excludes event/marker items):
```bat
aws dynamodb scan --region us-east-1 --table-name ficfinder-users ^
  --filter-expression "attribute_exists(email)" --select COUNT
```
For richer slicing (per-day, per-fandom), export the `search_event:` items and group
in pandas/SQL — the `day` and `fandom` attributes make that a one-line groupby.

---

## Resume bullet templates (fill from the queries above)
- "Built a semantic fanfiction search engine serving **N searches** across **M users**;
  instrumented end-to-end analytics (CloudWatch + DynamoDB) for usage and latency."
- "Optimized a 4-embedding RRF + LLM-rerank pipeline to a **p95 of X ms** over candidate
  pools averaging **~Y fics**."
- "Drove **Z signups** with a free/paid tier; tracked conversion via Stripe + tier-tagged
  search events."

> Note: the durable per-search write costs one extra DynamoDB `PutItem` per search
> (PAY_PER_REQUEST — negligible at this scale). If you ever want to disable it, gate
> `record_search_event` behind an env flag.
