"""Contract tests for LoginLocationsApiController (openapi/specs/login-locations-api.yaml)."""

import pytest

from oas import Spec, check

spec = Spec("login-locations-api.yaml")


@pytest.fixture(scope="module", autouse=True)
def require_endpoint(client):
    # The pinned released image predates the login locations API; only source
    # builds of this branch expose it.
    if client.request("GET", "/api/loginLocations").status_code != 200:
        pytest.skip("app build does not expose /api/loginLocations")


def test_list(client):
    resp = check(client, spec, "GET", "/api/loginLocations")
    data = resp.json()["data"]
    assert data["loginLocations"], "seeded dataset should have login locations"
    for locations in data["loginLocations"].values():
        assert locations, "organization groups should be non-empty"
        for location in locations:
            assert location["id"]
            assert location["name"]
    assert data["user"]["username"]


def test_organizations_sorted_null_last(client):
    resp = check(client, spec, "GET", "/api/loginLocations")
    orgs = list(resp.json()["data"]["loginLocations"].keys())
    named = [o for o in orgs if o != "null"]
    assert named == sorted(named)
    if "null" in orgs:
        assert orgs[-1] == "null"


def test_matches_location_chooser_locations(client):
    """Admin's login locations cover the locations exposed by the legacy
    chooser API used by the top-nav location modal."""
    resp = check(client, spec, "GET", "/api/loginLocations")
    login_location_ids = {
        location["id"]
        for locations in resp.json()["data"]["loginLocations"].values()
        for location in locations
    }
    chooser = client.get_json(
        "/api/locations",
        params={
            "locationChooser": "true",
            "applyUserFilter": "true",
            "locationTypeCode": "DEPOT",
            "activityCodes": "MANAGE_INVENTORY",
        },
    )["data"]
    assert {loc["id"] for loc in chooser} <= login_location_ids
