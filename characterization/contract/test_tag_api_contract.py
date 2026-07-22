"""Contract tests for TagApiController (openapi/specs/tag-api.yaml).

Created tags are deleted afterwards so the suite stays re-runnable.
"""

import pytest

from oas import Spec, check

spec = Spec("tag-api.yaml")

TEST_TAG = "zz-contract-tag"


@pytest.fixture(scope="module", autouse=True)
def require_endpoint(client):
    # Only source builds of this branch expose the tag API. POST with an
    # invalid body responds 400 when present, 404 when the mapping does
    # not exist.
    if client.request("POST", "/api/tags", json={}).status_code == 404:
        pytest.skip("app build does not expose /api/tags")


@pytest.fixture(scope="module", autouse=True)
def cleanup_leftovers(client, require_endpoint):
    listing = client.get_json("/api/tags",
                              params={"q": TEST_TAG, "max": "100"})
    for tag in listing["data"]:
        if str(tag.get("tag", "")).startswith(TEST_TAG):
            client.request("DELETE", f"/api/tags/{tag['id']}")


def test_crud_round_trip(client):
    resp = check(client, spec, "POST", "/api/tags",
                 json={"tag": TEST_TAG})
    assert resp.status_code == 201
    created = resp.json()["data"]
    try:
        assert created["tag"] == TEST_TAG
        assert created["isActive"] is True
        assert created["products"] == []

        # list with q filter (legacy contains match)
        resp = check(client, spec, "GET", "/api/tags",
                     params={"q": TEST_TAG[3:-3], "max": "100"})
        assert resp.status_code == 200
        body = resp.json()
        assert body["totalCount"] >= 1
        row = next(t for t in body["data"] if t["id"] == created["id"])
        assert row["productCount"] == 0

        # read
        resp = check(client, spec, "GET", "/api/tags/{id}",
                     path=f"/api/tags/{created['id']}")
        assert resp.status_code == 200
        assert resp.json()["data"]["tag"] == TEST_TAG

        # update the fields exposed by the legacy edit form
        resp = check(client, spec, "PUT", "/api/tags/{id}",
                     path=f"/api/tags/{created['id']}",
                     json={"tag": TEST_TAG + "-updated", "isActive": False})
        assert resp.status_code == 200
        data = resp.json()["data"]
        assert data["tag"] == TEST_TAG + "-updated"
        assert data["isActive"] is False
    finally:
        resp = check(client, spec, "DELETE", "/api/tags/{id}",
                     path=f"/api/tags/{created['id']}")
        assert resp.status_code == 204


def test_add_and_remove_products(client):
    products = client.get_json("/api/generic/product?max=1")["data"]
    if not products:
        pytest.skip("no products seeded")
    product = products[0]

    resp = check(client, spec, "POST", "/api/tags",
                 json={"tag": TEST_TAG + "-products"})
    assert resp.status_code == 201
    created = resp.json()["data"]
    try:
        # add by product code (unknown codes are skipped silently)
        resp = check(client, spec, "POST", "/api/tags/{id}/products",
                     path=f"/api/tags/{created['id']}/products",
                     json={"productCodes":
                           f"{product['productCode']}, ZZNOSUCHCODE"})
        assert resp.status_code == 200
        data = resp.json()["data"]
        assert [p["id"] for p in data["products"]] == [product["id"]]

        # remove
        resp = check(client, spec, "DELETE",
                     "/api/tags/{id}/products/{productId}",
                     path=f"/api/tags/{created['id']}/products/{product['id']}")
        assert resp.status_code == 200
        assert resp.json()["data"]["products"] == []
    finally:
        resp = check(client, spec, "DELETE", "/api/tags/{id}",
                     path=f"/api/tags/{created['id']}")
        assert resp.status_code == 204


def test_create_without_tag_rejected(client):
    resp = check(client, spec, "POST", "/api/tags", json={})
    assert resp.status_code == 400


def test_read_unknown(client):
    resp = check(client, spec, "GET", "/api/tags/{id}",
                 path="/api/tags/doesnotexist0000")
    assert resp.status_code == 404


def test_delete_unknown(client):
    resp = check(client, spec, "DELETE", "/api/tags/{id}",
                 path="/api/tags/doesnotexist0000")
    assert resp.status_code == 404
