"""Contract tests for RecordStockApiController (record-stock-api.yaml).

Recording stock creates baseline + adjustment transactions that cannot be
deleted over the API, so the happy path re-records the product's CURRENT
availability rows (same bins/lots/quantities, including zero-quantity rows,
read from /api/products/{id}/productAvailability) with the current time as
transactionDate, leaving product availability and cycle-count candidate
counts unchanged. Zero-quantity rows must be included and the date must not
be backdated, or the availability recomputation prunes zero-quantity
inventory items and diffs the snapshot suite.
"""

import time
from datetime import datetime, timezone

from oas import Spec, check

spec = Spec("record-stock-api.yaml")

# In the seeded demo dataset, Main Warehouse (location id "1") owns
# Inventory id "1"; the inventory id is not otherwise discoverable via API.
MAIN_WAREHOUSE_INVENTORY_ID = "1"


def _transaction_date():
    # Current time: future dates are rejected, and backdating breaks the
    # snapshot suite on re-runs (see module docstring).
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def test_save_record_stock(client):
    main = client.location_id("Main Warehouse")
    product = client.product("BF640")
    availability = client.get_json(f"/api/products/{product['id']}/productAvailability")["data"]
    rows_here = [row for row in availability if row["location"]["id"] == main]
    assert rows_here, "seeded demo data should have BF640 stock in Main Warehouse"
    # productAvailability has no expiration date; merge it from availableItems.
    expirations = {
        item["inventoryItem.id"]: item.get("expirationDate")
        for item in client.get_json(
            "/api/products/availableItems",
            params={"location.id": main, "product.id": product["id"]},
        )["data"]
    }
    rows = [
        {
            "id": row["inventoryItem"]["id"],
            "binLocation": {"id": row["binLocation"]["id"]} if row.get("binLocation") else None,
            "lotNumber": row["lotNumber"] if row["lotNumber"] != "DEFAULT" else "",
            "expirationDate": expirations.get(row["inventoryItem"]["id"]),
            "oldQuantity": row["quantityOnHand"],
            "newQuantity": row["quantityOnHand"],
            "comment": "",
        }
        for row in rows_here
    ]

    def save():
        return check(
            client, spec, "POST", "/api/facilities/{facility}/inventory/record-stock/save",
            path=f"/api/facilities/{main}/inventory/record-stock/save",
            json={
                "product": {"id": product["id"]},
                "inventory": {"id": MAIN_WAREHOUSE_INVENTORY_ID},
                "transactionDate": _transaction_date(),
                "comment": "ZZ Contract record stock",
                "recordInventoryRows": rows,
            },
        )

    resp = save()
    # Transactions must have unique per-second timestamps; if a previous run
    # recorded within the last couple of seconds, wait and retry.
    for _ in range(3):
        if not (resp.status_code == 400 and "transaction already exists" in resp.text):
            break
        time.sleep(2)
        resp = save()
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert data["product"]["id"] == product["id"]
    assert data["comment"] == "ZZ Contract record stock"


def test_save_record_stock_without_inventory_is_validation_error(client):
    main = client.location_id("Main Warehouse")
    product = client.product("BF640")
    resp = check(
        client, spec, "POST", "/api/facilities/{facility}/inventory/record-stock/save",
        path=f"/api/facilities/{main}/inventory/record-stock/save",
        json={
            "product": {"id": product["id"]},
            "transactionDate": _transaction_date(),
            "recordInventoryRows": [],
        },
    )
    assert resp.status_code == 400
    assert "warehouse" in resp.json()["errorMessage"]


def test_save_record_stock_expiry_without_lot_is_validation_error(client):
    main = client.location_id("Main Warehouse")
    product = client.product("BF640")
    resp = check(
        client, spec, "POST", "/api/facilities/{facility}/inventory/record-stock/save",
        path=f"/api/facilities/{main}/inventory/record-stock/save",
        json={
            "product": {"id": product["id"]},
            "inventory": {"id": MAIN_WAREHOUSE_INVENTORY_ID},
            "transactionDate": _transaction_date(),
            "recordInventoryRows": [
                {
                    "lotNumber": "",
                    "expirationDate": "2030-01-01T00:00:00Z",
                    "oldQuantity": 50,
                    "newQuantity": 50,
                },
            ],
        },
    )
    assert resp.status_code == 400
    assert "lot number" in resp.json()["errorMessage"]
