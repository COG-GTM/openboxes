"""Contract tests for BinLocationApiController (openapi/specs/bin-location-api.yaml)."""

from oas import Spec, check

spec = Spec("bin-location-api.yaml")


def test_list(client):
    resp = check(client, spec, "GET", "/api/binLocations")
    assert resp.json()["data"], "seeded Main Warehouse should have bin locations"


def test_read(client):
    bins = client.get_json("/api/binLocations")["data"]
    bin_id = sorted(bins, key=lambda b: b["name"])[0]["id"]
    check(client, spec, "GET", "/api/binLocations/{id}",
          path=f"/api/binLocations/{bin_id}")


def test_read_unknown(client):
    check(client, spec, "GET", "/api/binLocations/{id}",
          path="/api/binLocations/doesnotexist0000")
