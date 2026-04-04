---
date: 2026-03-30
tags: [monitoring, infra]
---
Basically wanted a dashboard and then realised making a dashboard is a ton of work and didnt do it. but for my next app I will.
# Mar 30 — Monitoring Explored

## What happened
- Evaluated cross-service dashboard options for FanFicFinder's scattered infrastructure

## Options evaluated
| Tool              | Notes                                                  |
| ----------------- | ------------------------------------------------------ |
| AWS CloudWatch    | Native but siloed — no third-party API visibility      |
| Datadog           | Best feature set, too expensive                        |
| **Grafana Cloud** | ✅ Free tier, cross-service, custom metrics via FastAPI |
| New Relic         | Free tier but complex setup                            |

## Decision
**Grafana Cloud free tier** — instrument FastAPI to push custom metrics (search latency, Bedrock call counts, embedding costs), plus native AWS integrations for App Runner and RDS/Neon.

## Status
Explored only — not yet implemented.

## Links
- [[Mar 31 AM - DB Cleanup and Neon Migration]]
