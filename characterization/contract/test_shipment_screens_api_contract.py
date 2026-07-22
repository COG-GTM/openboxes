"""Contract tests for the Batch 21 shipment screen endpoints
(openapi/specs/shipment-api.yaml).

Covers the endpoints added for the React migration of the legacy
shipment/addComment, shipment/addDocument, shipment/addToShipment,
shipment/deleteShipment and shipment/editEvent GSP screens. Created
shipments use a ZZ-prefixed name and are deleted afterwards.
"""

import pytest

from oas import Spec, check

spec = Spec("shipment-api.yaml")

TEST_NAME = "ZZ Contract Batch21 Shipment"


@pytest.fixture(scope="module", autouse=True)
def cleanup_leftovers(client, batch21_endpoints):
    resp = client.request("POST", "/api/generic/shipment/search", json={
        "searchAttributes": [
            {"property": "name", "operator": "eq", "value": TEST_NAME}]})
    for shipment in resp.json()["data"]:
        client.request("DELETE", f"/api/shipments/{shipment['id']}")


@pytest.fixture(scope="module")
def options(client):
    return client.get_json("/api/shipments/wizardOptions")["data"]


@pytest.fixture()
def shipment_id(client, options):
    resp = client.request("POST", "/api/shipments", json={
        "name": TEST_NAME,
        "shipmentTypeId": options["shipmentTypes"][0]["id"],
        "originId": client.location_id("Main Warehouse"),
        "destinationId": client.location_id("Boston Office"),
        "expectedShippingDate": "2026-08-01",
    })
    assert resp.status_code == 201
    shipment_id = resp.json()["data"]["id"]
    yield shipment_id
    client.request("DELETE", f"/api/shipments/{shipment_id}")


def _inventory_item_id(client):
    product_id = client.product_id("BF640")
    resp = client.request("POST", "/api/generic/inventoryItem/search", json={
        "searchAttributes": [
            {"property": "product.id", "operator": "eq", "value": product_id}]})
    items = resp.json()["data"]
    assert items, "expected seeded inventory items for BF640"
    return items[0]["id"]


def test_document_types(client, batch21_endpoints):
    resp = check(client, spec, "GET", "/api/shipments/documentTypes",
                 path="/api/shipments/documentTypes")
    assert resp.status_code == 200
    assert resp.json()["data"], "expected seeded document types"


def test_event_options(client, batch21_endpoints):
    resp = check(client, spec, "GET", "/api/shipments/eventOptions",
                 path="/api/shipments/eventOptions")
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert data["eventTypes"], "expected seeded event types"
    assert data["locations"], "expected seeded locations"


def test_create_comment(client, shipment_id):
    resp = check(client, spec, "POST", "/api/shipments/{id}/comments",
                 path=f"/api/shipments/{shipment_id}/comments",
                 json={"comment": "ZZ contract comment"})
    assert resp.status_code == 201
    data = resp.json()["data"]
    assert data["comment"] == "ZZ contract comment"
    assert data["sender"]


def test_create_comment_empty_is_400(client, shipment_id):
    resp = check(client, spec, "POST", "/api/shipments/{id}/comments",
                 path=f"/api/shipments/{shipment_id}/comments",
                 json={"comment": ""})
    assert resp.status_code == 400


def test_create_comment_unknown_shipment(client, batch21_endpoints):
    resp = check(client, spec, "POST", "/api/shipments/{id}/comments",
                 path="/api/shipments/doesnotexist0000/comments",
                 json={"comment": "ZZ"})
    assert resp.status_code == 404


def test_upload_document_uri(client, shipment_id):
    resp = check(client, spec, "POST", "/api/shipments/{id}/documents",
                 path=f"/api/shipments/{shipment_id}/documents",
                 data={"fileUri": "https://example.com/zz-contract-doc",
                       "name": "ZZ contract document"})
    assert resp.status_code == 201
    data = resp.json()["data"]
    assert data["name"] == "ZZ contract document"
    assert data["fileUri"] == "https://example.com/zz-contract-doc"


def test_upload_document_file(client, shipment_id):
    resp = check(client, spec, "POST", "/api/shipments/{id}/documents",
                 path=f"/api/shipments/{shipment_id}/documents",
                 data={"name": "ZZ contract file", "documentNumber": "ZZ-1"},
                 files={"fileContents":
                        ("zz-contract.txt", b"zz contract", "text/plain")})
    assert resp.status_code == 201
    data = resp.json()["data"]
    assert data["filename"] == "zz-contract.txt"
    assert data["documentNumber"] == "ZZ-1"


