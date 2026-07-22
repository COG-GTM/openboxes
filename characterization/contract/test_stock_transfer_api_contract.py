"""Contract tests for StockTransferApiController (openapi/specs/stock-transfer-api.yaml).

The CRUD flow creates a dedicated 'ZZ Contract ...'-described transfer order
from the candidate items at Main Warehouse and deletes it afterwards so the
suite stays re-runnable. Note the update quirk: the order id is bound from
the request BODY, so update payloads must carry "id".
"""

import pytest

from oas import Spec, check

spec = Spec("stock-transfer-api.yaml")

TEST_DESCRIPTION = "ZZ Contract Stock Transfer"


def _main_warehouse(client):
    return client.location_id("Main Warehouse")


@pytest.fixture(scope="module", autouse=True)
def cleanup_leftovers(client):
    main = _main_warehouse(client)
    for st in client.get_json(f"/api/stockTransfers?location={main}")["data"]:
        detail = client.get_json(f"/api/stockTransfers/{st['id']}")["data"]
        if (detail.get("description") or "").startswith("ZZ Contract"):
            client.request("DELETE", f"/api/stockTransfers/{st['id']}")


def _create_payload(client):
    candidates = client.get_json("/api/stockTransfers/candidates")["data"]
    assert candidates, "seeded dataset should have transfer candidates"
    item = candidates[0]
    return {
        "description": TEST_DESCRIPTION,
        "stockTransferItems": [{
            "productAvailabilityId": item["productAvailabilityId"],
            "product": {"id": item["product.id"]},
            "inventoryItem": {"id": item["inventoryItem.id"]},
            "originBinLocation": {"id": item["originBinLocation.id"]},
            "destinationBinLocation": {"id": item["destinationBinLocation.id"]},
            "quantity": 1,
            "quantityOnHand": item["quantityOnHand"],
            "quantityNotPicked": item["quantityNotPicked"],
            "splitItems": [],
        }],
    }


def test_list_requires_location(client):
    check(client, spec, "GET", "/api/stockTransfers")


def test_list(client):
    main = _main_warehouse(client)
    check(client, spec, "GET", "/api/stockTransfers",
          params={"location": main})


def test_status_options(client):
    resp = check(client, spec, "GET", "/api/stockTransfers/statusOptions")
    assert {o["id"] for o in resp.json()["data"]} >= {"PENDING", "COMPLETED"}


def test_candidates(client):
    resp = check(client, spec, "GET", "/api/stockTransfers/candidates")
    assert resp.json()["data"], "seeded dataset should have candidates"


def test_return_candidates_unknown_location(client):
    check(client, spec, "POST", "/api/stockTransfers/candidates",
          json={"locationId": "doesnotexist0000"})


def test_read_unknown(client):
    check(client, spec, "GET", "/api/stockTransfers/{id}",
          path="/api/stockTransfers/doesnotexist0000")


def test_delete_unknown(client):
    check(client, spec, "DELETE", "/api/stockTransfers/{id}",
          path="/api/stockTransfers/doesnotexist0000")


def test_remove_item_unknown(client):
    check(client, spec, "DELETE", "/api/stockTransferItems/{id}",
          path="/api/stockTransferItems/doesnotexist0000")


def test_create_read_update_delete(client):
    resp = check(client, spec, "POST", "/api/stockTransfers",
                 json=_create_payload(client))
    st = resp.json()["data"]
    st_id = st["id"]
    try:
        check(client, spec, "GET", "/api/stockTransfers/{id}",
              path=f"/api/stockTransfers/{st_id}")

        # Update binds the id from the BODY; include it to avoid creating a
        # brand-new order (the pinned parity quirk).
        update = {"id": st_id, "description": TEST_DESCRIPTION + " upd",
                  "stockTransferItems": []}
        check(client, spec, "PUT", "/api/stockTransfers/{id}",
              path=f"/api/stockTransfers/{st_id}", json=update)
        check(client, spec, "POST", "/api/stockTransfers/{id}",
              path=f"/api/stockTransfers/{st_id}", json=update)

        # sendShipment on a plain transfer order (no shipment) -> 500.
        check(client, spec, "POST", "/api/stockTransfers/{id}/sendShipment",
              path=f"/api/stockTransfers/{st_id}/sendShipment", json={})
        # rollback on an order without shipments -> 500.
        check(client, spec, "POST", "/api/stockTransfers/{id}/rollback",
              path=f"/api/stockTransfers/{st_id}/rollback", json={})
    finally:
        check(client, spec, "DELETE", "/api/stockTransfers/{id}",
              path=f"/api/stockTransfers/{st_id}")


# ---------------------------------------------------------------------------
# Batch 25 endpoints (stockTransfer show / print read endpoints). Skipped on
# builds that predate them.
# ---------------------------------------------------------------------------

@pytest.fixture(scope="module")
def batch25_transfer_id(client):
    resp = check(client, spec, "POST", "/api/stockTransfers",
                 json=_create_payload(client))
    st_id = resp.json()["data"]["id"]
    if client.request("GET", f"/api/stockTransfers/{st_id}/details").status_code != 200:
        client.request("DELETE", f"/api/stockTransfers/{st_id}")
        pytest.skip("app build does not expose the batch 25 stock transfer endpoints")
    yield st_id
    client.request("DELETE", f"/api/stockTransfers/{st_id}")


def test_details(client, batch25_transfer_id):
    resp = check(client, spec, "GET", "/api/stockTransfers/{id}/details",
                 path=f"/api/stockTransfers/{batch25_transfer_id}/details")
    data = resp.json()["data"]
    assert data["id"] == batch25_transfer_id
    assert data["orderItems"], "created transfer should have summary items"


def test_details_unknown(client, batch25_transfer_id):
    resp = check(client, spec, "GET", "/api/stockTransfers/{id}/details",
                 path="/api/stockTransfers/doesnotexist0000/details")
    assert resp.status_code == 404


def test_print_data(client, batch25_transfer_id):
    resp = check(client, spec, "GET", "/api/stockTransfers/{id}/print",
                 path=f"/api/stockTransfers/{batch25_transfer_id}/print")
    data = resp.json()["data"]
    assert data["orderNumber"]
    assert data["orderItems"], "created transfer should have print items"


def test_print_data_unknown(client, batch25_transfer_id):
    resp = check(client, spec, "GET", "/api/stockTransfers/{id}/print",
                 path="/api/stockTransfers/doesnotexist0000/print")
    assert resp.status_code == 404


def test_remove_items(client):
    resp = check(client, spec, "POST", "/api/stockTransfers",
                 json=_create_payload(client))
    st = resp.json()["data"]
    st_id = st["id"]
    try:
        item_id = st["stockTransferItems"][0]["id"]
        resp = check(client, spec, "DELETE", "/api/stockTransferItems/{id}",
                     path=f"/api/stockTransferItems/{item_id}")
        assert resp.json()["data"]["stockTransferItems"] == []
        check(client, spec, "DELETE", "/api/stockTransfers/{id}/removeAllItems",
              path=f"/api/stockTransfers/{st_id}/removeAllItems")
    finally:
        check(client, spec, "DELETE", "/api/stockTransfers/{id}",
              path=f"/api/stockTransfers/{st_id}")
