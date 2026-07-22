"""Contract tests for the React location screen endpoints
(openapi/specs/location-screens-api.yaml).

These endpoints only exist in builds containing the Batch 31 location screen
migration. Against an older pinned baseline image the whole module skips;
re-baseline OB_VERSION (characterization-tests.yml) after release to activate.
"""

import pytest

from oas import Spec, check

spec = Spec("location-screens-api.yaml")

MAIN_WAREHOUSE = "Main Warehouse"


@pytest.fixture(scope="module", autouse=True)
def require_location_screen_endpoints(client):
    resp = client.request("GET", "/api/locations/search", params={"max": "1"})
    try:
        body = resp.json()
    except ValueError:
        body = {}
    if resp.status_code != 200 or "totalCount" not in body:
        pytest.skip("location screen endpoints not present in deployed app "
                    "(pinned baseline image predates this feature)")


def _main_warehouse_id(client):
    data = client.get_json("/api/locations/search",
                           params={"q": MAIN_WAREHOUSE})["data"]
    return next(l for l in data if l["name"] == MAIN_WAREHOUSE)["id"]


def test_search(client):
    resp = check(client, spec, "GET", "/api/locations/search")
    body = resp.json()
    assert body["data"], "seeded dataset should have locations"
    assert body["totalCount"] >= len(body["data"])


def test_search_filtered(client):
    resp = check(client, spec, "GET", "/api/locations/search",
                 params={"q": MAIN_WAREHOUSE, "sort": "name", "order": "asc"})
    assert any(l["name"] == MAIN_WAREHOUSE for l in resp.json()["data"])


def test_search_pagination(client):
    resp = check(client, spec, "GET", "/api/locations/search",
                 params={"max": "1", "offset": "0"})
    body = resp.json()
    assert len(body["data"]) == 1
    assert body["totalCount"] >= 1


def test_details(client):
    location_id = _main_warehouse_id(client)
    resp = check(client, spec, "GET", "/api/locations/{id}/details",
                 path=f"/api/locations/{location_id}/details")
    data = resp.json()["data"]
    assert data["name"] == MAIN_WAREHOUSE
    assert data["isInternalLocation"] is False


def test_details_unknown(client):
    resp = check(client, spec, "GET", "/api/locations/{id}/details",
                 path="/api/locations/doesnotexist0000/details")
    assert resp.json()["data"] is None


def test_bin_locations(client):
    location_id = _main_warehouse_id(client)
    resp = check(client, spec, "GET", "/api/locations/{id}/binLocations",
                 path=f"/api/locations/{location_id}/binLocations")
    assert resp.json()["data"], "seeded Main Warehouse should have bin locations"


def test_zone_locations(client):
    location_id = _main_warehouse_id(client)
    resp = check(client, spec, "GET", "/api/locations/{id}/zoneLocations",
                 path=f"/api/locations/{location_id}/zoneLocations")
    assert isinstance(resp.json()["data"], list)


def test_contents(client):
    location_id = _main_warehouse_id(client)
    bins = client.get_json(f"/api/locations/{location_id}/binLocations")["data"]
    bin_id = sorted(bins, key=lambda b: b["name"])[0]["id"]
    resp = check(client, spec, "GET", "/api/locations/{id}/contents",
                 path=f"/api/locations/{bin_id}/contents")
    body = resp.json()
    assert isinstance(body["data"], list)
    assert body["binLocation"]["id"] == bin_id


def test_delete_logo(client):
    location_id = _main_warehouse_id(client)
    details = client.get_json(f"/api/locations/{location_id}/details")["data"]
    assert not details["hasLogo"], "test assumes seeded location has no logo"
    resp = check(client, spec, "DELETE", "/api/locations/{id}/logo",
                 path=f"/api/locations/{location_id}/logo")
    assert resp.status_code == 204


def test_delete_logo_unknown(client):
    resp = check(client, spec, "DELETE", "/api/locations/{id}/logo",
                 path="/api/locations/doesnotexist0000/logo")
    assert resp.status_code == 200
    assert resp.json()["data"] is None
