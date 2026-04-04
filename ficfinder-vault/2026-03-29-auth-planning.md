# Auth planning
**Date:** March 29, 2026  
**Tags:** #product #infra  
**Links:** ← [[2026-03-24-embedding-overhaul]] → [[2026-03-31-db-cleanup-neon]]

## What happened
Planned authentication and subscription model end-to-end.

## Decisions
- **Auth:** AWS Cognito with Google as federated identity provider
- **Why Cognito:** 50K MAUs free, covered by AWS credits, integrates with existing AWS infra
- **JWT flow:** Cognito issues JWTs → FastAPI verifies against Cognito's public JWKS endpoint
- **Gating:** Entire app requires login (not just premium features)

## Subscription model
- Free tier vs. paid tier
- Free tier daily search limit — **not finalized**
- `users` table: `(cognito_user_id, tier, daily_search_count, last_reset)`
- Stripe webhooks update tier on payment events

## Naming conventions settled
- IAM role: `ficfinder-app-runner-role`
- App ID: `ficfinder`
- Cognito client: `ficfinder-user-pool-client`

## Still open
- Daily search limit for free tier
- Stripe integration (not started)
