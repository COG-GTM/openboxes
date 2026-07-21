"""Snapshot tests for safe POST/PUT/DELETE flows of API controllers M-Z.

Each flow creates dedicated test records, snapshots every step, and cleans up
after itself so the suite stays deterministic and re-runnable against the same
seeded database.
"""

import pytest

from obx import check_snapshot, record_response

PRODUCT_CODE = "AX738"


def step(client, name, method, path, json=None, params=None, capture=None):
    resp = client.request(method, path, json=json, params=params)
    # Capture created-record ids before the snapshot assertion so cleanup
    # fixtures can still delete the record if the snapshot check fails.
    if capture is not None:
        capture(resp)
    doc = record_response(name, method, path, resp, params)
    check_snapshot(name, doc)
    return resp


class TestStocklistFlow:
    """StocklistApiController + StocklistItemApiController CRUD flow."""

    @pytest.fixture(scope="class")
    def flow(self, client):
        state = {}
        yield state
        # Best-effort cleanup so reruns stay deterministic
        if state.get("stocklist_id"):
            client.request("DELETE", f"/api/stocklists/{state['stocklist_id']}")

    def test_01_create(self, client, flow):
        resp = step(client, "stocklist_flow_create", "POST", "/api/stocklists", json={
            "name": "Characterization Test Stocklist",
            "origin": {"id": client.location_id("Main Warehouse")},
            "destination": {"id": client.location_id("Boston Office")},
            "requestedBy": {"id": "1"},
        }, capture=lambda r: flow.update(stocklist_id=r.json()["data"]["requisition.id"]))
        assert resp.status_code == 201

    def test_02_read(self, client, flow):
        step(client, "stocklist_flow_read", "GET", f"/api/stocklists/{flow['stocklist_id']}")

    def test_03_create_item(self, client, flow):
        resp = step(
            client,
            "stocklist_flow_create_item",
            "POST",
            "/api/stocklistItems",
            json={"stocklistId": flow["stocklist_id"], "maxQuantity": 25},
            params={"product.id": client.product_id(PRODUCT_CODE)},
            capture=lambda r: flow.update(item_id=r.json()["data"]["requisitionItem.id"]),
        )
        assert resp.status_code == 201

    def test_04_list_items(self, client, flow):
        step(
            client,
            "stocklist_flow_list_items",
            "GET",
            "/api/stocklistItems",
            params={"product.id": client.product_id(PRODUCT_CODE)},
        )

    def test_05_read_item(self, client, flow):
        step(client, "stocklist_flow_read_item", "GET", f"/api/stocklistItems/{flow['item_id']}")

    def test_06_update_item(self, client, flow):
        step(
            client,
            "stocklist_flow_update_item",
            "PUT",
            f"/api/stocklistItems/{flow['item_id']}",
            json={"maxQuantity": 40},
        )

    def test_07_remove_item(self, client, flow):
        resp = step(client, "stocklist_flow_remove_item", "DELETE", f"/api/stocklistItems/{flow['item_id']}")
        assert resp.status_code == 204

    def test_08_update(self, client, flow):
        step(
            client,
            "stocklist_flow_update",
            "PUT",
            f"/api/stocklists/{flow['stocklist_id']}",
            json={"name": "Characterization Test Stocklist (renamed)"},
        )

    def test_09_delete(self, client, flow):
        resp = step(client, "stocklist_flow_delete", "DELETE", f"/api/stocklists/{flow['stocklist_id']}")
        assert resp.status_code == 204
        flow["stocklist_id"] = None


