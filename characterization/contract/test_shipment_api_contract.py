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


# Batch 22: classic shipping screens (shipment/list, showDetails,
# showPackingList, receiveShipment, sendShipment, shipmentItem/create)


def test_list_options(client, batch22_endpoints):
    resp = check(client, spec, "GET", "/api/shipments/listOptions",
                 path="/api/shipments/listOptions")
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert data["shipmentTypes"], "expected seeded shipment types"
    assert "PENDING" in data["statusCodes"]
    assert data["locations"], "expected seeded locations"


def test_list_shipments(client, batch22_endpoints, shipment_id):
    resp = check(client, spec, "GET", "/api/shipments",
                 path="/api/shipments", params={"type": "incoming"})
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert data["incoming"] is True
    rows = [s for s in data["shipments"] if s["id"] == shipment_id]
    assert rows, "expected the contract shipment inbound to Main Warehouse"
    assert rows[0]["shipmentNumber"]


def test_show_details(client, batch22_endpoints, shipment_id):
    resp = check(client, spec, "GET", "/api/shipments/{id}/showDetails",
                 path=f"/api/shipments/{shipment_id}/showDetails")
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert data["id"] == shipment_id
    assert data["wasReceived"] is False
    assert data["shipmentItems"] == []
    assert data["eventTypes"], "expected seeded event types"


def test_packing_list(client, batch22_endpoints, shipment_id):
    resp = check(client, spec, "GET", "/api/shipments/{id}/packingList",
                 path=f"/api/shipments/{shipment_id}/packingList")
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert data["id"] == shipment_id
    assert data["shipmentItems"] == []


def test_add_comment(client, batch22_endpoints, shipment_id):
    resp = check(client, spec, "POST", "/api/shipments/{id}/comments",
                 path=f"/api/shipments/{shipment_id}/comments",
                 json={"comment": "ZZ contract comment"})
    assert resp.status_code == 201

    resp = client.get_json(f"/api/shipments/{shipment_id}/showDetails")
    comments = resp["data"]["comments"]
    assert [c for c in comments if c["comment"] == "ZZ contract comment"]


def test_add_event(client, batch22_endpoints, shipment_id):
    details = client.get_json(f"/api/shipments/{shipment_id}/showDetails")["data"]
    event_type_id = details["eventTypes"][0]["id"]
    resp = check(client, spec, "POST", "/api/shipments/{id}/events",
                 path=f"/api/shipments/{shipment_id}/events",
                 json={"eventTypeId": event_type_id,
                       "eventDate": "2026-07-01 10:00"})
    assert resp.status_code == 201

    details = client.get_json(f"/api/shipments/{shipment_id}/showDetails")["data"]
    assert details["events"], "expected the added event"


def test_receipt_lifecycle(client, batch22_endpoints, options, shipment_id):
    inventory_item_id = _inventory_item_id(client, options, shipment_id)
    resp = client.request("POST", f"/api/shipments/{shipment_id}/items",
                          json={"inventoryItemId": inventory_item_id,
                                "quantity": 3})
    assert resp.status_code == 201

    resp = check(client, spec, "GET", "/api/shipments/{id}/receipt",
                 path=f"/api/shipments/{shipment_id}/receipt")
    assert resp.status_code == 200
    data = resp.json()["data"]
    receipt_items = data["receipt"]["receiptItems"]
    assert len(receipt_items) == 1
    assert receipt_items[0]["quantityShipped"] == 3
    receipt_item_id = receipt_items[0]["id"]

    resp = check(client, spec, "POST", "/api/shipments/{id}/receipt",
                 path=f"/api/shipments/{shipment_id}/receipt",
                 json={"action": "save",
                       "actualDeliveryDate": "2026-07-10 10:00",
                       "receiptItems": [{"id": receipt_item_id,
                                         "quantityReceived": 3}]})
    assert resp.status_code == 200
    assert resp.json()["data"]["received"] is False

    resp = check(client, spec, "POST",
                 "/api/shipments/{id}/receipt/items/{receiptItemId}/split",
                 path=(f"/api/shipments/{shipment_id}/receipt/items/"
                       f"{receipt_item_id}/split"))
    assert resp.status_code == 200

    data = client.get_json(f"/api/shipments/{shipment_id}/receipt")["data"]
    assert len(data["receipt"]["receiptItems"]) == 2
    split_id = [i["id"] for i in data["receipt"]["receiptItems"]
                if i["id"] != receipt_item_id][0]

    resp = check(client, spec, "GET",
                 "/api/shipments/{id}/receipt/items/{receiptItemId}/putawayLocations",
                 path=(f"/api/shipments/{shipment_id}/receipt/items/"
                       f"{receipt_item_id}/putawayLocations"))
    assert resp.status_code == 200

    resp = check(client, spec, "DELETE",
                 "/api/shipments/{id}/receipt/items/{receiptItemId}",
                 path=f"/api/shipments/{shipment_id}/receipt/items/{split_id}")
    assert resp.status_code == 200

    resp = check(client, spec, "DELETE", "/api/shipments/{id}/receipt",
                 path=f"/api/shipments/{shipment_id}/receipt")
    assert resp.status_code == 200


def test_item_create_options(client, batch22_endpoints):
    resp = check(client, spec, "GET", "/api/shipmentItems/createOptions",
                 path="/api/shipmentItems/createOptions")
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert data["shipments"], "expected seeded shipments"
    assert data["products"], "expected seeded products"


def test_create_item(client, batch22_endpoints, shipment_id):
    product_id = client.product_id("BF640")
    resp = check(client, spec, "POST", "/api/shipmentItems",
                 path="/api/shipmentItems",
                 json={"shipmentId": shipment_id,
                       "productId": product_id,
                       "quantity": 2})
    assert resp.status_code == 201
    data = resp.json()["data"]
    assert data["quantity"] == 2
    assert data["product"]["id"] == product_id


def test_bulk_action_unknown(client, batch22_endpoints):
    resp = check(client, spec, "POST", "/api/shipments/bulkAction",
                 path="/api/shipments/bulkAction",
                 json={"action": "explode", "shipmentIds": []})
    assert resp.status_code == 400
