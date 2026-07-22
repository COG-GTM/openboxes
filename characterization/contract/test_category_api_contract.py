"""Contract tests for CategoryApiController (openapi/specs/category-api.yaml).

The CRUD flow creates a dedicated, deterministically-named category and
deletes it afterwards so the suite stays re-runnable (same convention as the
snapshot suite's write flows).
"""

import pytest

from oas import Spec, check

spec = Spec("category-api.yaml")

TEST_NAME = "ZZ Contract Category"


@pytest.fixture(scope="module", autouse=True)
def cleanup_leftovers(client):
    for cat in client.get_json("/api/categories")["data"]:
        if cat.get("name") == TEST_NAME:
            client.request("DELETE", f"/api/categories/{cat['id']}")


def test_list(client):
    resp = check(client, spec, "GET", "/api/categories")
    assert resp.json()["data"], "seeded dataset should have categories"


def test_read(client):
    root = next(c for c in client.get_json("/api/categories")["data"]
                if c.get("name") == "ROOT")
    check(client, spec, "GET", "/api/categories/{id}",
          path=f"/api/categories/{root['id']}")


def test_read_unknown(client):
    check(client, spec, "GET", "/api/categories/{id}",
          path="/api/categories/doesnotexist0000")


def test_create_update_delete(client):
    root = next(c for c in client.get_json("/api/categories")["data"]
                if c.get("name") == "ROOT")
    resp = check(client, spec, "POST", "/api/categories",
                 json={"name": TEST_NAME, "parentCategory": {"id": root["id"]}})
    category_id = resp.json()["id"]
    try:
        check(client, spec, "GET", "/api/categories/{id}",
              path=f"/api/categories/{category_id}")
        check(client, spec, "PUT", "/api/categories/{id}",
              path=f"/api/categories/{category_id}",
              json={"description": "updated by contract suite"})
    finally:
        check(client, spec, "DELETE", "/api/categories/{id}",
              path=f"/api/categories/{category_id}")


def test_delete_unknown(client):
    check(client, spec, "DELETE", "/api/categories/{id}",
          path="/api/categories/doesnotexist0000")