class TestStockMovementFlow:
    """StockMovementApiController + StockMovementItemApiController flow."""

    @pytest.fixture(scope="class")
    def flow(self, client):
        state = {}
        yield state
        if state.get("id"):
            client.request("DELETE", f"/api/stockMovements/{state['id']}")

    def test_01_create(self, client, flow):
        resp = step(client, "stock_movement_flow_create", "POST", "/api/stockMovements", json={
            "name": "",
            "description": "Characterization test movement",
            "origin": {"id": client.location_id("Main Warehouse")},
            "destination": {"id": client.location_id("Boston Office")},
            "requestedBy": {"id": "1"},
            "dateRequested": "07/01/2026",
        }, capture=lambda r: flow.update(id=r.json()["data"]["id"]))
        assert resp.status_code == 201

    def test_02_read(self, client, flow):
        step(client, "stock_movement_flow_read", "GET", f"/api/stockMovements/{flow['id']}")

    def test_03_status(self, client, flow):
        step(client, "stock_movement_flow_status", "GET", f"/api/stockMovements/{flow['id']}/status")

    def test_04_update_items(self, client, flow):
        step(
            client,
            "stock_movement_flow_update_items",
            "POST",
            f"/api/stockMovements/{flow['id']}/updateItems",
            json={
                "id": flow["id"],
                "lineItems": [{
                    "product": {"id": client.product_id(PRODUCT_CODE)},
                    "quantityRequested": "5",
                    "sortOrder": 100,
                }],
            },
            capture=lambda r: flow.update(item_id=r.json()["data"]["lineItems"][0]["id"]),
        )

    def test_04b_item_read(self, client, flow):
        step(client, "stock_movement_flow_item_read", "GET", f"/api/stockMovementItems/{flow['item_id']}")

    def test_04c_item_details(self, client, flow):
        step(client, "stock_movement_flow_item_details", "GET", f"/api/stockMovementItems/{flow['item_id']}/details")

    def test_05_items(self, client, flow):
        step(
            client,
            "stock_movement_flow_items",
            "GET",
            f"/api/stockMovements/{flow['id']}/stockMovementItems",
        )

    def test_06_item_list(self, client, flow):
        step(
            client,
            "stock_movement_flow_item_list",
            "GET",
            "/api/stockMovementItems",
            params={"stockMovement.id": flow["id"]},
        )

    def test_07_documents(self, client, flow):
        step(client, "stock_movement_flow_documents", "GET", f"/api/stockMovements/{flow['id']}/documents")

    def test_08_delete(self, client, flow):
        resp = step(client, "stock_movement_flow_delete", "DELETE", f"/api/stockMovements/{flow['id']}")
        assert resp.status_code in (200, 204)
        flow["id"] = None


class TestProductSupplierFlow:
    """ProductSupplierApiController create/read/update/delete flow."""

    @pytest.fixture(scope="class")
    def flow(self, client):
        state = {}
        yield state
        if state.get("id"):
            client.request("DELETE", f"/api/productSuppliers/{state['id']}")

    def test_01_create(self, client, flow):
        resp = step(client, "product_supplier_flow_create", "POST", "/api/productSuppliers", json={
            "product": {"id": client.product_id(PRODUCT_CODE)},
            "supplier": {"id": "1"},
            "code": "CHARTEST-PS",
            "name": "Characterization Test Product Source",
            "active": True,
        }, capture=lambda r: flow.update(id=r.json()["data"]["id"]))
        assert resp.status_code == 201

    def test_02_read(self, client, flow):
        step(client, "product_supplier_flow_read", "GET", f"/api/productSuppliers/{flow['id']}")

    def test_03_update(self, client, flow):
        step(
            client,
            "product_supplier_flow_update",
            "PUT",
            f"/api/productSuppliers/{flow['id']}",
            json={
                "product": {"id": client.product_id(PRODUCT_CODE)},
                "supplier": {"id": "1"},
                "code": "CHARTEST-PS",
                "name": "Characterization Test Product Source (renamed)",
                "active": True,
            },
        )

    def test_04_delete(self, client, flow):
        resp = step(client, "product_supplier_flow_delete", "DELETE", f"/api/productSuppliers/{flow['id']}")
        assert resp.status_code == 204
        flow["id"] = None
