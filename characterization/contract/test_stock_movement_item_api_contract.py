"""Contract tests for StockMovementItemApiController (stock-movement-item-api.yaml).

Uses a dedicated outbound "ZZ Contract ..." movement (Main Warehouse ->
Boston Office) with one line item; the movement is deleted at the end of the
module.
"""

import pytest

from oas import Spec, check

spec = Spec("stock-movement-item-api.yaml")
movement_spec = Spec("stock-movement-api.yaml")


@pytest.fixture(scope="module", autouse=True)
def cleanup_leftovers(client):
    listing = client.get_json(
        "/api/stockMovements",
        params={"direction": "OUTBOUND", "origin": client.location_id("Main Warehouse")},
    )["data"]
    for sm in listing:
        if (sm.get("description") or "").startswith("ZZ Contract"):
            client.request("DELETE", f"/api/stockMovements/{sm['id']}")


@pytest.fixture(scope="module")
def movement(client):
    resp = check(
        client, movement_spec, "POST", "/api/stockMovements",
        json={
            "name": "",
            "description": "ZZ Contract stock movement items",
            "origin": {"id": client.location_id("Main Warehouse")},
            "destination": {"id": client.location_id("Boston Office")},
            "requestedBy": {"id": "1"},
            "dateRequested": "07/20/2026",
        },
    )
    assert resp.status_code == 201
    movement_id = resp.json()["data"]["id"]
    yield movement_id
    client.request("DELETE", f"/api/stockMovements/{movement_id}")


@pytest.fixture(scope="module")
def item(client, movement):
    product = client.product("AX738")
    resp = check(
        client, movement_spec, "POST", "/api/stockMovements/{id}/updateItems",
        path=f"/api/stockMovements/{movement}/updateItems",
        json={
            "id": movement,
            "lineItems": [
                {"product": {"id": product["id"]}, "quantityRequested": "5", "sortOrder": 100},
            ],
        },
    )
    return resp.json()["data"]["lineItems"][0]["id"]


def test_list(client, movement, item):
    resp = check(
        client, spec, "GET", "/api/stockMovementItems",
        params={"stockMovement.id": movement},
    )
    assert item in [row["id"] for row in resp.json()["data"]]


def test_list_without_stock_movement_id_is_404(client):
    resp = check(client, spec, "GET", "/api/stockMovementItems")
    assert resp.status_code == 404


def test_read(client, item):
    resp = check(
        client, spec, "GET", "/api/stockMovementItems/{id}",
        path=f"/api/stockMovementItems/{item}",
    )
    body = resp.json()["data"]
    assert body["id"] == item
    assert body["productCode"] == "AX738"


def test_details(client, item):
    resp = check(
        client, spec, "GET", "/api/stockMovementItems/{id}/details",
        path=f"/api/stockMovementItems/{item}/details",
    )
    assert resp.json()["data"]["id"] == item


def test_get_stock_movement_items(client, movement, item):
    resp = check(
        client, spec, "GET", "/api/stockMovements/{id}/stockMovementItems",
        path=f"/api/stockMovements/{movement}/stockMovementItems",
    )
    assert item in [row["id"] for row in resp.json()["data"]]


def test_substitution_items(client, item):
    resp = check(
        client, spec, "GET", "/api/stockMovements/{id}/substitutionItems",
        path=f"/api/stockMovements/{item}/substitutionItems",
    )
    assert resp.json()["data"] == []


def test_create_picklist(client, item):
    resp = check(
        client, spec, "POST", "/api/stockMovementItems/{id}/createPicklist",
        path=f"/api/stockMovementItems/{item}/createPicklist",
    )
    assert resp.status_code == 200
    assert not resp.content


def test_revert_pick(client, item):
    resp = check(
        client, spec, "DELETE", "/api/stockMovementItems/{id}/picklistItems",
        path=f"/api/stockMovementItems/{item}/picklistItems",
    )
    assert resp.status_code == 204


def test_clear_picklist(client, item):
    resp = check(
        client, spec, "POST", "/api/stockMovementItems/{id}/clearPicklist",
        path=f"/api/stockMovementItems/{item}/clearPicklist",
    )
    assert resp.status_code == 200


def test_update_picklist_without_picklist_items_is_500(client, item):
    resp = check(
        client, spec, "POST", "/api/stockMovementItems/{id}/updatePicklist",
        path=f"/api/stockMovementItems/{item}/updatePicklist",
        json={},
    )
    assert resp.status_code == 500


def test_cancel_item_without_reason_code_is_400(client, item):
    resp = check(
        client, spec, "POST", "/api/stockMovementItems/{id}/cancelItem",
        path=f"/api/stockMovementItems/{item}/cancelItem",
    )
    assert resp.status_code == 400
    assert "cancelReasonCode" in resp.json()["errorMessage"]


def test_erase_item(client, item):
    resp = check(
        client, spec, "DELETE", "/api/stockMovementItems/{id}/removeItem",
        path=f"/api/stockMovementItems/{item}/removeItem",
    )
    assert resp.status_code == 204


def test_read_unknown_is_200_with_null_data(client):
    resp = check(
        client, spec, "GET", "/api/stockMovementItems/{id}",
        path="/api/stockMovementItems/zz-contract-missing",
    )
    assert resp.status_code == 200
    assert resp.json() == {"data": None}
