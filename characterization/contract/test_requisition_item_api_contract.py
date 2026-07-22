"""Contract tests for RequisitionItemApiController (requisition-item-api.yaml).

Uses a dedicated outbound "ZZ Contract ..." stock movement (Main Warehouse ->
Boston Office) with one line item; a stock movement's line items are backed
by requisition items with the same ids. The movement is deleted at the end
of the module.
"""

import pytest

from oas import Spec, check

spec = Spec("requisition-item-api.yaml")
movement_spec = Spec("stock-movement-api.yaml")


@pytest.fixture(scope="module", autouse=True)
def cleanup_leftovers(client, batch14_endpoints):
    listing = client.get_json(
        "/api/stockMovements",
        params={"direction": "OUTBOUND", "origin": client.location_id("Main Warehouse")},
    )["data"]
    for sm in listing:
        if (sm.get("description") or "").startswith("ZZ Contract requisition item"):
            client.request("DELETE", f"/api/stockMovements/{sm['id']}")


@pytest.fixture()
def movement(client):
    resp = check(
        client, movement_spec, "POST", "/api/stockMovements",
        json={
            "name": "",
            "description": "ZZ Contract requisition items",
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


@pytest.fixture()
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


def test_read(client, item):
    resp = check(client, spec, "GET", "/api/requisitionItems/{id}",
                 path=f"/api/requisitionItems/{item}")
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert data["id"] == item
    assert data["quantity"] == 5
    assert "quantityOnHand" in data
    assert "quantityAvailableToPromise" in data


def test_read_unknown(client, batch14_endpoints):
    resp = check(client, spec, "GET", "/api/requisitionItems/{id}",
                 path="/api/requisitionItems/doesnotexist0000")
    assert resp.status_code == 404


def test_change_quantity(client, item):
    resp = check(client, spec, "POST", "/api/requisitionItems/{id}/changeQuantity",
                 path=f"/api/requisitionItems/{item}/changeQuantity",
                 json={"quantity": 3, "reasonCode": "Stock out", "comments": "contract"})
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert data["isChanged"] is True
    assert data["cancelReasonCode"] == "Stock out"


def test_change_quantity_requires_reason(client, item):
    resp = check(client, spec, "POST", "/api/requisitionItems/{id}/changeQuantity",
                 path=f"/api/requisitionItems/{item}/changeQuantity",
                 json={"quantity": 3})
    assert resp.status_code == 400


def test_substitute(client, item):
    substitute = client.product("BF640")
    resp = check(client, spec, "POST", "/api/requisitionItems/{id}/substitute",
                 path=f"/api/requisitionItems/{item}/substitute",
                 json={"productId": substitute["id"], "quantity": 2,
                       "reasonCode": "Substituted", "comments": "contract"})
    assert resp.status_code == 200
    assert resp.json()["data"]["isSubstituted"] is True


def test_substitute_requires_product(client, item):
    resp = check(client, spec, "POST", "/api/requisitionItems/{id}/substitute",
                 path=f"/api/requisitionItems/{item}/substitute",
                 json={"quantity": 2, "reasonCode": "Substituted"})
    assert resp.status_code == 400


def test_cancel(client, item):
    resp = check(client, spec, "POST", "/api/requisitionItems/{id}/cancel",
                 path=f"/api/requisitionItems/{item}/cancel",
                 json={"reasonCode": "Stock out", "comments": "contract"})
    assert resp.status_code == 200
    assert resp.json()["data"]["isCanceled"] is True


def test_cancel_requires_reason(client, item):
    resp = check(client, spec, "POST", "/api/requisitionItems/{id}/cancel",
                 path=f"/api/requisitionItems/{item}/cancel", json={})
    assert resp.status_code == 400


def test_undo_changes(client, item):
    resp = check(client, spec, "POST", "/api/requisitionItems/{id}/changeQuantity",
                 path=f"/api/requisitionItems/{item}/changeQuantity",
                 json={"quantity": 3, "reasonCode": "Stock out", "comments": "contract"})
    assert resp.status_code == 200
    resp = check(client, spec, "POST", "/api/requisitionItems/{id}/undoChanges",
                 path=f"/api/requisitionItems/{item}/undoChanges")
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert data["isChanged"] is False
    assert data["quantityCanceled"] == 0
