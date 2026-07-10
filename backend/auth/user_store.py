"""DynamoDB user store.

All DynamoDB logic is contained here. Everything else imports UserStore
and calls its methods. When we add caching or swap implementations later,
only this file changes.

NOTE: The App Runner IAM role (ficfinder-apprunner-instance) needs these
permissions on the users table:
  dynamodb:GetItem, dynamodb:PutItem, dynamodb:UpdateItem,
  dynamodb:CreateTable, dynamodb:DescribeTable
"""

import os
import random
import uuid
from datetime import datetime, timedelta, timezone
from decimal import Decimal

import boto3
from boto3.dynamodb.conditions import Attr
from botocore.config import Config
from botocore.exceptions import ClientError

TABLE_NAME = os.environ.get("USERS_TABLE", "ficfinder-users")
REGION = "us-east-1"

# Explicit timeouts so a DynamoDB hiccup can't hang an authed request indefinitely.
_DDB_CONFIG = Config(
    connect_timeout=5,
    read_timeout=10,
    retries={"max_attempts": 3, "mode": "standard"},
)


def _monday_of_current_week() -> str:
    """Return ISO date string for Monday of the current week (UTC)."""
    today = datetime.now(timezone.utc).date()
    monday = today - timedelta(days=today.weekday())
    return monday.isoformat()


def _item_to_dict(item: dict) -> dict:
    """Convert DynamoDB item (with Decimals) to a plain dict."""
    return {k: int(v) if isinstance(v, Decimal) else v for k, v in item.items()}


