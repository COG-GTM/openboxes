"""Contract tests for LocationApiController (openapi/specs/location-api.yaml).

The CRUD flow creates a dedicated, deterministically-named location and
deletes it afterwards so the suite stays re-runnable. The multipart import
endpoints (/api/locations/importCsv, /api/locations/{id}/binLocations/import)
are spec'd but not exercised - they would mutate the seeded baseline.
"""

import pytest

from oas import Spec, check

spec = Spec("location-api.yaml")

TEST_NAME = "ZZ Contract Location"


def _depot_type_id(client):
    types = client.get_json("/api/locations/locationTypes")["data"]
    return next(t["id"] for t in types if t["name"] == "Depot")


def _organization_id(client):
    main = client.get_json(
        f"/api/locations/{client.location_id('Main Warehouse')}")["data"]
    return main["organization"]["id"]


@pytest.fixture(scope="module", autouse=True)
def cleanup_leftovers(client):
    for loc in client.get_json("/api/locations", params={"name": TEST_NAME})["data"]:
        if str(loc.get("name", "")).startswith(TEST_NAME):
            client.request("DELETE", f"/api/locations/{loc['id']}")


def test_list(client):
    resp = check(client, spec, "GET", "/api/locations")
    assert resp.json()["data"], "seeded dataset should have locations"


def test_list_short_name_quirk(client):
    # name shorter than openboxes.typeahead.minLength (3) hits the
    # render([data: []]) branch: an empty non-JSON body.
    check(client, spec, "GET", "/api/locations", params={"name": "ab"})


def test_list_base_json_presentation(client):
    check(client, spec, "GET", "/api/locations",
          params={"presentation": "toBaseJson"})


def test_read(client):
    check(client, spec, "GET", "/api/locations/{id}",
          path=f"/api/locations/{client.location_id('Main Warehouse')}")


def test_read_unknown(client):
    # Quirk: 200 with {"data": null}, not a 404.
    resp = check(client, spec, "GET", "/api/locations/{id}",
                 path="/api/locations/doesnotexist0000")
    assert resp.json()["data"] is None


def test_product_summary(client):
    main_id = client.location_id("Main Warehouse")
    resp = check(client, spec, "GET", "/api/locations/{id}/productSummary",
                 path=f"/api/locations/{main_id}/productSummary")
    assert resp.json()["data"], "Main Warehouse should have stocked products"


def test_location_types(client):
    resp = check(client, spec, "GET", "/api/locations/locationTypes")
    assert any(t["name"] == "Depot" for t in resp.json()["data"])


def test_location_types_filtered(client):
    resp = check(client, spec, "GET", "/api/locations/locationTypes",
                 params={"activityCode": "RECEIVE_STOCK"})
    for location_type in resp.json()["data"]:
        assert "RECEIVE_STOCK" in location_type["supportedActivities"]


def test_supported_activities(client):
    resp = check(client, spec, "GET", "/api/locations/supportedActivities")
    assert "RECEIVE_STOCK" in resp.json()["data"]


def test_download_template(client):
    check(client, spec, "GET", "/api/locations/template")


def test_download_bin_location_template_missing(client):
    # The Docker baseline image does not ship templates/binLocations.xls.
    check(client, spec, "GET", "/api/locations/binLocations/template")


def test_create_update_delete(client):
    payload = {
        "name": TEST_NAME,
        "locationType": {"id": _depot_type_id(client)},
        "organization": {"id": _organization_id(client)},
    }
    resp = check(client, spec, "POST", "/api/locations", json=payload)
    location_id = resp.json()["data"]["id"]
    try:
        check(client, spec, "GET", "/api/locations/{id}",
              path=f"/api/locations/{location_id}")
        resp = check(client, spec, "PUT", "/api/locations/{id}",
                     path=f"/api/locations/{location_id}",
                     json={"description": "updated by contract suite"})
        assert resp.json()["data"]["description"] == "updated by contract suite"
    finally:
        check(client, spec, "DELETE", "/api/locations/{id}",
              path=f"/api/locations/{location_id}")


def test_update_unknown(client):
    check(client, spec, "PUT", "/api/locations/{id}",
          path="/api/locations/doesnotexist0000", json={"description": "x"})


def test_delete_unknown(client):
    check(client, spec, "DELETE", "/api/locations/{id}",
          path="/api/locations/doesnotexist0000")
