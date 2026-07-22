"""Contract tests for ProductCatalogApiController (product-catalog-api.yaml)."""

import uuid

import pytest

from oas import Spec, check

spec = Spec("product-catalog-api.yaml")

# Product codes are randomly generated at demo-import time on source builds,
# so resolve products by their stable seeded names.
PRODUCT_NAME = "Lamivudine 150mg tablet"
TEST_NAME_PREFIX = "ZZ contract test catalog"


def _product_id_by_name(client, name):
    data = client.get_json("/api/products/search", params={"name": name})["data"]
    matches = [p for p in data if p.get("name") == name]
    assert matches, f"Product not found in seeded data: {name}"
    return matches[0]["id"]


def _test_name():
    return f"{TEST_NAME_PREFIX} {uuid.uuid4().hex[:8]}"


@pytest.fixture(scope="module", autouse=True)
def require_endpoint(client):
    # The pinned released image predates the product catalog API; only
    # source builds of this branch expose it.
    if client.request("GET", "/api/productCatalogs",
                      params={"max": "1"}).status_code != 200:
        pytest.skip("app build does not expose /api/productCatalogs")


@pytest.fixture(scope="module", autouse=True)
def cleanup_leftovers(client, require_endpoint):
    for pc in client.get_json("/api/productCatalogs",
                              params={"q": TEST_NAME_PREFIX, "max": "100"})["data"]:
        client.request("DELETE", f"/api/productCatalogs/{pc['id']}")


def test_list(client):
    resp = check(client, spec, "GET", "/api/productCatalogs",
                 params={"max": "10", "offset": "0"})
    body = resp.json()
    assert body["totalCount"] >= len(body["data"])


def test_list_sorted_desc(client):
    resp = check(client, spec, "GET", "/api/productCatalogs",
                 params={"sort": "name", "order": "desc", "max": "100"})
    names = [pc["name"] for pc in resp.json()["data"]]
    assert names == sorted(names, reverse=True)


def test_read_unknown(client):
    resp = check(client, spec, "GET", "/api/productCatalogs/{id}",
                 path="/api/productCatalogs/doesnotexist0000")
    assert resp.status_code == 404


def test_delete_unknown(client):
    resp = check(client, spec, "DELETE", "/api/productCatalogs/{id}",
                 path="/api/productCatalogs/doesnotexist0000")
    assert resp.status_code == 404


def test_create_invalid(client):
    # Missing code/name fails domain validation -> 400.
    resp = check(client, spec, "POST", "/api/productCatalogs",
                 json={"description": TEST_NAME_PREFIX})
    assert resp.status_code == 400


def test_create_read_update_delete(client):
    name = _test_name()
    resp = check(client, spec, "POST", "/api/productCatalogs",
                 json={"code": name.replace(" ", "-"),
                       "name": name,
                       "description": "contract test",
                       "active": True,
                       "color": "#336699"})
    assert resp.status_code == 201
    pc_id = resp.json()["data"]["id"]
    try:
        resp = check(client, spec, "GET", "/api/productCatalogs/{id}",
                     path=f"/api/productCatalogs/{pc_id}")
        data = resp.json()["data"]
        assert data["name"] == name
        assert data["active"] is True
        assert data["color"] == "#336699"
        assert data["itemCount"] == 0
        assert data["productCatalogItems"] == []

        resp = check(client, spec, "GET", "/api/productCatalogs",
                     params={"q": name, "max": "10"})
        assert [pc["id"] for pc in resp.json()["data"]] == [pc_id]

        resp = check(client, spec, "PUT", "/api/productCatalogs/{id}",
                     path=f"/api/productCatalogs/{pc_id}",
                     json={"name": f"{name} (updated)", "active": False})
        data = resp.json()["data"]
        assert data["name"] == f"{name} (updated)"
        assert data["active"] is False
    finally:
        resp = check(client, spec, "DELETE", "/api/productCatalogs/{id}",
                     path=f"/api/productCatalogs/{pc_id}")
        assert resp.status_code == 204


def test_item_add_remove(client):
    pid = _product_id_by_name(client, PRODUCT_NAME)
    name = _test_name()
    resp = check(client, spec, "POST", "/api/productCatalogs",
                 json={"code": name.replace(" ", "-"), "name": name})
    assert resp.status_code == 201
    pc_id = resp.json()["data"]["id"]
    try:
        resp = check(client, spec, "POST", "/api/productCatalogs/{id}/items",
                     path=f"/api/productCatalogs/{pc_id}/items",
                     json={"product": {"id": pid}})
        data = resp.json()["data"]
        assert data["itemCount"] == 1
        assert data["productCatalogItems"][0]["product"]["id"] == pid
        item_id = data["productCatalogItems"][0]["id"]

        # Adding the same product again is a no-op (mirrors the legacy action).
        resp = check(client, spec, "POST", "/api/productCatalogs/{id}/items",
                     path=f"/api/productCatalogs/{pc_id}/items",
                     json={"product": {"id": pid}})
        assert resp.json()["data"]["itemCount"] == 1

        resp = check(client, spec, "POST", "/api/productCatalogs/{id}/items",
                     path=f"/api/productCatalogs/{pc_id}/items", json={})
        assert resp.status_code == 400

        resp = check(client, spec, "DELETE",
                     "/api/productCatalogs/{id}/items/{itemId}",
                     path=f"/api/productCatalogs/{pc_id}/items/{item_id}")
        assert resp.json()["data"]["productCatalogItems"] == []

        resp = check(client, spec, "DELETE",
                     "/api/productCatalogs/{id}/items/{itemId}",
                     path=f"/api/productCatalogs/{pc_id}/items/doesnotexist0000")
        assert resp.status_code == 404
    finally:
        resp = check(client, spec, "DELETE", "/api/productCatalogs/{id}",
                     path=f"/api/productCatalogs/{pc_id}")
        assert resp.status_code == 204


def test_import_items(client):
    name = _test_name()
    code = name.replace(" ", "-")
    resp = check(client, spec, "POST", "/api/productCatalogs",
                 json={"code": code, "name": name})
    assert resp.status_code == 201
    pc_id = resp.json()["data"]["id"]
    try:
        product_code = client.get_json(
            "/api/products/search", params={"name": PRODUCT_NAME},
        )["data"][0]["productCode"]
        # parseProductCatalogItems expects 4 columns and reads the catalog
        # code from column 1 and the product code from column 2.
        csv = ("Catalog Code,Product Code,Category,Product Name\n"
               f"{code},{product_code},,{PRODUCT_NAME}\n")
        resp = check(client, spec, "POST",
                     "/api/productCatalogs/{id}/importItems",
                     path=f"/api/productCatalogs/{pc_id}/importItems",
                     files={"importFile": ("catalog.csv", csv, "text/csv")})
        assert resp.status_code == 200
        body = resp.json()
        assert body["importedCount"] == 1
        assert body["data"]["itemCount"] == 1

        resp = check(client, spec, "POST",
                     "/api/productCatalogs/{id}/importItems",
                     path=f"/api/productCatalogs/{pc_id}/importItems",
                     files={"importFile": ("catalog.csv", "", "text/csv")})
        assert resp.status_code == 400
    finally:
        resp = check(client, spec, "DELETE", "/api/productCatalogs/{id}",
                     path=f"/api/productCatalogs/{pc_id}")
        assert resp.status_code == 204
