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
from datetime import datetime, timedelta, timezone
from decimal import Decimal

import boto3
from botocore.exceptions import ClientError

TABLE_NAME = os.environ.get("USERS_TABLE", "ficfinder-users")
REGION = "us-east-1"


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
        self._resource = boto3.resource("dynamodb", region_name=REGION)
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


user_store = UserStore()
