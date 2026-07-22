"""Contract tests for ProductGroupApiController (product-group-api.yaml)."""

import uuid

import pytest

from oas import Spec, check

spec = Spec("product-group-api.yaml")

TEST_NAME_PREFIX = "ZZ contract test group"


def _test_name():
    return f"{TEST_NAME_PREFIX} {uuid.uuid4().hex[:8]}"


def _cleanup(client, group_id):
    # There is no product group delete API (edit/list/show stay legacy until
    # Batch 11), so clean up through the legacy controller action to keep the
    # /api/productGroupOptions snapshot stable.
    client.request("POST", "/productGroup/delete", data={"id": group_id})


@pytest.fixture(scope="module", autouse=True)
def require_endpoint(client):
    # The pinned released image predates the product group create API; only
    # source builds of this branch expose it. POST with an invalid body: 404
    # means the route is absent, 400 means it exists.
    if client.request("POST", "/api/productGroups", json={}).status_code == 404:
        pytest.skip("app build does not expose /api/productGroups")


@pytest.fixture(scope="module", autouse=True)
def cleanup_leftovers(client, require_endpoint):
    for option in client.get_json("/api/productGroupOptions")["data"]:
        if str(option.get("label") or "").startswith(TEST_NAME_PREFIX):
            _cleanup(client, option["id"])


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
        _cleanup(client, group_id)


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
        _cleanup(client, data["id"])
