"""Contract tests for ProductClassificationApiController
(openapi/specs/product-classification-api.yaml)."""

from oas import Spec, check

spec = Spec("product-classification-api.yaml")

PATH = "/api/facilities/{facilityId}/products/classifications"


def test_list(client):
    main = client.location_id("Main Warehouse")
    check(client, spec, "GET", PATH,
          path=f"/api/facilities/{main}/products/classifications")


def test_list_invalid_facility(client):
    # Parity quirk: invalid facility ids respond 500, not 404.
    resp = check(client, spec, "GET", PATH,
                 path="/api/facilities/doesnotexist0000/products/classifications")
    assert resp.status_code == 500
