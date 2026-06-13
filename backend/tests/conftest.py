"""Shared test fixtures.

The backend modules create AWS/Gemini/DB clients at import time. These stubs make
imports hermetic so the audit-fix tests can run without real credentials or network.
"""

import os
import sys
import types

import pytest

# Make `backend/` importable as the package root (api, auth, ai, db ...).
BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)


@pytest.fixture(scope="session", autouse=True)
def _stub_external_clients():
    """Stub boto3 / google-genai / sqlalchemy engine creation before app import."""
    import boto3
    import sqlalchemy

    boto3.resource = lambda *a, **k: types.SimpleNamespace(Table=lambda n: None)
    boto3.client = lambda *a, **k: types.SimpleNamespace(invoke_model=lambda **kw: None)

    _orig_create_engine = sqlalchemy.create_engine
    sqlalchemy.create_engine = lambda *a, **k: _orig_create_engine("sqlite://")

    try:
        import google.genai as g

        g.Client = lambda **k: types.SimpleNamespace(models=None)
    except Exception:
        pass

    yield


class FakeDynamoTable:
    """Minimal in-memory stand-in for a DynamoDB Table supporting the ops we use."""

    def __init__(self):
        self.items = {}

    def put_item(self, Item, ConditionExpression=None):
        from botocore.exceptions import ClientError

        key = Item["id"]
        if ConditionExpression and key in self.items:
            raise ClientError(
                {"Error": {"Code": "ConditionalCheckFailedException"}}, "PutItem"
            )
        self.items[key] = Item

    def update_item(self, **kw):
        return {"Attributes": {"id": kw["Key"]["id"], "tier": "paid"}}

    def get_item(self, Key):
        return {"Item": self.items.get(Key["id"])}


@pytest.fixture
def fake_table():
    return FakeDynamoTable()
