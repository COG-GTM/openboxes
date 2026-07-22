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


def test_tree(client, batch7_api):
    resp = check(client, spec, "GET", "/api/categories/tree")
    names = [c.get("name") for c in resp.json()["data"]]
    assert "ROOT" in names, "seeded ROOT category should be a root of the tree"


def test_details(client, batch7_api):
    root = next(c for c in client.get_json("/api/categories")["data"]
                if c.get("name") == "ROOT")
    resp = check(client, spec, "GET", "/api/categories/{id}/details",
                 path=f"/api/categories/{root['id']}/details")
    assert resp.json()["data"]["name"] == "ROOT"


def test_details_unknown(client, batch7_api):
    check(client, spec, "GET", "/api/categories/{id}/details",
          path="/api/categories/doesnotexist0000/details")


def test_assigning_parent_to_product(client, batch7_api):
    resp = check(client, spec, "PUT", "/api/categories/assigningParentToProduct",
                 json={"enabled": True})
    assert resp.json()["data"]["assigningParentToProductEnabled"] is True
    resp = check(client, spec, "PUT", "/api/categories/assigningParentToProduct",
                 json={"enabled": False})
    assert resp.json()["data"]["assigningParentToProductEnabled"] is False


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


def test_update_persists_json_body(client, batch7_api):
    # Batch 7 fix: save() now binds the JSON body on updates (previously the
    # body was silently ignored and updates were no-ops).
    root = next(c for c in client.get_json("/api/categories")["data"]
                if c.get("name") == "ROOT")
    resp = check(client, spec, "POST", "/api/categories",
                 json={"name": TEST_NAME, "parentCategory": {"id": root["id"]}})
    category_id = resp.json()["id"]
    try:
        resp = check(client, spec, "PUT", "/api/categories/{id}",
                     path=f"/api/categories/{category_id}",
                     json={"description": "persisted by contract suite",
                           "sortOrder": 7})
        assert resp.json()["description"] == "persisted by contract suite"
        assert resp.json()["sortOrder"] == 7
    finally:
        check(client, spec, "DELETE", "/api/categories/{id}",
              path=f"/api/categories/{category_id}")


def test_update_reparents_category(client, batch7_api):
    # The React category tree drag-and-drop sends PUT {parentCategory: {id}};
    # verify a JSON PUT actually reparents the category.
    categories = client.get_json("/api/categories")["data"]
    root = next(c for c in categories if c.get("name") == "ROOT")
    other_parent = next(c for c in categories
                        if c["id"] != root["id"] and c.get("name") != TEST_NAME)
    resp = check(client, spec, "POST", "/api/categories",
                 json={"name": TEST_NAME, "parentCategory": {"id": root["id"]}})
    category_id = resp.json()["id"]
    try:
        check(client, spec, "PUT", "/api/categories/{id}",
              path=f"/api/categories/{category_id}",
              json={"parentCategory": {"id": other_parent["id"]}})
        details = client.get_json(f"/api/categories/{category_id}/details")
        assert details["data"]["parentCategory"]["id"] == other_parent["id"]
    finally:
        check(client, spec, "DELETE", "/api/categories/{id}",
              path=f"/api/categories/{category_id}")


def test_delete_unknown(client):
    check(client, spec, "DELETE", "/api/categories/{id}",
          path="/api/categories/doesnotexist0000")
