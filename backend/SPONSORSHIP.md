# Fandom requests — operator guide

There is **no payment**. A visitor asks (for free) to have a fandom indexed; the
request is recorded and **emailed to the operator** (crispychipotle@gmail.com).
You fulfill the ones worth doing by hand.

## The flow

```
visitor on /sponsor  ("Request a fandom", free)
  → POST /api/sponsor {fandom_name, notes, email}   (Next proxy, anonymous)
  → POST /request                                    (backend, api.py)
  → user_store.create_fandom_request(...)            item `fandom_request:<uuid>`, status "requested"
  → notify.send_request_email(...)                   Gmail SMTP → your inbox (best-effort)
  → YOU: fandom_orders.py + indexer.py               (manual)
  → fandom is live in the shared index (searchable by everyone)
```

Email is best-effort: the request is still recorded (and shows in
`fandom_orders.py`) even if the email fails.

## Email setup (Gmail SMTP)

Env (repo-root `.env`, git-ignored):

| Var | Purpose |
|-----|---------|
| `GMAIL_ADDRESS` | the Gmail account to log in / send from (e.g. `you@gmail.com`) |
| `GMAIL_APP_PASSWORD` | a Google **App Password** (16 chars; NOT your account password). Requires 2-Step Verification enabled on the Google account. Spaces are stripped automatically. |
| `REQUEST_NOTIFY_TO` | where requests land (defaults to `GMAIL_ADDRESS`) |

Generate an app password at Google Account → Security → 2-Step Verification →
App passwords. In production, set these three vars in the **App Runner** env too.

## Fulfilling a request (`fandom_orders.py`)

```powershell
cd D:\Fanfiction-Finder\backend
python fandom_orders.py                       # list all requests (newest first)
python fandom_orders.py --status requested    # just the new ones
python fandom_orders.py show <id>             # full detail (fandom, email, notes)
python fandom_orders.py confirm <id>          # you've replied to the requester
python fandom_orders.py indexing <id>         # you've started the indexer
python fandom_orders.py fulfill <id>          # once it's live in the index
python fandom_orders.py reject <id>           # can't be done
```

`<id>` is the short uuid shown in the list (or the full `fandom_request:<uuid>`).

**Typical loop:** `list --status requested` → (optionally reply to the requester)
→ add the source mapping to [`data/fandoms.py`](data/fandoms.py) (the exact AO3
tag / FFN path / Wattpad slug) → `python indexer.py "<Fandom>"` → `fulfill <id>`.

Requests are also readable over HTTP at `GET /admin/requests` (behind
`X-Admin-Token` when `ADMIN_API_TOKEN` is set).
