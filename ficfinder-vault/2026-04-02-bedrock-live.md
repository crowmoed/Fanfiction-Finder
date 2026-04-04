# Bedrock live + multi-angle HyDE pipeline ★
**Date:** April 2, 2026  
**Tags:** #ai #infra  
**Links:** ← [[2026-03-31-bedrock-decision]] → [[2026-04-03-wattpad-scraper]]

## What happened
Completed Bedrock migration and built the full multi-angle HyDE pipeline.

## Bedrock migration
- `query_enhancer.py` → Bedrock Haiku
- `ranker.py` → Bedrock Haiku
- IAM role `ficfinder-apprunner-instance` attached to App Runner with `bedrock:InvokeModel`
- Fixed: Bedrock response parsing (markdown fence stripping, `content[0]["text"]`)

## Multi-angle HyDE pipeline
```
User query
  → Enhancer generates 3 diverse semantic descriptions
  → 4 vector searches with varying blend ratios:
      (0.8/0.2, 0.7/0.3, 0.5/0.5, pure raw)
  → Dedup, cap at 100 candidates
  → Bedrock ranker scores against original raw query
  → Return top 100
```

## Why multiple angles
One HyDE description can miss. 3 descriptions + 4 blend ratios = broader coverage of the semantic space, better recall.

## ARCHITECTURE.md
Created as a prompting reference for Claude Code — summary of stack, patterns, key decisions. Used as context injection when running Claude Code prompts.

## Also explored
Running indexer remotely on EC2 with Xvfb (virtual display for headed SeleniumBase) → [[2026-04-02-remote-indexer]]
