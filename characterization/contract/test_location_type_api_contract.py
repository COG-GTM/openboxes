"""Contract tests for LocationTypeApiController (openapi/specs/location-type-api.yaml)."""

import pytest

from oas import Spec, check

spec = Spec("location-type-api.yaml")

TEST_NAME = "ZZ Contract Location Type"


@pytest.fixture(scope="module", autouse=True)
def require_endpoint(client):
    # The pinned released image predates the location type API; only source
    # builds of this branch expose it.
    if client.request("GET", "/api/locationTypes",
                      params={"max": "1"}).status_code != 200:
        pytest.skip("app build does not expose /api/locationTypes")


@pytest.fixture(scope="module", autouse=True)
def cleanup_leftovers(client, require_endpoint):
    for lt in client.get_json("/api/locationTypes",
                              params={"q": TEST_NAME, "max": "100"})["data"]:
        if str(lt.get("name", "")).startswith(TEST_NAME):
            client.request("DELETE", f"/api/locationTypes/{lt['id']}")


def test_list(client):
    resp = check(client, spec, "GET", "/api/locationTypes")
    body = resp.json()
    assert body["totalCount"] >= len(body["data"])
    assert body["data"], "seeded dataset should have location types"


def test_list_paged_and_sorted(client):
    resp = check(client, spec, "GET", "/api/locationTypes",
                 params={"max": "5", "offset": "0",
                         "sort": "name", "order": "asc"})
    data = resp.json()["data"]
    assert len(data) <= 5
    names = [lt["name"] for lt in data]
    assert names == sorted(names)


def test_read_unknown(client):
    resp = check(client, spec, "GET", "/api/locationTypes/{id}",
                 path="/api/locationTypes/doesnotexist0000")
    assert resp.status_code == 404


def test_location_type_code_options(client):
    options_spec = Spec("select-options-api.yaml")
    resp = check(client, options_spec, "GET", "/api/locationTypeCodeOptions")
    ids = [option["id"] for option in resp.json()["data"]]
    assert "DEPOT" in ids


def test_create_read_update_delete(client):
    resp = check(client, spec, "POST", "/api/locationTypes",
                 json={"name": TEST_NAME, "description": "contract test",
                       "locationTypeCode": "INTERNAL",
                       "supportedActivities": ["PICK_STOCK", "PUTAWAY_STOCK"],
                       "sortOrder": 999})
    assert resp.status_code == 201
    lt_id = resp.json()["data"]["id"]
    try:
        resp = check(client, spec, "GET", "/api/locationTypes/{id}",
                     path=f"/api/locationTypes/{lt_id}")
        data = resp.json()["data"]
        assert data["name"] == TEST_NAME
        assert data["locationTypeCode"] == "INTERNAL"
        assert sorted(data["supportedActivities"]) == ["PICK_STOCK", "PUTAWAY_STOCK"]

        resp = check(client, spec, "PUT", "/api/locationTypes/{id}",
                     path=f"/api/locationTypes/{lt_id}",
                     json={"name": f"{TEST_NAME} (renamed)",
                           "supportedActivities": ["PICK_STOCK"]})
        data = resp.json()["data"]
        assert data["name"] == f"{TEST_NAME} (renamed)"
        assert data["supportedActivities"] == ["PICK_STOCK"]
    finally:
        resp = check(client, spec, "DELETE", "/api/locationTypes/{id}",
                     path=f"/api/locationTypes/{lt_id}")
        assert resp.status_code == 204


def test_create_invalid(client):
    resp = check(client, spec, "POST", "/api/locationTypes",
                 json={"description": "missing name and code"})
    assert resp.status_code == 400


def test_delete_unknown(client):
    resp = check(client, spec, "DELETE", "/api/locationTypes/{id}",
                 path="/api/locationTypes/doesnotexist0000")
    assert resp.status_code == 404
