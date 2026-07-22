"""Contract tests for ProductTypeApiController (openapi/specs/product-type-api.yaml).

The create flow deletes the created product type afterwards so the suite
stays re-runnable.
"""

import pytest

from oas import Spec, check

spec = Spec("product-type-api.yaml")

TEST_NAME = "ZZ Contract Product Type"


@pytest.fixture(scope="module", autouse=True)
def require_endpoint(client):
    # The pinned released image predates the product type API; only source
    # builds of this branch expose it. POST with an invalid body responds
    # 400 when present, 404 when the mapping does not exist.
    if client.request("POST", "/api/productTypes",
                      json={}).status_code == 404:
        pytest.skip("app build does not expose /api/productTypes")


@pytest.fixture(scope="module", autouse=True)
def cleanup_leftovers(client, require_endpoint):
    for pt in client.get_json("/api/generic/productType")["data"]:
        if str(pt.get("name", "")).startswith(TEST_NAME):
            client.request("DELETE", f"/api/productTypes/{pt['id']}")


def test_create_and_delete(client):
    resp = check(client, spec, "POST", "/api/productTypes",
                 json={
                     "name": TEST_NAME,
                     "code": "ZZCT",
                     "productIdentifierFormat": "LLNNNN",
                     "supportedActivities": ["SEARCHABLE"],
                     "displayedFields": ["NAME", "CATEGORY"],
                 })
    assert resp.status_code == 201
    data = resp.json()["data"]
    try:
        assert data["name"] == TEST_NAME
        # Parity quirks: productTypeCode and requiredFields are forced.
        assert data["productTypeCode"] == "GOOD"
        assert data["requiredFields"] == [
            "CATEGORY", "GL_ACCOUNT", "NAME", "PRODUCT_CODE"]
        assert data["supportedActivities"] == ["SEARCHABLE"]
    finally:
        resp = check(client, spec, "DELETE", "/api/productTypes/{id}",
                     path=f"/api/productTypes/{data['id']}")
        assert resp.status_code == 204


def test_list_read_update_round_trip(client):
    resp = check(client, spec, "POST", "/api/productTypes",
                 json={"name": TEST_NAME, "code": "ZZCT"})
    assert resp.status_code == 201
    created = resp.json()["data"]
    try:
        # list includes the created type
        resp = check(client, spec, "GET", "/api/productTypes",
                     params={"max": "100"})
        assert resp.status_code == 200
        body = resp.json()
        assert body["totalCount"] >= 1
        assert any(pt["id"] == created["id"] for pt in body["data"])

        # read
        resp = check(client, spec, "GET", "/api/productTypes/{id}",
                     path=f"/api/productTypes/{created['id']}")
        assert resp.status_code == 200
        assert resp.json()["data"]["name"] == TEST_NAME
        assert resp.json()["data"]["productCount"] == 0

        # update the fields exposed by the legacy edit form
        resp = check(client, spec, "PUT", "/api/productTypes/{id}",
                     path=f"/api/productTypes/{created['id']}",
                     json={
                         "name": TEST_NAME + " Updated",
                         "sequenceNumber": 7,
                         "supportedActivities": ["SEARCHABLE"],
                         "displayedFields": ["NAME"],
                     })
        assert resp.status_code == 200
        data = resp.json()["data"]
        assert data["name"] == TEST_NAME + " Updated"
        assert data["sequenceNumber"] == 7
        assert data["supportedActivities"] == ["SEARCHABLE"]
        assert data["displayedFields"] == ["NAME"]
        # read-only fields untouched
        assert data["productTypeCode"] == "GOOD"
        assert data["code"] == "ZZCT"
    finally:
        resp = check(client, spec, "DELETE", "/api/productTypes/{id}",
                     path=f"/api/productTypes/{created['id']}")
        assert resp.status_code == 204


def test_read_unknown(client):
    resp = check(client, spec, "GET", "/api/productTypes/{id}",
                 path="/api/productTypes/doesnotexist0000")
    assert resp.status_code == 404


def test_create_without_code_or_identifier_rejected(client):
    resp = check(client, spec, "POST", "/api/productTypes",
                 json={"name": TEST_NAME})
    assert resp.status_code == 400


def test_delete_unknown(client):
    resp = check(client, spec, "DELETE", "/api/productTypes/{id}",
                 path="/api/productTypes/doesnotexist0000")
    assert resp.status_code == 404


def test_product_activity_code_options(client):
    options_spec = Spec("select-options-api.yaml")
    resp = check(client, options_spec, "GET", "/api/productActivityCodeOptions")
    ids = [option["id"] for option in resp.json()["data"]]
    assert "SEARCHABLE" in ids


def test_product_field_options(client):
    options_spec = Spec("select-options-api.yaml")
    resp = check(client, options_spec, "GET", "/api/productFieldOptions")
    ids = [option["id"] for option in resp.json()["data"]]
    assert "PRODUCT_CODE" in ids
