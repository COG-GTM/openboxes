"""Contract tests for ShipmentApiController (openapi/specs/shipment-api.yaml).

Covers the create-shipment wizard endpoints added for the React migration of
the legacy createShipmentWorkflow webflow screens. Created shipments use a
ZZ-prefixed name and are deleted afterwards via the generic API.
"""

import pytest

from oas import Spec, check

spec = Spec("shipment-api.yaml")

TEST_NAME = "ZZ Contract Shipment"
CONTAINER_NAME = "ZZ Contract Pallet"


def _delete_shipment(client, shipment_id):
    packing = client.get_json(f"/api/shipments/{shipment_id}/packing")["data"]
    for item in packing["unpackedItems"]:
        client.request("DELETE",
                       f"/api/shipments/{shipment_id}/items/{item['id']}")
    for container in packing["containers"]:
        client.request(
            "DELETE",
            f"/api/shipments/{shipment_id}/containers/{container['id']}",
            params={"deleteItems": "true"})
    client.request("DELETE", f"/api/generic/shipment/{shipment_id}")


@pytest.fixture(scope="module", autouse=True)
def cleanup_leftovers(client, batch19_endpoints):
    resp = client.request("POST", "/api/generic/shipment/search", json={
        "searchAttributes": [
            {"property": "name", "operator": "eq", "value": TEST_NAME}]})
    for shipment in resp.json()["data"]:
        _delete_shipment(client, shipment["id"])


@pytest.fixture(scope="module")
def options(client):
    return client.get_json("/api/shipments/wizardOptions")["data"]


@pytest.fixture()
def shipment_id(client, options):
    resp = client.request("POST", "/api/shipments", json={
        "name": TEST_NAME,
        "shipmentTypeId": options["shipmentTypes"][0]["id"],
        # a supplier origin, like the legacy inbound wizard, so items can be
        # added without outbound quantity validation against the picklist
        "originId": client.location_id("Main Supplier"),
        "destinationId": client.location_id("Main Warehouse"),
        "expectedShippingDate": "2026-07-01",
    })
    assert resp.status_code == 201
    shipment_id = resp.json()["data"]["id"]
    yield shipment_id
    _delete_shipment(client, shipment_id)


def _inventory_item_id(client, options, shipment_id):
    product_id = client.product_id("BF640")
    resp = client.request("POST", "/api/generic/inventoryItem/search", json={
        "searchAttributes": [
            {"property": "product.id", "operator": "eq", "value": product_id}]})
    items = resp.json()["data"]
    assert items, "expected seeded inventory items for BF640"
    return items[0]["id"]


def test_wizard_options(client, options):
    resp = check(client, spec, "GET", "/api/shipments/wizardOptions",
                 path="/api/shipments/wizardOptions")
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert data["shipmentTypes"], "expected seeded shipment types"
    assert data["origins"], "expected shipment origins"
    assert data["destinations"], "expected shipment destinations"
    assert data["containerTypes"], "expected seeded container types"


def test_create_shipment(client, options):
    resp = check(client, spec, "POST", "/api/shipments",
                 path="/api/shipments", json={
                     "name": TEST_NAME,
                     "shipmentTypeId": options["shipmentTypes"][0]["id"],
                     "originId": client.location_id("Main Supplier"),
                     "destinationId": client.location_id("Main Warehouse"),
                     "expectedShippingDate": "2026-07-01",
                 })
    assert resp.status_code == 201
    data = resp.json()["data"]
    assert data["name"] == TEST_NAME
    assert data["shipmentNumber"]
    _delete_shipment(client, data["id"])


def test_create_shipment_invalid(client, options):
    resp = check(client, spec, "POST", "/api/shipments",
                 path="/api/shipments", json={"name": TEST_NAME})
    assert resp.status_code == 400


def test_read_shipment(client, shipment_id):
    resp = check(client, spec, "GET", "/api/shipments/{id}",
                 path=f"/api/shipments/{shipment_id}")
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert data["id"] == shipment_id
    assert data["hasShipped"] is False


