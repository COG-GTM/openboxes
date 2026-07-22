"""Contract tests for IndicatorApiController (openapi/specs/indicator-api.yaml)."""

from oas import Spec, check

spec = Spec("indicator-api.yaml")

DATE_RANGE = {
    "startDate": "01/01/2010 00:00:00 Z",
    "endDate": "01/01/2030 00:00:00 Z",
}


def test_products_inventoried(client):
    main = client.location_id("Main Warehouse")
    check(client, spec, "GET", "/api/reports/indicators/productsInventoried",
          params={"facility": main})


def test_products_inventoried_with_date_range(client):
    main = client.location_id("Main Warehouse")
    check(client, spec, "GET", "/api/reports/indicators/productsInventoried",
          params={"facility": main, **DATE_RANGE})


def test_inventory_accuracy(client):
    main = client.location_id("Main Warehouse")
    resp = check(client, spec, "GET", "/api/reports/indicators/inventoryAccuracy",
                 params={"facility": main, **DATE_RANGE})
    assert resp.json()["data"]["name"] == "inventoryAccuracy"


def test_products_inventoried_missing_facility(client):
    # Missing facility is not validated; the queries match nothing and the
    # tile renders with zero values.
    resp = check(client, spec, "GET", "/api/reports/indicators/productsInventoried")
    assert resp.json()["data"]["value"] == 0


def test_inventory_accuracy_missing_facility(client):
    resp = check(client, spec, "GET", "/api/reports/indicators/inventoryAccuracy")
    assert resp.json()["data"]["firstValue"] == 0


def test_inventory_shrinkage(client):
    main = client.location_id("Main Warehouse")
    resp = check(client, spec, "GET", "/api/reports/indicators/inventoryShrinkage",
                 params={"facility": main, **DATE_RANGE})
    assert resp.json()["data"]["name"] == "inventoryShrinkage"
