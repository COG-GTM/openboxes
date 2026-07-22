"""Contract tests for ProductApiController (openapi/specs/product-api.yaml).

POST /api/products and POST /api/products/import are specced but their happy
paths are not exercised: products cannot be deleted through the API, so a
successful create/import would permanently grow the seeded dataset. The
validation-error branch of save() is exercised instead.
"""

from oas import Spec, check

spec = Spec("product-api.yaml")

PRODUCT_CODE = "AX738"


def test_list(client):
    resp = check(client, spec, "GET", "/api/products",
                 params={"max": "10", "offset": "0"})
    body = resp.json()
    assert body["data"] and body["totalCount"]


def test_list_csv(client):
    resp = check(client, spec, "GET", "/api/products",
                 params={"format": "csv"})
    assert resp.headers["Content-Type"].startswith("text/csv")


def test_search(client):
    resp = check(client, spec, "GET", "/api/products/search",
                 params={"name": "Adapter"})
    assert resp.json()["data"]


def test_create_invalid(client):
    # An empty product fails domain validation (name is required) -> 400.
    resp = check(client, spec, "POST", "/api/products", json={})
    assert resp.status_code == 400


def test_demand(client):
    pid = client.product_id(PRODUCT_CODE)
    check(client, spec, "GET", "/api/products/{id}/demand",
          path=f"/api/products/{pid}/demand")


def test_demand_summary(client):
    pid = client.product_id(PRODUCT_CODE)
    check(client, spec, "GET", "/api/products/{id}/demandSummary",
          path=f"/api/products/{pid}/demandSummary")


def test_product_summary(client):
    pid = client.product_id(PRODUCT_CODE)
    check(client, spec, "GET", "/api/products/{id}/productSummary",
          path=f"/api/products/{pid}/productSummary")


def test_product_availability(client):
    pid = client.product_id(PRODUCT_CODE)
    check(client, spec, "GET", "/api/products/{id}/productAvailability",
          path=f"/api/products/{pid}/productAvailability")


def test_available_bins(client):
    pid = client.product_id(PRODUCT_CODE)
    check(client, spec, "GET", "/api/products/{id}/availableBins",
          path=f"/api/products/{pid}/availableBins")


def test_substitutions(client):
    pid = client.product_id(PRODUCT_CODE)
    resp = check(client, spec, "GET", "/api/products/{id}/substitutions",
                 path=f"/api/products/{pid}/substitutions")
    assert "substitutions" in resp.json()["data"]


def test_associated_products(client):
    pid = client.product_id(PRODUCT_CODE)
    resp = check(client, spec, "GET", "/api/products/{id}/associatedProducts",
                 path=f"/api/products/{pid}/associatedProducts",
                 params={"type": "SUBSTITUTE"})
    assert "productAssociations" in resp.json()["data"]


def test_with_catalogs(client):
    pid = client.product_id(PRODUCT_CODE)
    check(client, spec, "GET", "/api/products/{id}/withCatalogs",
          path=f"/api/products/{pid}/withCatalogs")


def test_product_availability_and_demand(client):
    pid = client.product_id(PRODUCT_CODE)
    check(client, spec, "GET",
          "/api/products/{id}/productAvailabilityAndDemand",
          path=f"/api/products/{pid}/productAvailabilityAndDemand",
          params={"locationId": client.location_id("Main Warehouse")})


def test_product_demand_between_locations(client):
    pid = client.product_id(PRODUCT_CODE)
    check(client, spec, "GET", "/api/products/{id}/productDemand",
          path=f"/api/products/{pid}/productDemand",
          params={"originId": client.location_id("Main Warehouse"),
                  "destinationId": client.location_id("Boston Warehouse")})


def test_get_inventory_item_unknown_lot(client):
    pid = client.product_id(PRODUCT_CODE)
    resp = check(client, spec, "GET",
                 "/api/products/{productId}/inventoryItems/{lotNumber}",
                 path=f"/api/products/{pid}/inventoryItems/ZZNOSUCHLOT")
    # Parity quirk: unknown lots do not 404.
    assert resp.json() == {"inventoryItem": None, "quantityOnHand": 0}


def test_latest_inventory_count_date(client):
    check(client, spec, "GET", "/api/products/getLatestInventoryCountDate",
          params={"productIds": client.product_id(PRODUCT_CODE)})


def test_available_items(client):
    check(client, spec, "GET", "/api/products/availableItems",
          params={"location.id": client.location_id("Main Warehouse"),
                  "product.id": client.product_id(PRODUCT_CODE)})


def test_available_items_missing_params(client):
    resp = check(client, spec, "GET", "/api/products/availableItems")
    assert resp.status_code == 500


def test_lot_numbers_with_expiration(client):
    check(client, spec, "GET",
          "/api/products/inventoryItems/lotNumbersWithExpirationDate",
          params={"productIds": client.product_id(PRODUCT_CODE)})
