"""Contract tests for StockMovementApiController (stock-movement-api.yaml).

The write flow creates an outbound "ZZ Contract ..." movement from Main
Warehouse to Boston Office and deletes it at the end of the module.
"""

import pytest

from oas import Spec, check

spec = Spec("stock-movement-api.yaml")

DESCRIPTION = "ZZ Contract stock movement"


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
        client, spec, "POST", "/api/stockMovements",
        json={
            "name": "",
            "description": DESCRIPTION,
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


def test_create(client, movement):
    assert movement


def test_list_outbound(client, movement):
    main = client.location_id("Main Warehouse")
    resp = check(
        client, spec, "GET", "/api/stockMovements",
        params={"direction": "OUTBOUND", "origin": main},
    )
    descriptions = [sm.get("description") for sm in resp.json()["data"]]
    assert DESCRIPTION in descriptions


def test_list_without_direction_is_400(client):
    resp = check(client, spec, "GET", "/api/stockMovements")
    assert resp.status_code == 400
    assert resp.json()["errorMessages"] == [
        "Direction parameter is required. Origin and destination cannot be the same."
    ]


def test_list_csv(client):
    main = client.location_id("Main Warehouse")
    resp = check(
        client, spec, "GET", "/api/stockMovements",
        params={"direction": "OUTBOUND", "origin": main, "format": "csv"},
    )
    assert resp.status_code == 200


def test_read(client, movement):
    resp = check(client, spec, "GET", "/api/stockMovements/{id}", path=f"/api/stockMovements/{movement}")
    body = resp.json()
    assert body["data"]["id"] == movement
    assert "totalCount" in body


def test_read_unknown_is_404(client):
    resp = check(
        client, spec, "GET", "/api/stockMovements/{id}",
        path="/api/stockMovements/zz-contract-missing",
    )
    assert resp.status_code == 404


def test_status(client, movement):
    resp = check(
        client, spec, "GET", "/api/stockMovements/{id}/status",
        path=f"/api/stockMovements/{movement}/status",
    )
    assert resp.json()["data"] == "CREATED"


def test_update_items(client, movement):
    product = client.product("AX738")
    resp = check(
        client, spec, "POST", "/api/stockMovements/{id}/updateItems",
        path=f"/api/stockMovements/{movement}/updateItems",
        json={
            "id": movement,
            "lineItems": [
                {"product": {"id": product["id"]}, "quantityRequested": "5", "sortOrder": 100},
            ],
        },
    )
    assert resp.json()["data"]["lineItems"]


def test_update_requisition_redirects_to_read(client, movement):
    resp = check(
        client, spec, "POST", "/api/stockMovements/{id}/updateRequisition",
        path=f"/api/stockMovements/{movement}/updateRequisition",
        json={"description": DESCRIPTION},
        allow_redirects=False,
    )
    assert resp.status_code == 302
    assert f"/stockMovementApi/read/{movement}" in resp.headers["Location"]


def test_update_shipment(client, movement):
    resp = check(
        client, spec, "POST", "/api/stockMovements/{id}/updateShipment",
        path=f"/api/stockMovements/{movement}/updateShipment",
        json={},
    )
    assert resp.status_code == 200
    assert not resp.content


def test_status_delete_redirects_to_read(client, movement):
    resp = check(
        client, spec, "DELETE", "/api/stockMovements/{id}/status",
        path=f"/api/stockMovements/{movement}/status",
        allow_redirects=False,
    )
    assert resp.status_code == 302


def test_create_pick_list(client, movement):
    resp = check(
        client, spec, "GET", "/api/stockMovements/createPickList/{id}",
        path=f"/api/stockMovements/createPickList/{movement}",
    )
    assert resp.status_code == 200
    assert not resp.content


def test_validate_picklist(client, movement):
    resp = check(
        client, spec, "GET", "/api/stockMovements/{id}/validatePicklist",
        path=f"/api/stockMovements/{movement}/validatePicklist",
    )
    assert resp.status_code == 200


def test_documents(client, movement):
    resp = check(
        client, spec, "GET", "/api/stockMovements/{id}/documents",
        path=f"/api/stockMovements/{movement}/documents",
    )
    names = [doc["name"] for doc in resp.json()["data"]]
    assert "Print Picklist" in names


def test_rollback_approval_failure_is_500_with_ad_hoc_body(client, movement):
    resp = check(
        client, spec, "PUT", "/api/stockMovements/{id}/rollbackApproval",
        path=f"/api/stockMovements/{movement}/rollbackApproval",
    )
    assert resp.status_code == 500
    assert "Unable to rollback approval" in resp.json()["errorMessage"]


def test_remove_all_items(client, movement):
    resp = check(
        client, spec, "DELETE", "/api/stockMovements/{id}/removeAllItems",
        path=f"/api/stockMovements/{movement}/removeAllItems",
    )
    assert resp.status_code == 204


def test_delete(client, movement):
    resp = check(client, spec, "DELETE", "/api/stockMovements/{id}", path=f"/api/stockMovements/{movement}")
    assert resp.status_code == 204


def test_delete_unknown_is_404(client):
    resp = check(
        client, spec, "DELETE", "/api/stockMovements/{id}",
        path="/api/stockMovements/zz-contract-missing",
    )
    assert resp.status_code == 404


def test_pending_requisition_details(client):
    main = client.location_id("Main Warehouse")
    product = client.product("AX738")
    resp = check(
        client, spec, "GET", "/api/stockMovements/pendingRequisitionDetails",
        params={"origin.id": main, "product.id": product["id"]},
    )
    assert isinstance(resp.json()["data"], list)


def test_requisition_status_codes(client):
    resp = check(client, spec, "GET", "/api/stockMovements/requisitionsStatusCodes")
    ids = [option["id"] for option in resp.json()["data"]]
    assert "CREATED" in ids


def test_shipped_items_without_destination_is_400(client):
    resp = check(client, spec, "GET", "/api/stockMovements/shippedItems")
    assert resp.status_code == 400
    assert resp.json()["errorMessages"] == ["Destination parameter cannot be the empty"]


def test_shipped_items_no_data_is_404(client):
    boston = client.location_id("Boston Office")
    resp = check(
        client, spec, "GET", "/api/stockMovements/shippedItems",
        params={"destination": boston},
    )
    assert resp.status_code == 404
    assert resp.json() == {"errorMessage": "No shipment items found"}


def test_pending_requisition_items_no_data_is_404(client):
    main = client.location_id("Main Warehouse")
    resp = check(
        client, spec, "GET", "/api/stockMovements/pendingRequisitionItems",
        params={"origin": main},
    )
    assert resp.status_code == 404
    assert resp.json() == {"errorMessage": "No pending requisition items found"}


def test_packing_list_template_missing_in_baseline_is_404(client):
    resp = check(client, spec, "GET", "/api/stockMovements/packingList/template")
    assert resp.status_code == 404
