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


LEVEL_PATH_TEMPLATE = "/api/facilities/{facilityId}/products/{productId}/inventoryLevel"


def test_read_inventory_level(client, batch4_endpoints):
    main = client.location_id("Main Warehouse")
    product = client.product("BF640")
    resp = check(client, spec, "GET", LEVEL_PATH_TEMPLATE,
                 path=f"/api/facilities/{main}/products/{product['id']}/inventoryLevel")
    data = resp.json()["data"]
    assert data["product"]["id"] == product["id"]
    assert data["inventory"]["id"]


def test_update_inventory_level_roundtrip(client, batch4_endpoints):
    main = client.location_id("Main Warehouse")
    product = client.product("BF640")
    original = client.get_json(
        f"/api/facilities/{main}/products/{product['id']}/inventoryLevel")["data"]

    resp = check(client, spec, "PUT", LEVEL_PATH_TEMPLATE,
                 path=f"/api/facilities/{main}/products/{product['id']}/inventoryLevel",
                 json={"status": "SUPPORTED"})
    assert resp.status_code == 200
    assert resp.json()["data"]["status"] == "SUPPORTED"

    # Restore the original status to keep the suite re-runnable
    resp = check(client, spec, "PUT", LEVEL_PATH_TEMPLATE,
                 path=f"/api/facilities/{main}/products/{product['id']}/inventoryLevel",
                 json={"status": original["status"]})
    assert resp.status_code == 200
    assert resp.json()["data"]["status"] == original["status"]


def test_read_unknown_product_is_server_error(client, batch4_endpoints):
    main = client.location_id("Main Warehouse")
    resp = check(client, spec, "GET", LEVEL_PATH_TEMPLATE,
                 path=f"/api/facilities/{main}/products/ZZ-unknown/inventoryLevel")
    assert resp.status_code == 500


CRUD_PATH_TEMPLATE = "/api/inventoryLevels"
CRUD_ID_PATH_TEMPLATE = "/api/inventoryLevels/{id}"


def test_search(client, batch5_endpoints):
    resp = check(client, spec, "GET", CRUD_PATH_TEMPLATE,
                 path="/api/inventoryLevels")
    body = resp.json()
    assert body["data"], "seeded data should have inventory levels"
    assert body["totalCount"] >= len(body["data"])


def test_search_by_location(client, batch5_endpoints):
    main = client.location_id("Main Warehouse")
    resp = check(client, spec, "GET", CRUD_PATH_TEMPLATE,
                 path="/api/inventoryLevels",
                 params={"locationId": main})
    for row in resp.json()["data"]:
        assert row["inventory"]["warehouse"] == "Main Warehouse"


def test_search_by_product(client, batch5_endpoints):
    unfiltered = client.get_json("/api/inventoryLevels")["totalCount"]
    resp = check(client, spec, "GET", CRUD_PATH_TEMPLATE,
                 path="/api/inventoryLevels",
                 params={"q": "BF640"})
    body = resp.json()
    assert body["data"]
    assert body["totalCount"] < unfiltered
    for row in body["data"]:
        assert row["product"]["productCode"] == "BF640"


def test_search_csv(client, batch5_endpoints):
    resp = client.request("GET", "/api/inventoryLevels",
                          params={"format": "csv"})
    assert resp.status_code == 200
    assert "attachment" in resp.headers.get("Content-Disposition", "")


def test_get_by_id(client, batch5_endpoints):
    listed = client.get_json("/api/inventoryLevels")["data"][0]
    resp = check(client, spec, "GET", CRUD_ID_PATH_TEMPLATE,
                 path=f"/api/inventoryLevels/{listed['id']}")
    data = resp.json()["data"]
    assert data["id"] == listed["id"]
    assert data["product"]["id"] == listed["product"]["id"]


def test_get_unknown_id_is_404(client, batch5_endpoints):
    resp = check(client, spec, "GET", CRUD_ID_PATH_TEMPLATE,
                 path="/api/inventoryLevels/doesnotexist0000")
    assert resp.status_code == 404


def test_create_update_delete_roundtrip(client, batch5_endpoints):
    main = client.location_id("Main Warehouse")
    product = client.product("BF640")

    existing = client.get_json(
        f"/api/facilities/{main}/products/{product['id']}/inventoryLevel")["data"]
    if existing["id"]:
        # BF640 already has a facility-wide level in seeded data; create a
        # bin-scoped one instead so we don't hit the duplicate check.
        bins = client.get_json(f"/api/locations/{main}/binLocations")["data"]
        internal_location = {"id": bins[0]["id"]} if bins else None
    else:
        internal_location = None

    resp = check(client, spec, "POST", CRUD_PATH_TEMPLATE,
                 path="/api/inventoryLevels",
                 json={
                     "product": {"id": product["id"]},
                     "location": {"id": main},
                     "internalLocation": internal_location,
                     "status": "SUPPORTED",
                     "minQuantity": 5,
                     "reorderQuantity": 10,
                     "maxQuantity": 20,
                 })
    assert resp.status_code == 200
    created = resp.json()["data"]
    assert created["status"] == "SUPPORTED"
    assert created["minQuantity"] == 5

    # Duplicate create is rejected
    resp = check(client, spec, "POST", CRUD_PATH_TEMPLATE,
                 path="/api/inventoryLevels",
                 json={
                     "product": {"id": product["id"]},
                     "location": {"id": main},
                     "internalLocation": internal_location,
                 })
    assert resp.status_code == 400
    assert "already exists" in resp.json()["errorMessage"]

    resp = check(client, spec, "PUT", CRUD_ID_PATH_TEMPLATE,
                 path=f"/api/inventoryLevels/{created['id']}",
                 json={"maxQuantity": 50, "comments": "contract test"})
    assert resp.status_code == 200
    updated = resp.json()["data"]
    assert updated["maxQuantity"] == 50
    assert updated["comments"] == "contract test"
    # Partial update semantics: untouched keys keep their values
    assert updated["minQuantity"] == 5

    # Stale version is rejected (optimistic locking)
    resp = check(client, spec, "PUT", CRUD_ID_PATH_TEMPLATE,
                 path=f"/api/inventoryLevels/{created['id']}",
                 json={"version": 0, "comments": "stale"})
    assert resp.status_code == 400

    resp = check(client, spec, "DELETE", CRUD_ID_PATH_TEMPLATE,
                 path=f"/api/inventoryLevels/{created['id']}")
    assert resp.status_code == 200
    assert resp.json()["data"]["deleted"] is True

    resp = check(client, spec, "GET", CRUD_ID_PATH_TEMPLATE,
                 path=f"/api/inventoryLevels/{created['id']}")
    assert resp.status_code == 404
