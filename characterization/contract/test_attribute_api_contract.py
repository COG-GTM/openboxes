"""Contract tests for AttributeApiController (openapi/specs/attribute-api.yaml).

The CRUD flow creates a dedicated, deterministically-named attribute and
deletes it afterwards so the suite stays re-runnable (same convention as the
category contract suite).
"""

import pytest

from oas import Spec, check

spec = Spec("attribute-api.yaml")

TEST_NAME = "ZZ Contract Attribute"


@pytest.fixture(scope="module")
def cleanup_leftovers(client, batch7_api):
    for attr in client.get_json("/api/attributes",
                                params={"includeInactive": "true"})["data"]:
        if attr.get("name") == TEST_NAME:
            client.request("DELETE", f"/api/attributes/{attr['id']}")


def test_list(client):
    check(client, spec, "GET", "/api/attributes")


def test_list_by_entity_type(client):
    check(client, spec, "GET", "/api/attributes",
          params={"entityType": "PRODUCT"})


def test_list_search_mode(client, batch7_api):
    check(client, spec, "GET", "/api/attributes",
          params={"includeInactive": "true"})


def test_read_unknown(client, batch7_api):
    check(client, spec, "GET", "/api/attributes/{id}",
          path="/api/attributes/doesnotexist0000")


def test_create_read_update_delete(client, cleanup_leftovers):
    resp = check(client, spec, "POST", "/api/attributes",
                 json={"name": TEST_NAME, "code": "zz_contract_attribute",
                       "entityTypeCode": "PRODUCT",
                       "options": ["Option A", "Option B"],
                       "active": True, "required": False, "allowOther": False})
    attribute_id = resp.json()["id"]
    try:
        check(client, spec, "GET", "/api/attributes/{id}",
              path=f"/api/attributes/{attribute_id}")
        resp = check(client, spec, "PUT", "/api/attributes/{id}",
                     path=f"/api/attributes/{attribute_id}",
                     json={"description": "updated by contract suite",
                           "options": ["Option A", "Option B", "Option C"]})
        assert resp.json()["options"] == ["Option A", "Option B", "Option C"]
    finally:
        check(client, spec, "DELETE", "/api/attributes/{id}",
              path=f"/api/attributes/{attribute_id}")


def test_delete_unknown(client, batch7_api):
    check(client, spec, "DELETE", "/api/attributes/{id}",
          path="/api/attributes/doesnotexist0000")