def test_read_shipment_unknown(client):
    resp = check(client, spec, "GET", "/api/shipments/{id}",
                 path="/api/shipments/doesnotexist0000")
    assert resp.status_code == 404


def test_save_details(client, shipment_id):
    resp = check(client, spec, "POST", "/api/shipments/{id}/details",
                 path=f"/api/shipments/{shipment_id}/details",
                 json={"expectedDeliveryDate": "2026-07-15"})
    assert resp.status_code == 200
    assert resp.json()["data"]["expectedDeliveryDate"] == "2026-07-15"


def test_save_tracking(client, shipment_id):
    resp = check(client, spec, "POST", "/api/shipments/{id}/tracking",
                 path=f"/api/shipments/{shipment_id}/tracking",
                 json={"statedValue": 123.45,
                       "additionalInformation": "ZZ contract tracking"})
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert data["additionalInformation"] == "ZZ contract tracking"


def test_packing_and_containers(client, options, shipment_id):
    resp = check(client, spec, "POST", "/api/shipments/{id}/containers",
                 path=f"/api/shipments/{shipment_id}/containers",
                 json={"containerTypeId": options["containerTypes"][0]["id"],
                       "containerText": CONTAINER_NAME})
    assert resp.status_code == 201

    resp = check(client, spec, "GET", "/api/shipments/{id}/packing",
                 path=f"/api/shipments/{shipment_id}/packing")
    assert resp.status_code == 200
    containers = resp.json()["data"]["containers"]
    assert [c for c in containers if c["name"] == CONTAINER_NAME]

    container_id = containers[0]["id"]
    resp = check(client, spec, "DELETE",
                 "/api/shipments/{id}/containers/{containerId}",
                 path=f"/api/shipments/{shipment_id}/containers/{container_id}",
                 params={"deleteItems": "true"})
    assert resp.status_code == 200


def test_items_and_picklist(client, options, shipment_id):
    inventory_item_id = _inventory_item_id(client, options, shipment_id)
    resp = check(client, spec, "POST", "/api/shipments/{id}/items",
                 path=f"/api/shipments/{shipment_id}/items",
                 json={"inventoryItemId": inventory_item_id, "quantity": 1})
    assert resp.status_code == 201

    resp = check(client, spec, "GET", "/api/shipments/{id}/picklist",
                 path=f"/api/shipments/{shipment_id}/picklist")
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert len(data["shipmentItems"]) == 1
    item_id = data["shipmentItems"][0]["id"]

    resp = check(client, spec, "POST", "/api/shipments/{id}/items/{itemId}",
                 path=f"/api/shipments/{shipment_id}/items/{item_id}",
                 json={"quantity": 2})
    assert resp.status_code == 200
    assert resp.json()["data"]["quantity"] == 2

    resp = check(client, spec, "POST",
                 "/api/shipments/{id}/items/{itemId}/pick",
                 path=f"/api/shipments/{shipment_id}/items/{item_id}/pick",
                 json={"inventoryItemId": inventory_item_id, "quantity": 2})
    assert resp.status_code == 200

    resp = check(client, spec, "POST",
                 "/api/shipments/{id}/items/{itemId}/split",
                 path=f"/api/shipments/{shipment_id}/items/{item_id}/split")
    assert resp.status_code == 200
    split_item_id = resp.json()["data"]["id"]
    assert resp.json()["data"]["quantity"] == 0

    resp = check(client, spec, "POST", "/api/shipments/{id}/validatePicklist",
                 path=f"/api/shipments/{shipment_id}/validatePicklist")
    assert resp.status_code == 200

    resp = check(client, spec, "DELETE", "/api/shipments/{id}/items/{itemId}",
                 path=f"/api/shipments/{shipment_id}/items/{split_item_id}")
    assert resp.status_code == 200

    resp = check(client, spec, "POST", "/api/shipments/{id}/clearPicklist",
                 path=f"/api/shipments/{shipment_id}/clearPicklist")
    assert resp.status_code == 200


def test_send_unknown(client):
    resp = check(client, spec, "POST", "/api/shipments/{id}/send",
                 path="/api/shipments/doesnotexist0000/send", json={})
    assert resp.status_code == 404
