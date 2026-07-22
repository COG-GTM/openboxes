"""Contract tests for the Batch 15 requisition screen endpoints
(openapi/specs/requisition-api.yaml): list, edit, header, items, pick,
picklist and picklistItems. Created requisitions use a ZZ-prefixed
description and are deleted afterwards via the stock movement API.
"""

import pytest

from oas import Spec, check

spec = Spec("requisition-api.yaml")

TEST_DESCRIPTION = "ZZ Contract Requisition Screens"
PRODUCT_CODE = "AX738"  # seeded demo product used across the contract suites


@pytest.fixture(scope="module", autouse=True)
def cleanup_leftovers(client, batch15_endpoints):
    for req in client.get_json("/api/generic/requisition")["data"]:
        if (req.get("description") or "") == TEST_DESCRIPTION:
            client.request("DELETE", f"/api/stockMovements/{req['id']}")


@pytest.fixture()
def requisition_id(client):
    resp = client.request("POST", "/api/requisitions", json={
        "type": "ADHOC",
        "destinationId": client.location_id("Boston Office"),
        "requestedById": "1",
        "commodityClass": "CONSUMABLES",
        "dateRequested": "2026-07-01",
        "description": TEST_DESCRIPTION,
    })
    assert resp.status_code == 201
    requisition_id = resp.json()["data"]["id"]
    yield requisition_id
    client.request("DELETE", f"/api/stockMovements/{requisition_id}")


def test_list_requisitions(client, requisition_id):
    resp = check(client, spec, "GET", "/api/requisitions",
                 path="/api/requisitions")
    assert resp.status_code == 200
    body = resp.json()
    assert isinstance(body["data"], list)
    assert isinstance(body["statistics"], dict)
    assert "ALL" in body["statistics"]


def test_list_requisitions_status_filter(client, requisition_id):
    resp = check(client, spec, "GET", "/api/requisitions",
                 path="/api/requisitions", params={"status": "CREATED"})
    assert resp.status_code == 200
    for row in resp.json()["data"]:
        assert row["status"] == "CREATED"


def test_create_requisition_with_items(client):
    product_id = client.product_id(PRODUCT_CODE)
    resp = check(client, spec, "POST", "/api/requisitions",
                 path="/api/requisitions", json={
                     "type": "STOCK",
                     "destinationId": client.location_id("Boston Office"),
                     "requestedById": "1",
                     "dateRequested": "2026-07-01",
                     "description": TEST_DESCRIPTION,
                     "requisitionItems": [
                         {"productId": product_id, "quantity": 5},
                     ],
                 })
    assert resp.status_code == 201
    requisition_id = resp.json()["data"]["id"]
    details = client.get_json(f"/api/requisitions/{requisition_id}")["data"]
    assert len(details["requisitionItems"]) == 1
    assert details["requisitionItems"][0]["quantity"] == 5
    client.request("DELETE", f"/api/stockMovements/{requisition_id}")


def test_edit_requisition(client, requisition_id):
    resp = check(client, spec, "POST", "/api/requisitions/{id}/edit",
                 path=f"/api/requisitions/{requisition_id}/edit")
    assert resp.status_code == 200
    assert resp.json()["data"]["status"] == "EDITING"


def test_edit_requisition_unknown(client):
    resp = check(client, spec, "POST", "/api/requisitions/{id}/edit",
                 path="/api/requisitions/doesnotexist0000/edit")
    assert resp.status_code == 404


def test_update_header(client, requisition_id):
    resp = check(client, spec, "POST", "/api/requisitions/{id}/header",
                 path=f"/api/requisitions/{requisition_id}/header", json={
                     "description": "ZZ Contract Requisition Screens",
                     "dateRequested": "2026-07-03",
                     "verifiedById": "1",
                 })
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert data["dateRequested"] == "2026-07-03"
    assert data["verifiedBy"]["id"] == "1"


def test_save_items(client, requisition_id):
    product_id = client.product_id(PRODUCT_CODE)
    resp = check(client, spec, "POST", "/api/requisitions/{id}/items",
                 path=f"/api/requisitions/{requisition_id}/items", json={
                     "requisitionItems": [
                         {"productId": product_id, "quantity": 3},
                     ],
                 })
    assert resp.status_code == 200
    items = resp.json()["data"]["requisitionItems"]
    assert len(items) == 1
    assert items[0]["quantity"] == 3
    # Posting an empty list removes the item again
    resp = check(client, spec, "POST", "/api/requisitions/{id}/items",
                 path=f"/api/requisitions/{requisition_id}/items",
                 json={"requisitionItems": []})
    assert resp.status_code == 200
    assert resp.json()["data"]["requisitionItems"] == []


def test_pick_requires_verified_by(client, requisition_id):
    resp = check(client, spec, "POST", "/api/requisitions/{id}/pick",
                 path=f"/api/requisitions/{requisition_id}/pick")
    assert resp.status_code == 400


def test_pick_and_picklist(client, requisition_id):
    product_id = client.product_id(PRODUCT_CODE)
    resp = client.request("POST", f"/api/requisitions/{requisition_id}/items", json={
        "requisitionItems": [{"productId": product_id, "quantity": 2}],
    })
    assert resp.status_code == 200
    resp = client.request("POST", f"/api/requisitions/{requisition_id}/header",
                          json={"verifiedById": "1"})
    assert resp.status_code == 200

    resp = check(client, spec, "POST", "/api/requisitions/{id}/pick",
                 path=f"/api/requisitions/{requisition_id}/pick")
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert data["status"] == "PICKING"
    assert data["picklist"]["id"]
    assert product_id in data["availableItems"]

    resp = check(client, spec, "POST", "/api/requisitions/{id}/picklist",
                 path=f"/api/requisitions/{requisition_id}/picklist", json={
                     "pickerId": "1",
                     "datePicked": "2026-07-04",
                 })
    assert resp.status_code == 200
    picklist = resp.json()["data"]
    assert picklist["picker"]["id"] == "1"
    assert picklist["datePicked"] == "2026-07-04"

    available = data["availableItems"][product_id]
    requisition_item_id = data["requisitionItems"][0]["id"]
    if available:
        resp = check(client, spec, "POST", "/api/requisitions/{id}/picklistItems",
                     path=f"/api/requisitions/{requisition_id}/picklistItems", json={
                         "requisitionItemId": requisition_item_id,
                         "picklistItems": [{
                             "inventoryItemId": available[0]["inventoryItemId"],
                             "binLocationId": (available[0]["binLocation"] or {}).get("id"),
                             "quantity": 1,
                         }],
                     })
        assert resp.status_code == 200
        items = resp.json()["data"]["requisitionItems"]
        assert items[0]["picklistItems"][0]["quantity"] == 1


def test_update_picklist_unknown(client):
    resp = check(client, spec, "POST", "/api/requisitions/{id}/picklist",
                 path="/api/requisitions/doesnotexist0000/picklist", json={})
    assert resp.status_code == 404
