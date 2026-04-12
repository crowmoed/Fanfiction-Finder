"""One-time setup: create the ficfinder-users DynamoDB table.

Usage:
    python scripts/create_users_table.py

The table uses on-demand billing (PAY_PER_REQUEST) which stays within the
AWS free tier at low volume.  Run this once from a machine whose credentials
have dynamodb:CreateTable and dynamodb:DescribeTable permissions.
"""

import os
import boto3

TABLE_NAME = os.environ.get("USERS_TABLE", "ficfinder-users")
REGION = "us-east-1"


def main():
    client = boto3.client("dynamodb", region_name=REGION)

    print(f"Creating DynamoDB table '{TABLE_NAME}' in {REGION}...")

    try:
        client.create_table(
            TableName=TABLE_NAME,
            KeySchema=[
                {"AttributeName": "id", "KeyType": "HASH"},
            ],
            AttributeDefinitions=[
                {"AttributeName": "id", "AttributeType": "S"},
            ],
            BillingMode="PAY_PER_REQUEST",
        )
    except client.exceptions.ResourceInUseException:
        print(f"Table '{TABLE_NAME}' already exists.")
        return

    print("Waiting for table to become ACTIVE...")
    waiter = client.get_waiter("table_exists")
    waiter.wait(TableName=TABLE_NAME)
    print(f"Table '{TABLE_NAME}' is ACTIVE.")


if __name__ == "__main__":
    main()
