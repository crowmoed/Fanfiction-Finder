---
date: 2026-03-29
tags: [auth, product, subscriptions]
---
Basically just took a look at AUTHO, really havent done much into it, considered my options and moved on as atp I really didnt have any product to actually gatekeep lol...
# Mar 29 — Auth Planning

## What happened
- Planned full authentication + subscription system
- Chose AWS Cognito over NextAuth.js (maximize AWS free tier credits)

## Architecture
- **Auth**: AWS Cognito with Google as federated identity provider
- **JWT verification**: FastAPI verifies against Cognito's public JWKS endpoint
- **Gating**: entire app requires auth to search (no anonymous access)

## Subscription model
- Free tier vs. paid tier
- `users` table in Postgres: `(cognito_user_id, tier, daily_search_count, last_reset)`
- **Stripe webhooks** update tier status on payment
- Free tier daily search limit — not yet finalized

## Naming conventions
- IAM role: `ficfinder-app-runner-role`
- App ID: `ficfinder`
- Cognito client: `ficfinder-user-pool-client`

## Still to do
- [ ] Finalize free tier daily limit
- [ ] Implement Cognito user pool + Google federation
- [ ] Wire JWT middleware into FastAPI
- [ ] Set up Stripe webhook handler

## Links
- [[Mar 24 - Embedding Overhaul]]
- [[Mar 31 AM - DB Cleanup and Neon Migration]]
