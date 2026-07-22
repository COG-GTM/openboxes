"""Contract tests for the Batch 32 location group screen endpoints
(/api/locationGroups/search and /api/locationGroups/{id}/details in
openapi/specs/location-group-api.yaml)."""

import pytest

from oas import Spec, check

spec = Spec("location-group-api.yaml")

TEST_NAME = "ZZ Contract LG Screens"


@pytest.fixture(scope="module", autouse=True)
def require_endpoint(client):
    # The pinned released image predates the Batch 32 screen endpoints; only
    # source builds of this branch expose them.
    if client.request("GET", "/api/locationGroups/search",
                      params={"max": "1"}).status_code != 200:
        pytest.skip("app build does not expose /api/locationGroups/search")


@pytest.fixture(scope="module", autouse=True)
def cleanup_leftovers(client, require_endpoint):
    for group in client.get_json("/api/locationGroups")["data"]:
        if str(group.get("name", "")).startswith(TEST_NAME):
            client.request("DELETE", f"/api/locationGroups/{group['id']}")


def test_search(client):
    resp = check(client, spec, "GET", "/api/locationGroups/search")
    body = resp.json()
    assert body["totalCount"] >= len(body["data"])
    assert len(body["data"]) <= 10


def test_search_sorted_and_paged(client):
    resp = check(client, spec, "GET", "/api/locationGroups/search",
                 params={"max": "5", "offset": "0", "order": "asc"})
    data = resp.json()["data"]
    assert len(data) <= 5
    names = [row["name"] for row in data]
    assert names == sorted(names)


def test_search_filtered(client):
    resp = check(client, spec, "GET", "/api/locationGroups/search",
                 params={"q": "ZZ No Such Group", "max": "5"})
    body = resp.json()
    assert body["data"] == []
    assert body["totalCount"] == 0


def test_details_matches_search_row(client):
    row = client.get_json("/api/locationGroups/search", params={"max": "1"})["data"][0]
    resp = check(client, spec, "GET", "/api/locationGroups/{id}/details",
                 path=f"/api/locationGroups/{row['id']}/details")
    details = resp.json()["data"]
    assert details["id"] == row["id"]
    assert details["name"] == row["name"]
    assert len(details["locations"]) == row["locationsCount"]


def test_details_unknown(client):
    check(client, spec, "GET", "/api/locationGroups/{id}/details",
          path="/api/locationGroups/doesnotexist0000/details")


def test_create_details_update_roundtrip(client):
    resp = check(client, spec, "POST", "/api/locationGroups",
                 json={"name": TEST_NAME})
    group_id = resp.json()["data"]["id"]
    try:
        resp = check(client, spec, "GET", "/api/locationGroups/{id}/details",
                     path=f"/api/locationGroups/{group_id}/details")
        details = resp.json()["data"]
        assert details["locations"] == []
        check(client, spec, "PUT", "/api/locationGroups/{id}",
              path=f"/api/locationGroups/{group_id}",
              json={"name": f"{TEST_NAME} (renamed)",
                    "version": details["version"],
                    "address": {"address": "1 Contract St",
                                "city": "Contractville",
                                "description": "contract test"}})
        resp = check(client, spec, "GET", "/api/locationGroups/{id}/details",
                     path=f"/api/locationGroups/{group_id}/details")
        details = resp.json()["data"]
        assert details["name"] == f"{TEST_NAME} (renamed)"
        assert details["address"]["city"] == "Contractville"
        resp = check(client, spec, "GET", "/api/locationGroups/search",
                     params={"q": TEST_NAME})
        rows = resp.json()["data"]
        assert any(row["description"] == "contract test" for row in rows)
    finally:
        check(client, spec, "DELETE", "/api/locationGroups/{id}",
              path=f"/api/locationGroups/{group_id}")
