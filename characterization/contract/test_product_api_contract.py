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


# --- Phase 2 Batch 8 endpoints (React product screens) ---

IMPORT_CSV_HEADER = (
    "Id,Active,ProductCode,ProductType,Name,ProductFamily,Category,GLAccount,"
    "Description,UnitOfMeasure,Tags,UnitCost,LotAndExpiryControl,ColdChain,"
    "ControlledSubstance,HazardousMaterial,Reconditioned,Manufacturer,"
    "BrandName,ManufacturerCode,ManufacturerName,Vendor,VendorCode,"
    "VendorName,UPC,NDC,Created,Updated"
)



def _batch8_product_id(client):
    # Product codes are randomly generated at demo-import time on source
    # builds, so resolve the product by its stable seeded name.
    name = "Lamivudine 150mg tablet"
    data = client.get_json("/api/products/search", params={"name": name})["data"]
    matches = [p for p in data if p.get("name") == name]
    assert matches, f"Product not found in seeded data: {name}"
    return matches[0]["id"]

def test_merge_logs(client, batch8_endpoints):
    resp = check(client, spec, "GET", "/api/products/mergeLogs",
                 params={"max": "10", "offset": "0"})
    body = resp.json()
    assert isinstance(body["data"], list)
    assert isinstance(body["totalCount"], int)


def test_merge_logs_filtered(client, batch8_endpoints):
    resp = check(client, spec, "GET", "/api/products/mergeLogs",
                 params={"primaryProductCode": "ZZNOSUCHCODE"})
    assert resp.json()["data"] == []


def test_batch_edit_requires_category_or_tag(client, batch8_endpoints):
    # Mirrors legacy batchEdit: no category/tag filter -> no rows.
    resp = check(client, spec, "GET", "/api/products/batchEdit")
    assert resp.json() == {"data": [], "totalCount": 0}


def test_batch_edit_by_category(client, batch8_endpoints):
    category_id = client.get_json("/api/categoryOptions")["data"][0]["id"]
    resp = check(client, spec, "GET", "/api/products/batchEdit",
                 params={"categoryId": category_id,
                         "includeCategoryChildren": "true", "max": "5"})
    body = resp.json()
    assert isinstance(body["data"], list)
    assert body["totalCount"] >= len(body["data"])


def test_batch_save_unknown_product(client, batch8_endpoints):
    resp = check(client, spec, "POST", "/api/products/batchEdit",
                 json={"products": [{"id": "ZZNOSUCHID"}]})
    assert resp.status_code == 400


def test_batch_save_roundtrip(client, batch8_endpoints):
    pid = _batch8_product_id(client)
    details = client.get_json(f"/api/products/{pid}/details")["data"]
    resp = check(client, spec, "POST", "/api/products/batchEdit",
                 path="/api/products/batchEdit",
                 json={"products": [{"id": pid, "name": details["name"]}]})
    assert resp.json()["savedCount"] == 1


def test_details(client, batch8_endpoints):
    pid = _batch8_product_id(client)
    resp = check(client, spec, "GET", "/api/products/{id}/details",
                 path=f"/api/products/{pid}/details")
    data = resp.json()["data"]
    assert data["displayedFields"]


def test_details_unknown_id(client, batch8_endpoints):
    resp = check(client, spec, "GET", "/api/products/{id}/details",
                 path="/api/products/ZZNOSUCHID/details")
    assert resp.status_code == 404


def test_update_details_roundtrip(client, batch8_endpoints):
    # Re-save the product's current name (a no-op update).
    pid = _batch8_product_id(client)
    details = client.get_json(f"/api/products/{pid}/details")["data"]
    resp = check(client, spec, "PUT", "/api/products/{id}/details",
                 path=f"/api/products/{pid}/details",
                 json={"name": details["name"]})
    assert resp.json()["product"]["id"] == pid


def test_upload_document_empty(client, batch8_endpoints):
    pid = _batch8_product_id(client)
    resp = check(client, spec, "POST", "/api/products/{id}/documents",
                 path=f"/api/products/{pid}/documents",
                 files={"name": (None, "empty doc")})
    assert resp.status_code == 400


def test_delete_document_unknown(client, batch8_endpoints):
    pid = _batch8_product_id(client)
    resp = check(client, spec, "DELETE",
                 "/api/products/{id}/documents/{documentId}",
                 path=f"/api/products/{pid}/documents/ZZNOSUCHDOC")
    assert resp.status_code == 404


def test_document_upload_and_delete_roundtrip(client, batch8_endpoints):
    pid = _batch8_product_id(client)
    resp = check(client, spec, "POST", "/api/products/{id}/documents",
                 path=f"/api/products/{pid}/documents",
                 files={"fileContents": ("contract-test.txt", b"contract test",
                                         "text/plain")},
                 data={"name": "contract-test upload"})
    document = resp.json()["document"]
    assert document["name"] == "contract-test upload"
    resp = check(client, spec, "DELETE",
                 "/api/products/{id}/documents/{documentId}",
                 path=f"/api/products/{pid}/documents/{document['id']}")
    assert resp.status_code == 204


def test_validate_import(client, batch8_endpoints):
    # Validation only - nothing is persisted, so an unknown new product row
    # is safe to submit repeatedly.
    csv_body = IMPORT_CSV_HEADER + (
        "\n,true,,Default,Contract test product,,,,"
        ",each,,,false,false,false,false,false,,,,,,,,,,,"
    )
    resp = check(client, spec, "POST", "/api/products/validateImport",
                 data=csv_body.encode(),
                 headers={"Content-Type": "text/csv"})
    body = resp.json()
    assert body["totalCount"] == 1
    assert body["data"][0]["isNew"] is True
    assert body["data"][0]["existingProduct"] is None


def test_validate_import_invalid(client, batch8_endpoints):
    csv_body = IMPORT_CSV_HEADER + (
        "\n,true,,ZZNOSUCHTYPE,Contract test product,,,,"
        ",each,,,false,false,false,false,false,,,,,,,,,,,"
    )
    resp = check(client, spec, "POST", "/api/products/validateImport",
                 data=csv_body.encode(),
                 headers={"Content-Type": "text/csv"})
    assert resp.status_code == 400


def test_available_items(client):
    check(client, spec, "GET", "/api/products/availableItems",
          params={"location.id": client.location_id("Main Warehouse"),
                  "product.id": _batch8_product_id(client)})


def test_available_items_missing_params(client):
    resp = check(client, spec, "GET", "/api/products/availableItems")
    assert resp.status_code == 500


def test_lot_numbers_with_expiration(client):
    check(client, spec, "GET",
          "/api/products/inventoryItems/lotNumbersWithExpirationDate",
          params={"productIds": _batch8_product_id(client)})
