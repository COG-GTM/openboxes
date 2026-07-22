"""Contract tests for ShipmentItemApiController
(openapi/specs/shipment-item-api.yaml)."""

import pytest

from oas import Spec, check

spec = Spec("shipment-item-api.yaml")

UNKNOWN = "doesnotexist0000"


@pytest.fixture(scope="module", autouse=True)
def require_endpoint(client):
    # The pinned released image predates this endpoint; only source builds
    # of this branch expose it.
    if client.request("GET", "/api/shipmentItems").status_code != 200:
        pytest.skip("app build does not expose /api/shipmentItems")


@pytest.fixture(scope="module")
def any_item_id(client):
    data = client.get_json("/api/shipmentItems?max=1")["data"]
    if not data:
        pytest.skip("no shipment items seeded")
    return data[0]["id"]


def test_list(client):
    resp = check(client, spec, "GET", "/api/shipmentItems")
    body = resp.json()
    assert "data" in body and "totalCount" in body


def test_list_pagination(client):
    resp = check(client, spec, "GET", "/api/shipmentItems",
                 params={"max": "1", "offset": "0"})
    assert len(resp.json()["data"]) <= 1


def test_list_sorting(client):
    resp = check(client, spec, "GET", "/api/shipmentItems",
                 params={"sort": "quantity", "order": "desc", "max": "10"})
    quantities = [item["quantity"] for item in resp.json()["data"]
                  if item["quantity"] is not None]
    assert quantities == sorted(quantities, reverse=True)


def test_read(client, any_item_id):
    resp = check(client, spec, "GET", "/api/shipmentItems/{id}",
                 path=f"/api/shipmentItems/{any_item_id}")
    data = resp.json()["data"]
    assert data["id"] == any_item_id
    assert "shipment" in data and "orderItems" in data


def test_read_unknown(client):
    resp = check(client, spec, "GET", "/api/shipmentItems/{id}",
                 path=f"/api/shipmentItems/{UNKNOWN}")
    assert resp.status_code == 404


def test_update_unknown(client):
    resp = check(client, spec, "PUT", "/api/shipmentItems/{id}",
                 path=f"/api/shipmentItems/{UNKNOWN}", json={})
    assert resp.status_code == 404


def test_update_noop(client, any_item_id):
    # An empty payload leaves every field unchanged.
    before = client.get_json(f"/api/shipmentItems/{any_item_id}")["data"]
    resp = check(client, spec, "PUT", "/api/shipmentItems/{id}",
                 path=f"/api/shipmentItems/{any_item_id}", json={})
    assert resp.status_code == 200
    after = resp.json()["data"]
    assert after["quantity"] == before["quantity"]
    assert after["lotNumber"] == before["lotNumber"]


def test_delete_unknown(client):
    resp = check(client, spec, "DELETE", "/api/shipmentItems/{id}",
                 path=f"/api/shipmentItems/{UNKNOWN}")
    assert resp.status_code == 404


def test_options(client):
    resp = check(client, spec, "GET", "/api/shipmentItems/options")
    data = resp.json()["data"]
    for key in ("containers", "products", "recipients", "inventoryItems",
                "donors", "shipments"):
        assert key in data


def test_pick_context(client, any_item_id):
    resp = check(client, spec, "GET", "/api/shipmentItems/{id}/pick",
                 path=f"/api/shipmentItems/{any_item_id}/pick")
    data = resp.json()["data"]
    assert data["shipmentItem"]["id"] == any_item_id
    assert isinstance(data["binLocations"], list)


def test_pick_context_unknown(client):
    resp = check(client, spec, "GET", "/api/shipmentItems/{id}/pick",
                 path=f"/api/shipmentItems/{UNKNOWN}/pick")
    assert resp.status_code == 404


def test_split_invalid_quantity(client, any_item_id):
    # splitQuantity of 0 is rejected before any mutation happens.
    resp = check(client, spec, "POST", "/api/shipmentItems/{id}/split",
                 path=f"/api/shipmentItems/{any_item_id}/split",
                 json={"inventoryItemId": UNKNOWN, "splitQuantity": 0})
    assert resp.status_code == 400


def test_split_unknown(client):
    resp = check(client, spec, "POST", "/api/shipmentItems/{id}/split",
                 path=f"/api/shipmentItems/{UNKNOWN}/split",
                 json={"inventoryItemId": UNKNOWN, "splitQuantity": 1})
    assert resp.status_code == 404
