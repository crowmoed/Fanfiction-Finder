"""Operator CLI for fandom-sponsorship orders.

Sits alongside indexer.py / rq.py / check_embeddings.py. Lists paid orders (the
`fandom_request:*` items in the users table) and advances their status as you
fulfill them by hand.

    python fandom_orders.py                  # list all orders (newest first)
    python fandom_orders.py --status paid    # only paid (awaiting fulfillment)
    python fandom_orders.py show <id>        # full detail for one order
    python fandom_orders.py confirm <id>     # you've emailed the buyer to confirm
    python fandom_orders.py indexing <id>    # you've started the indexer
    python fandom_orders.py fulfill <id>     # fandom is live in the index
    python fandom_orders.py reject <id>      # can't be done (then refund)
    python fandom_orders.py refund <id>      # issue a Stripe refund + mark refunded

<id> may be the full `fandom_request:<uuid>` id or just the uuid shown in the list.

Typical loop: `list` → email the buyer to confirm the exact fandom → `confirm` →
add the source mapping to data/fandoms.py → `python indexer.py "<Fandom>"` →
`fulfill`. If it can't be done, `refund` (or `reject` then refund manually).
"""

import argparse
import sys

import config  # noqa: F401 — loads the repo-root .env (DATABASE_URL, STRIPE_*, etc.)
from auth.user_store import user_store

# subcommand → the status it sets
STATUS_VERBS = {
    "confirm": "confirmed",
    "indexing": "indexing",
    "fulfill": "fulfilled",
    "reject": "rejected",
}


def _short(rid: str) -> str:
    return rid.split(":", 1)[1] if ":" in rid else rid


def cmd_list(status: str | None) -> None:
    reqs = user_store.list_fandom_requests(status)
    reqs.reverse()  # newest first for the operator
    if not reqs:
        print("No orders." if not status else f"No orders with status '{status}'.")
        return
    print(f"{'ID':<14} {'STATUS':<10} {'FANDOM':<26} {'EMAIL':<26} CREATED")
    print("-" * 92)
    for r in reqs:
        print(
            f"{_short(r['id'])[:12]:<14} {(r.get('status') or ''):<10} "
            f"{(r.get('fandom') or '')[:24]:<26} {(r.get('email') or '')[:24]:<26} "
            f"{(r.get('created_at') or '')[:19]}"
        )
    print(f"\n{len(reqs)} order(s).")


def cmd_show(rid: str) -> None:
    r = user_store.get_fandom_request(rid)
    if not r:
        print(f"No order '{rid}'.")
        sys.exit(1)
    for k in (
        "id", "status", "fandom", "email", "notes", "amount",
        "stripe_session_id", "stripe_payment_intent",
        "created_at", "updated_at", "operator_note",
    ):
        if k in r:
            print(f"{k:>22}: {r[k]}")


def cmd_status(rid: str, new_status: str, note: str | None = None) -> None:
    updated = user_store.update_fandom_request(rid, status=new_status, note=note)
    if not updated:
        print(f"No order '{rid}'.")
        sys.exit(1)
    print(f"{_short(updated['id'])} → {new_status}")


def cmd_refund(rid: str) -> None:
    import stripe  # local import: only the refund path needs the SDK

    r = user_store.get_fandom_request(rid)
    if not r:
        print(f"No order '{rid}'.")
        sys.exit(1)
    pi = r.get("stripe_payment_intent")
    if not pi:
        print("No stripe_payment_intent on this order — refund it in the Stripe dashboard, then run reject.")
        sys.exit(1)
    refund = stripe.Refund.create(payment_intent=pi)
    user_store.update_fandom_request(rid, status="refunded", note=f"refund {refund.id}")
    print(f"Refunded {pi} → {refund.status}. Order marked refunded.")


def main(argv=None) -> None:
    argv = argv if argv is not None else sys.argv[1:]
    p = argparse.ArgumentParser(description="Fandom-sponsorship order management.")
    p.add_argument("--status", default=None, help="Filter the listing by status")
    sub = p.add_subparsers(dest="cmd")
    sub.add_parser("list", help="List orders (default)")
    sub.add_parser("show", help="Show one order").add_argument("id")
    for verb in STATUS_VERBS:
        sp = sub.add_parser(verb, help=f"Mark an order {STATUS_VERBS[verb]}")
        sp.add_argument("id")
        sp.add_argument("--note", default=None)
    sub.add_parser("refund", help="Refund via Stripe + mark refunded").add_argument("id")

    args = p.parse_args(argv)

    if args.cmd in STATUS_VERBS:
        cmd_status(args.id, STATUS_VERBS[args.cmd], args.note)
    elif args.cmd == "refund":
        cmd_refund(args.id)
    elif args.cmd == "show":
        cmd_show(args.id)
    else:  # "list" or no subcommand
        cmd_list(args.status)


if __name__ == "__main__":
    main()
