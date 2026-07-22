"""Contract tests for InventoryLevelApiController (openapi/specs/inventory-level-api.yaml)."""

from oas import Spec, check

spec = Spec("inventory-level-api.yaml")

PATH_TEMPLATE = "/api/facilities/{facilityId}/inventory-levels"


def test_list(client):
    main = client.location_id("Main Warehouse")
    resp = check(client, spec, "GET", PATH_TEMPLATE,
                 path=f"/api/facilities/{main}/inventory-levels")
    assert resp.json()["data"], "seeded Main Warehouse should have inventory levels"


def test_list_csv(client):
    main = client.location_id("Main Warehouse")
    resp = check(client, spec, "GET", PATH_TEMPLATE,
                 path=f"/api/facilities/{main}/inventory-levels",
                 params={"format": "csv"})
    assert "attachment" in resp.headers.get("Content-Disposition", "")


def test_list_xls(client):
    # The xls branch streams the workbook without a Content-Type header (see
    # the spec description), so the response cannot be validated with check().
    main = client.location_id("Main Warehouse")
    resp = client.request("GET", f"/api/facilities/{main}/inventory-levels",
                          params={"format": "xls"})
    assert resp.status_code == 200
    assert resp.headers.get("Content-Type") is None
    assert resp.content[:4] == b"\xd0\xcf\x11\xe0", "expected an OLE2 Excel workbook"


def test_list_unknown_facility(client):
    check(client, spec, "GET", PATH_TEMPLATE,
          path="/api/facilities/doesnotexist0000/inventory-levels")
