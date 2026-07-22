"""Contract tests for ProductGroupApiController (openapi/specs/product-group-api.yaml).

Covers the Batch 10 create endpoint plus the Batch 11 list/read/update/
delete and product-membership endpoints. The CRUD flow seeds a dedicated
group through the generic API and deletes it through the product group API
afterwards so the suite stays re-runnable.
"""

import uuid

import pytest

from oas import Spec, check

spec = Spec("product-group-api.yaml")

TEST_NAME = "ZZ Contract Product Group"
PRODUCT_CODE = "AX738"


def _test_name():
    return f"{TEST_NAME} {uuid.uuid4().hex[:8]}"


@pytest.fixture(scope="module", autouse=True)
def require_endpoint(client):
    # The pinned released image predates the product group API; only source
    # builds of this branch expose it.
    if client.request("GET", "/api/productGroups",
                      params={"max": "1"}).status_code != 200:
        pytest.skip("app build does not expose /api/productGroups")


@pytest.fixture(scope="module", autouse=True)
def cleanup_leftovers(client, require_endpoint):
    for pg in client.get_json("/api/productGroups",
                              params={"q": TEST_NAME, "max": "100"})["data"]:
        if str(pg.get("name", "")).startswith(TEST_NAME):
            client.request("DELETE", f"/api/productGroups/{pg['id']}")


@pytest.fixture()
def product_group(client):
    resp = client.request("POST", "/api/generic/productGroup",
                          json={"name": TEST_NAME})
    assert resp.status_code == 201
    pg_id = resp.json()["data"]["id"]
    yield pg_id
    client.request("DELETE", f"/api/productGroups/{pg_id}")


def test_list(client):
    resp = check(client, spec, "GET", "/api/productGroups")
    body = resp.json()
    assert body["totalCount"] >= len(body["data"])


def test_list_filtered_and_sorted(client, product_group):
    resp = check(client, spec, "GET", "/api/productGroups",
                 params={"q": TEST_NAME.lower(), "max": "5", "offset": "0",
                         "sort": "name", "order": "asc"})
    data = resp.json()["data"]
    assert any(pg["id"] == product_group for pg in data)


def test_read_unknown(client):
    resp = check(client, spec, "GET", "/api/productGroups/{id}",
                 path="/api/productGroups/doesnotexist0000")
    assert resp.status_code == 404


def test_read_update_delete(client, product_group):
    resp = check(client, spec, "GET", "/api/productGroups/{id}",
                 path=f"/api/productGroups/{product_group}")
    assert resp.json()["data"]["name"] == TEST_NAME

    resp = check(client, spec, "PUT", "/api/productGroups/{id}",
                 path=f"/api/productGroups/{product_group}",
                 json={"description": "contract-test description"})
    assert resp.json()["data"]["description"] == "contract-test description"

    resp = check(client, spec, "DELETE", "/api/productGroups/{id}",
                 path=f"/api/productGroups/{product_group}")
    assert resp.status_code == 204

    resp = check(client, spec, "GET", "/api/productGroups/{id}",
                 path=f"/api/productGroups/{product_group}")
    assert resp.status_code == 404


def test_update_blank_name_rejected(client, product_group):
    resp = check(client, spec, "PUT", "/api/productGroups/{id}",
                 path=f"/api/productGroups/{product_group}",
                 json={"name": ""})
    assert resp.status_code == 400


def test_add_and_remove_product(client, product_group):
    product_id = client.product_id(PRODUCT_CODE)

    resp = check(client, spec, "POST", "/api/productGroups/{id}/products",
                 path=f"/api/productGroups/{product_group}/products",
                 json={"productId": product_id})
    assert any(p["id"] == product_id for p in resp.json()["data"]["products"])

    resp = check(client, spec, "DELETE",
                 "/api/productGroups/{id}/products/{productId}",
                 path=f"/api/productGroups/{product_group}"
                      f"/products/{product_id}")
    assert all(p["id"] != product_id for p in resp.json()["data"]["products"])


def test_add_and_remove_sibling(client, product_group):
    product_id = client.product_id(PRODUCT_CODE)

    resp = check(client, spec, "POST", "/api/productGroups/{id}/products",
                 path=f"/api/productGroups/{product_group}/products",
                 json={"productId": product_id, "isProductFamily": True})
    assert any(p["id"] == product_id for p in resp.json()["data"]["siblings"])

    # Parity quirk: a product that already has a productFamily is rejected.
    resp = check(client, spec, "POST", "/api/productGroups/{id}/products",
                 path=f"/api/productGroups/{product_group}/products",
                 json={"productId": product_id, "isProductFamily": True})
    assert resp.status_code == 400

    resp = check(client, spec, "DELETE",
                 "/api/productGroups/{id}/products/{productId}",
                 path=f"/api/productGroups/{product_group}"
                      f"/products/{product_id}",
                 params={"isProductFamily": "true"})
    assert all(p["id"] != product_id for p in resp.json()["data"]["siblings"])


def test_create_invalid(client):
    # Missing name fails domain validation -> 400.
    resp = check(client, spec, "POST", "/api/productGroups", json={})
    assert resp.status_code == 400


def test_create(client):
    name = _test_name()
    category_id = client.get_json("/api/categoryOptions")["data"][0]["id"]
    resp = check(client, spec, "POST", "/api/productGroups",
                 json={"name": name,
                       "description": "contract test",
                       "category": {"id": category_id}})
    assert resp.status_code == 201
    data = resp.json()["data"]
    group_id = data["id"]
    try:
        assert data["name"] == name
        assert data["description"] == "contract test"
        assert data["category"]["id"] == category_id

        options = client.get_json("/api/productGroupOptions")["data"]
        assert any(o["id"] == group_id for o in options)

        # The unique name constraint rejects a duplicate.
        resp = check(client, spec, "POST", "/api/productGroups",
                     json={"name": name})
        assert resp.status_code == 400
    finally:
        client.request("DELETE", f"/api/productGroups/{group_id}")


def test_create_without_category(client):
    name = _test_name()
    resp = check(client, spec, "POST", "/api/productGroups",
                 json={"name": name})
    assert resp.status_code == 201
    data = resp.json()["data"]
    try:
        assert data["name"] == name
        assert data["category"] is None
    finally:
        client.request("DELETE", f"/api/productGroups/{data['id']}")
