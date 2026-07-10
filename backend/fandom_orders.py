"""Operator CLI for fandom requests.

Sits alongside indexer.py / rq.py / check_embeddings.py. Lists the free fandom
requests (the `fandom_request:*` items in the users table) and advances their
status as you fulfill them by hand.

    python fandom_orders.py                       # list all requests (newest first)
    python fandom_orders.py --status requested    # only new ones awaiting fulfillment
    python fandom_orders.py show <id>             # full detail for one request
    python fandom_orders.py confirm <id>          # you've replied to the requester
    python fandom_orders.py indexing <id>         # you've started the indexer
    python fandom_orders.py fulfill <id>          # fandom is live in the index
    python fandom_orders.py reject <id>           # can't be done

<id> may be the full `fandom_request:<uuid>` id or just the uuid shown in the list.

Typical loop: `list` → (optionally email the requester) → add the source mapping to
data/fandoms.py → `python indexer.py "<Fandom>"` → `fulfill`.
"""

import argparse
import sys

import config  # noqa: F401 — loads the repo-root .env (DATABASE_URL, etc.)
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
        print("No requests." if not status else f"No requests with status '{status}'.")
        return
    print(f"{'ID':<14} {'STATUS':<11} {'FANDOM':<26} {'EMAIL':<26} CREATED")
    print("-" * 93)
    for r in reqs:
        print(
            f"{_short(r['id'])[:12]:<14} {(r.get('status') or ''):<11} "
            f"{(r.get('fandom') or '')[:24]:<26} {(r.get('email') or '')[:24]:<26} "
            f"{(r.get('created_at') or '')[:19]}"
        )
    print(f"\n{len(reqs)} request(s).")


def cmd_show(rid: str) -> None:
    r = user_store.get_fandom_request(rid)
    if not r:
        print(f"No request '{rid}'.")
        sys.exit(1)
    for k in (
        "id", "status", "fandom", "email", "notes",
        "created_at", "updated_at", "operator_note",
    ):
        if k in r:
            print(f"{k:>14}: {r[k]}")


def cmd_status(rid: str, new_status: str, note: str | None = None) -> None:
    updated = user_store.update_fandom_request(rid, status=new_status, note=note)
    if not updated:
        print(f"No request '{rid}'.")
        sys.exit(1)
    print(f"{_short(updated['id'])} → {new_status}")


def main(argv=None) -> None:
    argv = argv if argv is not None else sys.argv[1:]
    p = argparse.ArgumentParser(description="Fandom-request management.")
    p.add_argument("--status", default=None, help="Filter the listing by status")
    sub = p.add_subparsers(dest="cmd")
    sub.add_parser("list", help="List requests (default)")
    sub.add_parser("show", help="Show one request").add_argument("id")
    for verb in STATUS_VERBS:
        sp = sub.add_parser(verb, help=f"Mark a request {STATUS_VERBS[verb]}")
        sp.add_argument("id")
        sp.add_argument("--note", default=None)

    args = p.parse_args(argv)

    if args.cmd in STATUS_VERBS:
        cmd_status(args.id, STATUS_VERBS[args.cmd], args.note)
    elif args.cmd == "show":
        cmd_show(args.id)
    else:  # "list" or no subcommand
        cmd_list(args.status)


if __name__ == "__main__":
    main()
