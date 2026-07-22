"""Contract tests for TransactionApiController (openapi/specs/transaction-api.yaml).

The update test is a no-op round-trip (reads a seeded transaction and PUTs
its own values back) so the seeded dataset is left unchanged. The deleteEntry
operation is destructive, so only its 404 branch is exercised.

The whole controller was added in Phase 2 Batch 2, so it does not exist in
the pinned baseline image - these tests skip when the endpoints respond 404
and run against source builds instead.
"""

import pytest

from oas import Spec, check

spec = Spec("transaction-api.yaml")


@pytest.fixture(scope="module", autouse=True)
def _requires_transaction_api(client):
    if client.request("GET", "/api/transactions/types").status_code == 404:
        pytest.skip("transaction API endpoints not present in this build")


@pytest.fixture(scope="module")
def daily(client):
    resp = check(client, spec, "GET", "/api/transactions/daily")
    return resp.json()["data"]


@pytest.fixture(scope="module")
def transaction_id(client, daily):
    # Resolve a transaction from the most recent seeded transaction date
    # rather than a generated id.
    dates = daily["dates"]
    assert dates, "seeded dataset should have transactions"
    for entry in dates:
        resp = check(client, spec, "GET", "/api/transactions/daily",
                     params={"date": entry["date"]})
        transactions = resp.json()["data"]["transactions"]
        if transactions:
            return transactions[0]["id"]
    pytest.fail("no transactions found on any listed date")


def test_list_daily_default(client, daily):
    assert daily["dateSelected"]
    assert isinstance(daily["dates"], list)


def test_list_daily_with_date(client, daily):
    date = daily["dates"][0]["date"]
    resp = check(client, spec, "GET", "/api/transactions/daily",
                 params={"date": date})
    body = resp.json()["data"]
    assert body["dateSelected"] == date
    assert len(body["transactions"]) == daily["dates"][0]["count"]


def test_transaction_types(client):
    resp = check(client, spec, "GET", "/api/transactions/types")
    names = [t["name"] for t in resp.json()["data"]]
    assert names, "seeded dataset should have transaction types"


def test_location_options(client):
    resp = check(client, spec, "GET", "/api/transactions/locationOptions")
    assert resp.json()["data"], "seeded dataset should have top-level locations"


def test_read(client, transaction_id):
    resp = check(client, spec, "GET", "/api/transactions/{id}",
                 path=f"/api/transactions/{transaction_id}")
    data = resp.json()["data"]
    assert data["id"] == transaction_id
    assert isinstance(data["transactionEntries"], list)
    assert isinstance(data["inventoryItemsByProduct"], dict)


def test_read_not_found(client):
    check(client, spec, "GET", "/api/transactions/{id}",
          path="/api/transactions/ZZ-contract-missing")


def test_update_roundtrip(client, transaction_id):
    # No-op update: PUT the transaction's own values back so the seeded
    # dataset stays unchanged.
    data = client.get_json(f"/api/transactions/{transaction_id}")["data"]
    payload = {
        "transactionDate": data["transactionDate"],
        "comment": data.get("comment") or "",
        "transactionEntries": [
            {
                "id": entry["id"],
                "inventoryItem": {"id": entry["inventoryItem"]["id"]},
                "quantity": entry["quantity"],
            }
            for entry in data["transactionEntries"]
        ],
    }
    if data.get("transactionType", {}).get("id"):
        payload["transactionType"] = {"id": data["transactionType"]["id"]}
    resp = check(client, spec, "PUT", "/api/transactions/{id}",
                 path=f"/api/transactions/{transaction_id}", json=payload)
    updated = resp.json()["data"]
    assert updated["comment"] == (data.get("comment") or None)


def test_update_not_found(client):
    check(client, spec, "PUT", "/api/transactions/{id}",
          path="/api/transactions/ZZ-contract-missing", json={})


def test_delete_entry_not_found(client, transaction_id):
    check(client, spec, "DELETE", "/api/transactions/{id}/entries/{entryId}",
          path=f"/api/transactions/{transaction_id}/entries/ZZ-contract-missing")
