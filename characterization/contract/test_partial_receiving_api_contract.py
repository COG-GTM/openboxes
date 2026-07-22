"""Contract tests for PartialReceivingApiController
(openapi/specs/partial-receiving-api.yaml).

The demo dataset has no shipments, so the flow creates a dedicated ZZ-named
inbound shipment via the generic API (partial receipts are built on the fly
from any shipment) and deletes it - plus the receiving bin location that
saving a partial receipt creates - afterwards. The update flow rolls the
pending receipt back before cleanup so the shipment can be deleted.
"""

import pytest

from oas import Spec, check

spec = Spec("partial-receiving-api.yaml")

TEST_NAME = "ZZ Contract Shipment"
TEST_SHIPMENT_NUMBER = "ZZCONTRACTPR1"

IMPORT_HEADER = (
    "Receipt item id,Shipment item id,Code,Name,Lot/Serial No.,"
    "Expiration date,Bin Location,Recipient,Shipped (each),Received,"
    "To receive,Receiving now (each),Comment\n"
)


def delete_shipment_fixtures(client):
    for shipment in client.get_json("/api/generic/shipment")["data"]:
        if shipment.get("name") == TEST_NAME:
            client.request("POST", f"/api/partialReceiving/{shipment['id']}",
                           json={"receiptStatus": "ROLLBACK", "containers": []})
            client.request("DELETE", f"/api/generic/shipment/{shipment['id']}")
    for location in client.get_json("/api/generic/location",
                                    params={"max": "1000"})["data"]:
        if TEST_SHIPMENT_NUMBER in (location.get("name") or ""):
            client.request("DELETE", f"/api/generic/location/{location['id']}")


@pytest.fixture(scope="module", autouse=True)
def cleanup_leftovers(client):
    delete_shipment_fixtures(client)


@pytest.fixture(scope="module")
def shipment_id(client):
    resp = client.request("POST", "/api/generic/shipment", json={
        "name": TEST_NAME,
        "shipmentNumber": TEST_SHIPMENT_NUMBER,
        "origin": {"id": client.location_id("Main Supplier")},
        "destination": {"id": client.location_id("Main Warehouse")},
        "expectedShippingDate": "07/01/2026",
        "shipmentType": {"id": "1"},
    })
    assert resp.status_code == 201
    yield resp.json()["data"]["id"]
    delete_shipment_fixtures(client)


def test_list(client):
    resp = check(client, spec, "GET", "/api/partialReceiving")
    assert resp.json() == {"data": []}


def test_read(client, shipment_id):
    resp = check(client, spec, "GET", "/api/partialReceiving/{id}",
                 path=f"/api/partialReceiving/{shipment_id}",
                 params={"stepNumber": "1"})
    assert resp.json()["data"]["shipmentId"] == shipment_id


def test_read_unknown(client):
    resp = check(client, spec, "GET", "/api/partialReceiving/{id}",
                 path="/api/partialReceiving/doesnotexist0000")
    assert resp.status_code == 500


def test_export_csv(client, shipment_id):
    resp = check(client, spec, "POST", "/api/partialReceiving/exportCsv/{id}",
                 path=f"/api/partialReceiving/exportCsv/{shipment_id}",
                 json={"containers": []})
    assert "attachment" in resp.headers.get("Content-disposition", "")


def test_update_import_rollback(client, shipment_id):
    # Save a pending receipt (creates the R-<shipmentNumber> receiving bin).
    resp = check(client, spec, "POST", "/api/partialReceiving/{id}",
                 path=f"/api/partialReceiving/{shipment_id}",
                 json={"receiptStatus": "PENDING", "containers": []})
    assert resp.json()["data"]["receiptId"]

    # Import a template with no data rows against the pending receipt.
    resp = check(client, spec, "POST", "/api/partialReceiving/importCsv/{id}",
                 path=f"/api/partialReceiving/importCsv/{shipment_id}",
                 files={"importFile": ("import.csv", IMPORT_HEADER, "text/csv")})
    assert resp.status_code == 200

    # Roll the pending receipt back so the shipment can be deleted.
    resp = check(client, spec, "POST", "/api/partialReceiving/{id}",
                 path=f"/api/partialReceiving/{shipment_id}",
                 json={"receiptStatus": "ROLLBACK", "containers": []})
    assert resp.json()["data"]["receiptId"] is None


def test_import_csv_unknown(client):
    resp = check(client, spec, "POST", "/api/partialReceiving/importCsv/{id}",
                 path="/api/partialReceiving/importCsv/doesnotexist0000",
                 files={"importFile": ("import.csv", IMPORT_HEADER, "text/csv")})
    assert resp.status_code == 500
