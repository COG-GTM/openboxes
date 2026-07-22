"""Contract tests for StockMovementDetailApiController
(openapi/specs/stock-movement-detail-api.yaml)."""

import uuid

import pytest

from oas import Spec, check

spec = Spec("stock-movement-detail-api.yaml")


@pytest.fixture(scope="module", autouse=True)
def require_endpoint(client):
    # The pinned released image predates these endpoints; only source builds
    # of this branch expose them.
    if client.request("GET", "/api/stockMovements/documentTypes").status_code == 404:
        pytest.skip("app build does not expose stock movement detail endpoints")


@pytest.fixture(scope="module")
def stock_movement_id(client):
    resp = client.request("GET", "/api/stockMovements",
                          params={"direction": "OUTBOUND", "origin": "1", "max": 1})
    if resp.status_code != 200:
        pytest.skip("cannot list stock movements")
    data = resp.json().get("data") or []
    if not data:
        pytest.skip("no seeded stock movements")
    return data[0]["id"]


def test_document_types(client):
    resp = check(client, spec, "GET", "/api/stockMovements/documentTypes")
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert isinstance(data, list)
    for option in data:
        assert option["id"] == option["value"]
        assert option["label"]


def test_details(client, stock_movement_id):
    resp = check(client, spec, "GET", "/api/stockMovements/{id}/details",
                 path=f"/api/stockMovements/{stock_movement_id}/details")
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert data["id"] == stock_movement_id
    assert data["identifier"]


def test_details_unknown_id(client):
    resp = check(client, spec, "GET", "/api/stockMovements/{id}/details",
                 path="/api/stockMovements/ffffffffffffffffffffffffffffffff/details")
    assert resp.status_code == 404


def test_packing_list(client, stock_movement_id):
    resp = check(client, spec, "GET", "/api/stockMovements/{id}/packingList",
                 path=f"/api/stockMovements/{stock_movement_id}/packingList")
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert isinstance(data["shipmentItems"], list)


def test_receipt_items(client, stock_movement_id):
    resp = check(client, spec, "GET", "/api/stockMovements/{id}/receiptItems",
                 path=f"/api/stockMovements/{stock_movement_id}/receiptItems")
    assert resp.status_code == 200
    assert isinstance(resp.json()["data"], list)


def test_events(client, stock_movement_id):
    resp = check(client, spec, "GET", "/api/stockMovements/{id}/events",
                 path=f"/api/stockMovements/{stock_movement_id}/events")
    assert resp.status_code == 200
    assert isinstance(resp.json()["data"], list)


def test_comments_roundtrip(client, stock_movement_id):
    listed = check(client, spec, "GET", "/api/stockMovements/{id}/comments",
                   path=f"/api/stockMovements/{stock_movement_id}/comments")
    assert listed.status_code == 200
    before = listed.json()["data"]

    suffix = uuid.uuid4().hex[:8]
    created = check(client, spec, "POST", "/api/stockMovements/{id}/comments",
                    path=f"/api/stockMovements/{stock_movement_id}/comments",
                    json={"comment": f"ZZ contract test comment {suffix}"})
    assert created.status_code == 201
    assert created.json()["data"]["comment"].endswith(suffix)

    after = check(client, spec, "GET", "/api/stockMovements/{id}/comments",
                  path=f"/api/stockMovements/{stock_movement_id}/comments")
    assert len(after.json()["data"]) == len(before) + 1


def test_create_comment_validation_error(client, stock_movement_id):
    resp = check(client, spec, "POST", "/api/stockMovements/{id}/comments",
                 path=f"/api/stockMovements/{stock_movement_id}/comments",
                 json={"comment": ""})
    assert resp.status_code == 400
