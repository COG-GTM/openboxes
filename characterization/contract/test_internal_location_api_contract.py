"""Contract tests for InternalLocationApiController (openapi/specs/internal-location-api.yaml)."""

from oas import Spec, check

spec = Spec("internal-location-api.yaml")


def test_list(client):
    main = client.location_id("Main Warehouse")
    resp = check(client, spec, "GET", "/api/internalLocations",
                 params={"location.id": main})
    assert resp.json()["data"], "seeded Main Warehouse should have internal locations"


def test_list_session_warehouse_default(client):
    check(client, spec, "GET", "/api/internalLocations")


def test_search(client):
    resp = check(client, spec, "GET", "/api/internalLocations/search",
                 params={"max": "5", "offset": "0"})
    assert resp.json()["data"]


def test_search_filtered_by_type(client):
    check(client, spec, "GET", "/api/internalLocations/search",
          params={"max": "5", "locationTypeCode": "BIN_LOCATION"})


def test_list_receiving(client):
    main = client.location_id("Main Warehouse")
    check(client, spec, "GET", "/api/internalLocations/receiving",
          params={"location.id": main, "shipmentNumber": "TEST123"})


def test_read(client):
    main = client.location_id("Main Warehouse")
    bins = client.get_json("/api/internalLocations", params={"location.id": main})["data"]
    bin_id = sorted(bins, key=lambda b: b["name"] or "")[0]["id"]
    resp = check(client, spec, "GET", "/api/internalLocations/{id}",
                 path=f"/api/internalLocations/{bin_id}")
    assert resp.json()["data"]["id"] == bin_id


def test_read_unknown_renders_null_data(client):
    resp = check(client, spec, "GET", "/api/internalLocations/{id}",
                 path="/api/internalLocations/doesnotexist0000")
    assert resp.json() == {"data": None}
