# Open questions
**Tags:** #todo  

## Security
- [ ] Rotate Neon DB password (exposed in App Runner logs)
- [ ] Rotate Gemini API key (exposed in App Runner logs)

## Product
- [ ] Finalize free tier daily search limit
- [ ] Stripe integration (not started)
- [ ] Grafana Cloud setup (explored, not implemented)

## Infra
- [ ] EC2 + Xvfb for remote indexing (explored, not set up) → [[2026-04-02-remote-indexer]]
- [ ] Deploy script

## Indexing
- [ ] Test-index NCT (validates Wattpad scraper end-to-end)
- [ ] Index Hunter x Hunter
- [ ] Decision: Wattpad ToS risk — accept or mitigate?
- [ ] Multi-account Neon split vs. word floor tuning

## Features (not started)
- [ ] Wire `excluded_tags` from query enhancer to SQL filters
- [ ] BM25/hybrid search layer (ao3_tags, detected_ships, etc. already extracted, not yet consumed)
- [ ] Bedrock prompt caching
- [ ] Parallelize embedding calls
- [ ] Cognito + Google OAuth (designed, not implemented)