class UserStore:
    def __init__(self):
        self._resource = boto3.resource("dynamodb", region_name=REGION, config=_DDB_CONFIG)
        self._table = self._resource.Table(TABLE_NAME)

    def get_user(self, user_id: str) -> dict | None:
        """Fetch a single user by Google sub. Returns None if not found."""
        resp = self._table.get_item(Key={"id": user_id})
        item = resp.get("Item")
        if item is None:
            return None
        return _item_to_dict(item)

    def get_user_with_week_reset(self, user_id: str) -> dict | None:
        """Fetch user, persisting a week-rollover reset if the stored week_start is stale.

        Mirrors the rollover check in increment_searches so reads and writes agree
        on the current-week count. Returns None if the user doesn't exist.
        """
        user = self.get_user(user_id)
        if user is None:
            return None

        current_monday = _monday_of_current_week()
        if user.get("week_start", "") < current_monday:
            resp = self._table.update_item(
                Key={"id": user_id},
                UpdateExpression="SET searches_used = :zero, week_start = :monday",
                ExpressionAttributeValues={
                    ":zero": 0,
                    ":monday": current_monday,
                },
                ReturnValues="ALL_NEW",
            )
            return _item_to_dict(resp["Attributes"])

        return user

    def upsert_user(self, user_id: str, email: str) -> dict:
        """Create user if not exists, otherwise return existing.

        Uses a conditional put with attribute_not_exists(id) so only the
        first call creates the item. Subsequent calls just fetch.
        """
        now = datetime.now(timezone.utc).isoformat()
        try:
            self._table.put_item(
                Item={
                    "id": user_id,
                    "email": email,
                    "tier": "free",
                    "searches_used": 0,
                    "week_start": _monday_of_current_week(),
                    "created_at": now,
                },
                ConditionExpression="attribute_not_exists(id)",
            )
        except ClientError as e:
            if e.response["Error"]["Code"] != "ConditionalCheckFailedException":
                raise
            # User already exists — fall through to get
        return self.get_user(user_id)

    def increment_searches(self, user_id: str) -> dict:
        """Bump searches_used by 1, resetting the week counter if rolled over.

        Uses atomic DynamoDB UpdateItem so concurrent requests don't clobber
        each other.
        """
        current_monday = _monday_of_current_week()
        user = self.get_user(user_id)

        if user is None:
            raise ValueError(f"User {user_id} not found")

        if user.get("week_start", "") < current_monday:
            # Week rolled over — reset to 1 and update week_start
            resp = self._table.update_item(
                Key={"id": user_id},
                UpdateExpression="SET searches_used = :one, week_start = :monday",
                ExpressionAttributeValues={
                    ":one": 1,
                    ":monday": current_monday,
                },
                ReturnValues="ALL_NEW",
            )
        else:
            # Same week — atomic increment
            resp = self._table.update_item(
                Key={"id": user_id},
                UpdateExpression="SET searches_used = searches_used + :inc",
                ExpressionAttributeValues={":inc": 1},
                ReturnValues="ALL_NEW",
            )

        return _item_to_dict(resp["Attributes"])

    def set_tier(self, user_id: str, tier: str) -> dict:
        resp = self._table.update_item(
            Key={"id": user_id},
            UpdateExpression="SET tier = :t",
            ExpressionAttributeValues={":t": tier},
            ReturnValues="ALL_NEW",
        )
        return _item_to_dict(resp["Attributes"])

    def set_stripe_customer_id(self, user_id: str, customer_id: str) -> dict:
        resp = self._table.update_item(
            Key={"id": user_id},
            UpdateExpression="SET stripe_customer_id = :cid",
            ExpressionAttributeValues={":cid": customer_id},
            ReturnValues="ALL_NEW",
        )
        return _item_to_dict(resp["Attributes"])

    def set_stripe_last_checked(self, user_id: str, iso_timestamp: str) -> dict:
        resp = self._table.update_item(
            Key={"id": user_id},
            UpdateExpression="SET stripe_last_checked = :ts",
            ExpressionAttributeValues={":ts": iso_timestamp},
            ReturnValues="ALL_NEW",
        )
        return _item_to_dict(resp["Attributes"])

    def is_event_processed(self, event_id: str) -> bool:
        """Return True if this Stripe event id was already recorded (webhook idempotency)."""
        resp = self._table.get_item(Key={"id": f"stripe_event:{event_id}"})
        return resp.get("Item") is not None

    def mark_event_processed(self, event_id: str) -> bool:
        """Record a Stripe event id exactly once, for webhook idempotency.

        Stores a marker item keyed `stripe_event:<event_id>` via a conditional put
        (attribute_not_exists). Returns True if THIS call recorded it (first time),
        False if it was already present (a Stripe retry of an already-handled event).

        Atomic at the single-item level: concurrent duplicate deliveries race on the
        same conditional put, and exactly one wins.
        """
        now = datetime.now(timezone.utc).isoformat()
        try:
            self._table.put_item(
                Item={"id": f"stripe_event:{event_id}", "processed_at": now},
                ConditionExpression="attribute_not_exists(id)",
            )
            return True
        except ClientError as e:
            if e.response["Error"]["Code"] == "ConditionalCheckFailedException":
                return False
            raise

    def record_search_event(
        self,
        user_id: str,
        *,
        fandom: str | None,
        tier: str | None,
        strict: bool,
        candidates: int,
        returned: int,
        latency_ms: float | None = None,
    ) -> None:
        """Append a durable, time-stamped record of one search for analytics.

        Stored as a separate item keyed `search_event:<iso-ts>:<uuid>` so search
        history survives the weekly reset of `searches_used` (which is only a
        rate-limit counter). Enables time-series metrics — searches/day, unique
        users, per-fandom volume, free-vs-paid usage — via a single table scan or
        export, without storing the raw query text (privacy + not needed for counts).

        Best-effort: never raises. Analytics must not break a search.
        """
        ts = datetime.now(timezone.utc).isoformat()
        try:
            item = {
                "id": f"search_event:{ts}:{uuid.uuid4().hex}",
                "event_ts": ts,
                "day": ts[:10],          # YYYY-MM-DD, handy for grouping
                "user_id": user_id,
                "fandom": fandom or "All Fandoms",
                "tier": tier or "free",
                "strict": strict,
                "candidates": candidates,
                "returned": returned,
            }
            if latency_ms is not None:
                # DynamoDB has no float type — store as Decimal.
                item["latency_ms"] = Decimal(str(round(latency_ms, 1)))
            self._table.put_item(Item=item)
        except Exception:
            # Swallow everything — a failed analytics write must not affect the user.
            pass

    # ── Fandom-sponsorship requests ─────────────────────────────────────────────
    # One-time "pay $20 to vectorize a fandom" orders. Stored in this same table
    # keyed `fandom_request:<uuid>` — the same item-type-by-prefix trick used for
    # `stripe_event:` / `search_event:`. Volume is tiny (a handful of paid orders),
    # so listing is a scan and status changes are get-then-put (no update
    # expression) — simple and fulfilled by hand via `fandom_orders.py`.

    REQUEST_PREFIX = "fandom_request:"
    VALID_REQUEST_STATUSES = (
        "requested", "confirmed", "indexing", "fulfilled", "rejected",
    )

    def _request_key(self, request_id: str) -> str:
        """Accept either the full `fandom_request:<uuid>` id or the bare uuid."""
        if request_id.startswith(self.REQUEST_PREFIX):
            return request_id
        return f"{self.REQUEST_PREFIX}{request_id}"

    def create_fandom_request(
        self,
        *,
        fandom: str,
        email: str = "",
        notes: str = "",
    ) -> dict:
        """Record a free fandom request awaiting operator fulfillment."""
        now = datetime.now(timezone.utc).isoformat()
        item = {
            "id": f"{self.REQUEST_PREFIX}{uuid.uuid4().hex}",
            "kind": "fandom_request",
            "fandom": fandom,
            "email": email or "",
            "notes": notes or "",
            "status": "requested",
            "created_at": now,
            "updated_at": now,
        }
        self._table.put_item(Item=item)
        return _item_to_dict(item)

    def _scan_all(self, **scan_kwargs) -> list[dict]:
        """Scan the whole table, following pagination.

        boto3's ``Table.scan()`` is a SINGLE Scan request: DynamoDB reads at most
        ~1MB of raw items and applies the FilterExpression AFTER that page, so
        matching items past the first page are silently missed unless we loop on
        ``LastEvaluatedKey``. Every filtered scan in this store must go through
        here — the shared table grows without bound (a search_event per search),
        so the 1MB boundary is a real, near-term condition, not a theoretical one.
        """
        items: list[dict] = []
        while True:
            resp = self._table.scan(**scan_kwargs)
            items.extend(resp.get("Items", []))
            start_key = resp.get("LastEvaluatedKey")
            if not start_key:
                break
            scan_kwargs = {**scan_kwargs, "ExclusiveStartKey": start_key}
        return items

    def list_fandom_requests(self, status: str | None = None) -> list[dict]:
        """All sponsorship requests (optionally filtered by status), oldest first."""
        items = [
            _item_to_dict(i)
            for i in self._scan_all(
                FilterExpression=Attr("id").begins_with(self.REQUEST_PREFIX)
            )
            if str(i.get("id", "")).startswith(self.REQUEST_PREFIX)
        ]
        if status:
            items = [i for i in items if i.get("status") == status]
        return sorted(items, key=lambda i: i.get("created_at", ""))

    def get_fandom_request(self, request_id: str) -> dict | None:
        resp = self._table.get_item(Key={"id": self._request_key(request_id)})
        item = resp.get("Item")
        return _item_to_dict(item) if item else None

    def update_fandom_request(
        self, request_id: str, status: str, note: str | None = None
    ) -> dict | None:
        """Advance a request's status (get-then-put). Returns None if not found."""
        item = self.get_fandom_request(request_id)
        if item is None:
            return None
        item["status"] = status
        item["updated_at"] = datetime.now(timezone.utc).isoformat()
        if note:
            item["operator_note"] = note
        self._table.put_item(Item=item)
        return item

    # ── Community fandom vote ───────────────────────────────────────────────────
    # A free, sign-in-gated vote: signed-in users pick 1 of 4 randomly-balloted
    # candidate fandoms to be indexed next. The current ballot is one item
    # `vote_ballot:current`; each vote is `vote:<ballot_id>:<user_id>` (one per
    # user, overwrite-to-change). Same table, same item-type-by-prefix trick.

    VOTE_BALLOT_KEY = "vote_ballot:current"

    def _new_ballot_item(self, candidates: list[str]) -> dict:
        picks = random.sample(candidates, min(4, len(candidates)))
        return {
            "id": self.VOTE_BALLOT_KEY,
            "ballot_id": uuid.uuid4().hex,
            "fandoms": picks,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }

    def get_or_create_ballot(self, candidates: list[str]) -> dict:
        """Return the current 4-fandom ballot, creating one (random pick) if absent."""
        existing = self._table.get_item(Key={"id": self.VOTE_BALLOT_KEY}).get("Item")
        if existing:
            return _item_to_dict(existing)
        item = self._new_ballot_item(candidates)
        try:
            self._table.put_item(
                Item=item, ConditionExpression="attribute_not_exists(id)"
            )
        except ClientError as e:
            if e.response["Error"]["Code"] != "ConditionalCheckFailedException":
                raise
            # Lost the create race — another request made the ballot. Return that one.
            return _item_to_dict(
                self._table.get_item(Key={"id": self.VOTE_BALLOT_KEY})["Item"]
            )
        return _item_to_dict(item)

    def reset_ballot(self, candidates: list[str]) -> dict:
        """Start a fresh round with a new random 4. Old votes (keyed by the old
        ballot_id) are simply orphaned, so the new round tallies from zero."""
        item = self._new_ballot_item(candidates)
        self._table.put_item(Item=item)
        return _item_to_dict(item)

    def cast_vote(self, ballot_id: str, user_id: str, fandom: str) -> None:
        """Record (or change) a user's single vote in the current round."""
        self._table.put_item(
            Item={
                "id": f"vote:{ballot_id}:{user_id}",
                "ballot_id": ballot_id,
                "user_id": user_id,
                "fandom": fandom,
                "voted_at": datetime.now(timezone.utc).isoformat(),
            }
        )

    def get_user_vote(self, ballot_id: str, user_id: str) -> str | None:
        item = self._table.get_item(Key={"id": f"vote:{ballot_id}:{user_id}"}).get("Item")
        return item.get("fandom") if item else None

    def tally_votes(self, ballot_id: str) -> dict:
        """Count votes per fandom for a round (paginated scan — see _scan_all)."""
        prefix = f"vote:{ballot_id}:"
        counts: dict = {}
        for item in self._scan_all(FilterExpression=Attr("id").begins_with(prefix)):
            if not str(item.get("id", "")).startswith(prefix):
                continue
            fandom = item.get("fandom")
            if fandom:
                counts[fandom] = counts.get(fandom, 0) + 1
        return counts


user_store = UserStore()
