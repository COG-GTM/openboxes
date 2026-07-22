"""Contract tests for LocationGroupApiController (openapi/specs/location-group-api.yaml).

The CRUD flow creates a dedicated, deterministically-named location group
and deletes it afterwards so the suite stays re-runnable.
"""

import pytest

from oas import Spec, check

spec = Spec("location-group-api.yaml")

TEST_NAME = "ZZ Contract Location Group"


@pytest.fixture(scope="module", autouse=True)
def cleanup_leftovers(client):
    for group in client.get_json("/api/locationGroups")["data"]:
        if str(group.get("name", "")).startswith(TEST_NAME):
            client.request("DELETE", f"/api/locationGroups/{group['id']}")


def test_list(client):
    resp = check(client, spec, "GET", "/api/locationGroups")
    assert resp.json()["data"], "seeded dataset should have location groups"


def test_list_filtered(client):
    resp = check(client, spec, "GET", "/api/locationGroups",
                 params={"q": "ZZ No Such Group", "max": "5"})
    assert resp.json()["data"] == []


def test_read(client):
    groups = sorted(client.get_json("/api/locationGroups")["data"],
                    key=lambda g: g["name"])
    check(client, spec, "GET", "/api/locationGroups/{id}",
          path=f"/api/locationGroups/{groups[0]['id']}")


def test_read_unknown(client):
    check(client, spec, "GET", "/api/locationGroups/{id}",
          path="/api/locationGroups/doesnotexist0000")


def test_create_update_delete(client):
    resp = check(client, spec, "POST", "/api/locationGroups",
                 json={"name": TEST_NAME})
    group_id = resp.json()["data"]["id"]
    try:
        check(client, spec, "GET", "/api/locationGroups/{id}",
              path=f"/api/locationGroups/{group_id}")
        resp = check(client, spec, "PUT", "/api/locationGroups/{id}",
                     path=f"/api/locationGroups/{group_id}",
                     json={"name": f"{TEST_NAME} (renamed)"})
        assert resp.json()["data"]["name"] == f"{TEST_NAME} (renamed)"
    finally:
        check(client, spec, "DELETE", "/api/locationGroups/{id}",
              path=f"/api/locationGroups/{group_id}")


def test_delete_unknown(client):
    check(client, spec, "DELETE", "/api/locationGroups/{id}",
          path="/api/locationGroups/doesnotexist0000")
