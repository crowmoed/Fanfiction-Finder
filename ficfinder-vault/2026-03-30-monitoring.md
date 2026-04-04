# Monitoring explored
**Date:** March 30, 2026  
**Tags:** #infra  
**Links:** ← [[2026-03-31-db-cleanup-neon]] (explored around same time)

## What happened
Evaluated cross-service monitoring options.

## Options evaluated
| Tool | Notes |
|------|-------|
| AWS CloudWatch | Native but siloed to AWS only |
| Datadog | Best features, expensive |
| **Grafana Cloud** | Free tier, cross-service, recommended |
| New Relic | Free tier but more complex |

## Decision
Grafana Cloud free tier — can pull from App Runner, Neon, and custom FastAPI metrics in one dashboard.

## Status
Explored only — not implemented yet.
