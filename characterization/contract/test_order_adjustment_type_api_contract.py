"""Contract tests for OrderAdjustmentTypeApiController
(openapi/specs/order-adjustment-type-api.yaml)."""

import pytest

from oas import Spec, check

spec = Spec("order-adjustment-type-api.yaml")

UNKNOWN = "doesnotexist0000"


@pytest.fixture(scope="module", autouse=True)
def require_endpoint(client):
    # The pinned released image predates this endpoint; only source builds
    # of this branch expose it.
    if client.request("GET", "/api/orderAdjustmentTypes").status_code != 200:
        pytest.skip("app build does not expose /api/orderAdjustmentTypes")


def test_list(client):
    resp = check(client, spec, "GET", "/api/orderAdjustmentTypes")
    body = resp.json()
    assert "data" in body and "totalCount" in body


def test_list_pagination(client):
    resp = check(client, spec, "GET", "/api/orderAdjustmentTypes",
                 params={"max": "1", "offset": "0"})
    assert len(resp.json()["data"]) <= 1


def test_read_unknown(client):
    resp = check(client, spec, "GET", "/api/orderAdjustmentTypes/{id}",
                 path=f"/api/orderAdjustmentTypes/{UNKNOWN}")
    assert resp.status_code == 404


def test_create_validation_error(client):
    resp = check(client, spec, "POST", "/api/orderAdjustmentTypes",
                 json={"name": ""})
    assert resp.status_code == 400


def test_crud(client):
    created = check(client, spec, "POST", "/api/orderAdjustmentTypes",
                    json={"name": "ZZ Contract adjustment type",
                          "description": "contract test",
                          "code": "SHIPPING_CHARGE"})
    assert created.status_code == 201
    adjustment_type_id = created.json()["data"]["id"]

    read = check(client, spec, "GET", "/api/orderAdjustmentTypes/{id}",
                 path=f"/api/orderAdjustmentTypes/{adjustment_type_id}")
    assert read.json()["data"]["name"] == "ZZ Contract adjustment type"
    assert read.json()["data"]["code"] == "SHIPPING_CHARGE"

    updated = check(client, spec, "PUT", "/api/orderAdjustmentTypes/{id}",
                    path=f"/api/orderAdjustmentTypes/{adjustment_type_id}",
                    json={"name": "ZZ Contract adjustment type updated"})
    assert updated.status_code == 200
    assert updated.json()["data"]["name"] == "ZZ Contract adjustment type updated"

    listed = check(client, spec, "GET", "/api/orderAdjustmentTypes",
                   params={"q": "ZZ Contract"})
    assert any(t["id"] == adjustment_type_id for t in listed.json()["data"])
