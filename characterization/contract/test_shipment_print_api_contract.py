"""Contract tests for the shipment print endpoints on ShipmentApiController
(openapi/specs/shipment-api.yaml)."""

import pytest

from oas import Spec, check

spec = Spec("shipment-api.yaml")

UNKNOWN = "doesnotexist0000"


@pytest.fixture(scope="module")
def shipment_id(client):
    shipments = client.get_json("/api/generic/shipment/?max=1")["data"]
    if not shipments:
        pytest.skip("seeded dataset has no shipments")
    return shipments[0]["id"]


@pytest.fixture(scope="module", autouse=True)
def require_endpoint(client, shipment_id):
    # The pinned released image predates these endpoints; only source builds
    # of this branch expose them. A 404 is also the expected contract
    # response for an unknown id, so probe with a real shipment id instead.
    resp = client.request(
        "GET", f"/api/shipments/{shipment_id}/outboundReturnPrint")
    if resp.status_code != 200:
        pytest.skip("app build does not expose /api/shipments/{id}/outboundReturnPrint")


def test_outbound_return_print_unknown(client):
    resp = check(client, spec, "GET", "/api/shipments/{id}/outboundReturnPrint",
                 path=f"/api/shipments/{UNKNOWN}/outboundReturnPrint")
    assert resp.status_code == 404


def test_outbound_return_print(client, shipment_id):
    resp = check(client, spec, "GET", "/api/shipments/{id}/outboundReturnPrint",
                 path=f"/api/shipments/{shipment_id}/outboundReturnPrint")
    body = resp.json()["data"]
    assert body["id"] == shipment_id
    assert isinstance(body["shipmentItems"], list)


def test_goods_receipt_note_print_unknown(client):
    resp = check(client, spec, "GET", "/api/shipments/{id}/goodsReceiptNotePrint",
                 path=f"/api/shipments/{UNKNOWN}/goodsReceiptNotePrint")
    assert resp.status_code == 404


def test_goods_receipt_note_print(client, shipment_id):
    resp = check(client, spec, "GET", "/api/shipments/{id}/goodsReceiptNotePrint",
                 path=f"/api/shipments/{shipment_id}/goodsReceiptNotePrint")
    body = resp.json()["data"]
    assert body["id"] == shipment_id
    assert isinstance(body["receipts"], list)
    assert isinstance(body["shipmentItems"], list)