def test_upload_document_empty_is_400(client, shipment_id):
    resp = check(client, spec, "POST", "/api/shipments/{id}/documents",
                 path=f"/api/shipments/{shipment_id}/documents",
                 data={"name": "ZZ empty"})
    assert resp.status_code == 400


def test_event_lifecycle(client, shipment_id):
    options = client.get_json("/api/shipments/eventOptions")["data"]
    event_type_id = options["eventTypes"][0]["id"]
    location_id = client.location_id("Main Warehouse")

    resp = check(client, spec, "POST", "/api/shipments/{id}/events",
                 path=f"/api/shipments/{shipment_id}/events",
                 json={"eventTypeId": event_type_id,
                       "eventDate": "2026-08-02 10:30",
                       "eventLocationId": location_id})
    assert resp.status_code == 201
    event = resp.json()["data"]
    assert event["eventType"]["id"] == event_type_id
    assert event["eventDate"] == "2026-08-02 10:30"
    event_id = event["id"]

    resp = check(client, spec, "GET", "/api/shipments/{id}/events/{eventId}",
                 path=f"/api/shipments/{shipment_id}/events/{event_id}")
    assert resp.status_code == 200
    assert resp.json()["data"]["id"] == event_id

    # the event type is immutable once set, like the legacy editEvent screen
    resp = check(client, spec, "POST", "/api/shipments/{id}/events/{eventId}",
                 path=f"/api/shipments/{shipment_id}/events/{event_id}",
                 json={"eventTypeId": options["eventTypes"][-1]["id"],
                       "eventDate": "2026-08-03 08:00"})
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert data["eventType"]["id"] == event_type_id
    assert data["eventDate"] == "2026-08-03 08:00"

    resp = check(client, spec, "DELETE",
                 "/api/shipments/{id}/events/{eventId}",
                 path=f"/api/shipments/{shipment_id}/events/{event_id}")
    assert resp.status_code == 204

    resp = check(client, spec, "GET", "/api/shipments/{id}/events/{eventId}",
                 path=f"/api/shipments/{shipment_id}/events/{event_id}")
    assert resp.status_code == 404


def test_add_to_shipment_candidates(client, shipment_id):
    product_id = client.product_id("BF640")
    resp = check(client, spec, "GET", "/api/shipments/addToShipmentCandidates",
                 path="/api/shipments/addToShipmentCandidates",
                 params={"product.id": product_id})
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert data["items"], "expected candidate items for BF640"
    # legacy ShipmentService.getPendingShipments joins on events, which
    # excludes freshly created event-less shipments, so the fixture shipment
    # is not guaranteed to be listed; only verify the pending shipment shape
    for pending in data["pendingShipments"]:
        assert pending["id"]
        assert "shipmentNumber" in pending


def test_add_to_shipment(client, shipment_id):
    inventory_item_id = _inventory_item_id(client)

    # quantities of zero are skipped like the legacy addToShipmentPost
    resp = check(client, spec, "POST", "/api/shipments/addToShipment",
                 path="/api/shipments/addToShipment",
                 json={"shipmentId": shipment_id,
                       "items": [{"inventoryItemId": inventory_item_id,
                                  "quantity": 0}]})
    assert resp.status_code == 200
    assert resp.json()["data"]["atLeastOneUpdate"] is False

    resp = check(client, spec, "POST", "/api/shipments/addToShipment",
                 path="/api/shipments/addToShipment",
                 json={"shipmentId": shipment_id,
                       "items": [{"inventoryItemId": inventory_item_id,
                                  "quantity": 2}]})
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert data["atLeastOneUpdate"] is True
    assert data["shipmentId"] == shipment_id


def test_delete_shipment(client, options):
    resp = client.request("POST", "/api/shipments", json={
        "name": TEST_NAME,
        "shipmentTypeId": options["shipmentTypes"][0]["id"],
        "originId": client.location_id("Main Warehouse"),
        "destinationId": client.location_id("Boston Office"),
        "expectedShippingDate": "2026-08-01",
    })
    assert resp.status_code == 201
    shipment_id = resp.json()["data"]["id"]

    resp = check(client, spec, "DELETE", "/api/shipments/{id}",
                 path=f"/api/shipments/{shipment_id}")
    assert resp.status_code == 204

    resp = check(client, spec, "GET", "/api/shipments/{id}",
                 path=f"/api/shipments/{shipment_id}")
    assert resp.status_code == 404


def test_delete_shipment_unknown(client, batch21_endpoints):
    resp = check(client, spec, "DELETE", "/api/shipments/{id}",
                 path="/api/shipments/doesnotexist0000")
    assert resp.status_code == 404
