"""Contract tests for InventoryItemApiController (inventory-item-api.yaml).

Lot number CRUD backing the React Lot Numbers screen. The write flow creates
a dedicated "ZZCONTRACT..." lot and deletes it again (the seeded admin user
is a superuser/admin, so the permission-guarded branches are exercised
directly). Leftovers from aborted runs are cleaned up first.
"""

from oas import Spec, check

spec = Spec("inventory-item-api.yaml")

LOT_NUMBER = "ZZCONTRACT-LOT"
LOT_NUMBER_UPDATED = "ZZCONTRACT-LOT-2"


def _cleanup(client, product_id):
    for item in client.get_json(f"/api/products/{product_id}/allInventoryItems")["data"]:
        if (item["lotNumber"] or "").startswith("ZZCONTRACT"):
            client.request("DELETE", f"/api/inventoryItems/{item['id']}")


def test_list_inventory_items(client, batch4_endpoints):
    product = client.product("BF640")
    resp = check(
        client, spec, "GET", "/api/products/{productId}/allInventoryItems",
        path=f"/api/products/{product['id']}/allInventoryItems",
    )
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert data, "seeded demo data should have lots for BF640"
    assert all(item["product"]["id"] == product["id"] for item in data)


def test_list_unknown_product_is_404(client, batch4_endpoints):
    resp = check(
        client, spec, "GET", "/api/products/{productId}/allInventoryItems",
        path="/api/products/ZZ-unknown/allInventoryItems",
    )
    assert resp.status_code == 404


def test_lot_number_crud_and_recall(client, batch4_endpoints):
    product = client.product("BF640")
    _cleanup(client, product["id"])

    # Create
    resp = check(
        client, spec, "POST", "/api/inventoryItems",
        json={"product": {"id": product["id"]}, "lotNumber": LOT_NUMBER,
              "expirationDate": "2030-01-31"},
    )
    assert resp.status_code == 200
    item = resp.json()["data"]
    assert item["lotNumber"] == LOT_NUMBER
    assert item["expirationDate"] == "2030-01-31"
    item_id = item["id"]

    try:
        # Duplicate lot is a validation error
        resp = check(
            client, spec, "POST", "/api/inventoryItems",
            json={"product": {"id": product["id"]}, "lotNumber": LOT_NUMBER},
        )
        assert resp.status_code == 400

        # Update (superuser)
        resp = check(
            client, spec, "PUT", "/api/inventoryItems/{id}",
            path=f"/api/inventoryItems/{item_id}",
            json={"lotNumber": LOT_NUMBER_UPDATED, "expirationDate": "2031-06-30"},
        )
        assert resp.status_code == 200
        assert resp.json()["data"]["lotNumber"] == LOT_NUMBER_UPDATED

        # Recall / revert recall (admin)
        resp = check(
            client, spec, "POST", "/api/inventoryItems/{id}/recall",
            path=f"/api/inventoryItems/{item_id}/recall",
        )
        assert resp.status_code == 200
        assert resp.json()["data"]["lotStatus"] == "RECALLED"

        resp = check(
            client, spec, "POST", "/api/inventoryItems/{id}/revertRecall",
            path=f"/api/inventoryItems/{item_id}/revertRecall",
        )
        assert resp.status_code == 200
        assert resp.json()["data"]["lotStatus"] is None
    finally:
        resp = check(
            client, spec, "DELETE", "/api/inventoryItems/{id}",
            path=f"/api/inventoryItems/{item_id}",
        )
        assert resp.status_code == 204


def test_create_blank_lot_is_validation_error(client, batch4_endpoints):
    product = client.product("BF640")
    resp = check(
        client, spec, "POST", "/api/inventoryItems",
        json={"product": {"id": product["id"]}, "lotNumber": ""},
    )
    assert resp.status_code == 400


def test_unknown_item_is_404(client, batch4_endpoints):
    resp = check(
        client, spec, "PUT", "/api/inventoryItems/{id}",
        path="/api/inventoryItems/ZZ-unknown",
        json={"lotNumber": "X"},
    )
    assert resp.status_code == 404
