# Fandom sponsorship — operator + Stripe guide

The monetization model: there is **no subscription**. A visitor pays a **one-time
$20** to have a fandom of their choice vectorized (indexed) into Ficwell's search.
Payment is captured up front; you fulfill each order by hand.

## The flow

```
buyer on /sponsor
  → POST /api/sponsor {fandom_name, notes}   (Next proxy, anonymous)
  → POST /checkout                            (backend, api.py)
  → Stripe Checkout (mode=payment, $20)       Stripe collects the buyer's EMAIL
  → buyer pays
  → Stripe → POST /webhooks/stripe            checkout.session.completed
  → user_store.create_fandom_request(...)     item `fandom_request:<uuid>`, status "paid"
  → YOU: fandom_orders.py + indexer.py        (manual)
  → fandom is live in the shared index (searchable by everyone)
```

Indexing is manual and offline (Selenium + real Chrome — see the root CLAUDE.md),
so fulfillment is a queued operator job, not instant. A sponsored fandom becomes
public: it's one shared corpus.

## Fulfilling an order (`fandom_orders.py`)

```powershell
cd D:\Fanfiction-Finder\backend
python fandom_orders.py                  # list all orders (newest first)
python fandom_orders.py --status paid    # just the ones awaiting fulfillment
python fandom_orders.py show <id>        # full detail (email, notes, stripe ids)
python fandom_orders.py confirm <id>     # after you email the buyer to confirm
python fandom_orders.py indexing <id>    # after you start the indexer
python fandom_orders.py fulfill <id>     # once it's live in the index
python fandom_orders.py refund <id>      # issue a Stripe refund + mark refunded
python fandom_orders.py reject <id>      # can't be done (refund separately)
```

`<id>` is the short uuid shown in the list (or the full `fandom_request:<uuid>`).

**Typical loop:** `list --status paid` → email the buyer ("confirm you meant *X*
on AO3/FFN/Wattpad?") → `confirm <id>` → add the source mapping to
[`data/fandoms.py`](data/fandoms.py) (the exact AO3 tag / FFN path / Wattpad slug)
→ `python indexer.py "<Fandom>"` → `fulfill <id>`. If it can't be done →
`refund <id>`.

Orders are also readable over HTTP at `GET /admin/requests` (behind
`X-Admin-Token` when `ADMIN_API_TOKEN` is set).

## Stripe setup

### Env vars (repo-root `.env`)
| Var | Purpose |
|-----|---------|
| `STRIPE_SECRET_KEY` | `sk_test_…` (testing) or `sk_live_…` (production). |
| `STRIPE_WEBHOOK_SECRET` | `whsec_…` — the signing secret of the webhook endpoint below. **Mode-specific** (test and live have different secrets). |
| `FRONTEND_URL` | e.g. `https://fanfiction-finder.vercel.app` — used for the checkout success/cancel redirects (`/sponsor?sponsor=success|cancelled`). |
| `SPONSOR_AMOUNT_CENTS` | *(optional)* price in cents, default `2000` = $20. |
| `SPONSOR_CURRENCY` | *(optional)* default `usd`. |

`STRIPE_PRICE_ID` is **no longer used** — the price is built inline with
`price_data`, so there is no Stripe Product/Price object to create or manage.

### Register the webhook (required)
The order is only recorded when Stripe calls our webhook.

1. Stripe Dashboard → **Developers → Webhooks → Add endpoint**.
2. Endpoint URL: `https://<your-backend-host>/webhooks/stripe`
   (App Runner backend host — **not** the Vercel frontend).
3. Events to send: **`checkout.session.completed`** (that's the only one we handle).
4. Copy the endpoint's **Signing secret** (`whsec_…`) → `STRIPE_WEBHOOK_SECRET`.

Do this **once per mode**: the test-mode and live-mode dashboards each have their
own endpoints and their own `whsec_`.

### Test locally (Stripe CLI)
```powershell
stripe login
stripe listen --forward-to localhost:8000/webhooks/stripe
#   → prints a whsec_… — put it in .env as STRIPE_WEBHOOK_SECRET for local runs
# then complete a real test checkout from /sponsor with card 4242 4242 4242 4242,
# any future expiry / any CVC. The order should appear in `python fandom_orders.py`.
```

### Going live
1. Swap `STRIPE_SECRET_KEY` to `sk_live_…`.
2. Create the **live** webhook endpoint (step above) and set its `whsec_…`.
3. Set `FRONTEND_URL` to the production domain.
4. Redeploy the backend so it picks up the new env.

### Refunds
`fandom_orders.py refund <id>` calls `stripe.Refund.create(payment_intent=…)`
using the `stripe_payment_intent` stored on the order, then marks it `refunded`.
(You can also refund from the Stripe Dashboard and then `reject <id>`.)
