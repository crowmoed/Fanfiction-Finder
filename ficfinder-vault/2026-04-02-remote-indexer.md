# Remote indexer (EC2 + Xvfb)
**Date:** April 2, 2026  
**Tags:** #infra #scraping  
**Links:** ← [[2026-04-02-bedrock-live]]

## Context
SeleniumBase runs `headless=False` for AO3 bot detection avoidance. This requires a display. Explored running on remote infra instead of local machine.

## Options
1. **EC2 + Xvfb** — virtual framebuffer satisfies display requirement. Recommended path (persistent, flexible).
2. **EC2 + noVNC** — browser-accessible remote interaction
3. **GitHub Actions** — Ubuntu runners have Xvfb available, useful for scheduled indexing

## AO3 caveat
Interstitial pages still need manual interaction regardless of approach.

## Status
Explored — not set up yet.
