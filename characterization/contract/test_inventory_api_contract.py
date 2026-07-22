"""Contract tests for InventoryApiController (openapi/specs/inventory-api.yaml).

The summary/expiredStock/expiringStock endpoints were added in Phase 2 Batch 2,
so they do not exist in the pinned baseline image - those tests skip when the
endpoint responds 404 and run against source builds instead.
"""

import pytest

from oas import Spec, check

spec = Spec("inventory-api.yaml")


@pytest.fixture(scope="module")
def batch1(client):
    # The browse/transactionCandidates/binLocationDetails/adjustStock actions
    # ship with the Phase 2 batch 1 migration; skip their tests until the
    # pinned baseline image (OB_VERSION) is bumped to a build that has them.
    if client.request("GET", "/api/inventories/browse").status_code == 404:
        pytest.skip("batch 1 inventory API not deployed in the pinned baseline image")


DATE_RANGE = {
    "startDate": "01/01/2010 00:00:00 Z",
    "endDate": "01/01/2011 00:00:00 Z",
}


def test_reorder_report(client):
    main = client.location_id("Main Warehouse")
    resp = check(client, spec, "GET",
                 "/api/facilities/{facilityId}/inventories/reorderReport",
                 path=f"/api/facilities/{main}/inventories/reorderReport")
    assert resp.json()["data"], "seeded Main Warehouse should have reorder rows"


def test_reorder_report_csv(client):
    main = client.location_id("Main Warehouse")
    resp = check(client, spec, "GET",
                 "/api/facilities/{facilityId}/inventories/reorderReport",
                 path=f"/api/facilities/{main}/inventories/reorderReport",
                 params={"format": "csv"})
    assert "attachment" in resp.headers.get("Content-Disposition", "")


def test_expiration_history_report(client):
    check(client, spec, "GET", "/api/inventories/expirationHistoryReport",
          params=DATE_RANGE)


def test_expiration_history_report_csv(client):
    check(client, spec, "GET", "/api/inventories/expirationHistoryReport",
          params={**DATE_RANGE, "format": "csv"})


def test_expiration_history_report_missing_dates(client):
    check(client, spec, "GET", "/api/inventories/expirationHistoryReport")


PRODUCT_CODE = "AX738"


def category_id(client, name):
    matches = [c for c in client.get_json("/api/categories")["data"]
               if c.get("name") == name]
    assert matches, f"Category not found in seeded data: {name}"
    return matches[0]["id"]


def test_browse_default_is_root_category(client, batch1):
    # Like the legacy screen, browsing without filters defaults to the ROOT
    # category, which has no direct products in the seeded dataset.
    main = client.location_id("Main Warehouse")
    resp = check(client, spec, "GET", "/api/inventories/browse",
                 params={"locationId": main, "max": 5})
    body = resp.json()
    assert body["totalCount"] == 0


def test_browse_category(client, batch1):
    main = client.location_id("Main Warehouse")
    resp = check(client, spec, "GET", "/api/inventories/browse",
                 params={"locationId": main,
                         "categoryId": category_id(client, "ARVS"),
                         "max": 5})
    body = resp.json()
    assert body["data"], "seeded ARVS category should have browse rows"
    assert body["totalCount"] >= len(body["data"])


def test_browse_search(client, batch1):
    # PRODUCT_CODE is seeded under IT Equipment; the search is scoped to a
    # category because the default ROOT category matches nothing.
    main = client.location_id("Main Warehouse")
    resp = check(client, spec, "GET", "/api/inventories/browse",
                 params={"locationId": main,
                         "categoryId": category_id(client, "IT Equipment"),
                         "searchTerms": PRODUCT_CODE})
    codes = [row["productCode"] for row in resp.json()["data"]]
    assert PRODUCT_CODE in codes


def test_transaction_candidates(client, batch1):
    main = client.location_id("Main Warehouse")
    resp = check(client, spec, "GET", "/api/inventories/transactionCandidates",
                 params={"locationId": main,
                         "product.id": client.product_id(PRODUCT_CODE)})
    body = resp.json()
    assert body["data"], "seeded product should have candidate rows"
    assert body["totalCount"] == len(body["data"])


def test_transaction_candidates_missing_products(client, batch1):
    check(client, spec, "GET", "/api/inventories/transactionCandidates")


def test_bin_location_details(client, batch1):
    main = client.location_id("Main Warehouse")
    candidates = client.get_json(
        "/api/inventories/transactionCandidates",
        params={"locationId": main,
                "product.id": client.product_id(PRODUCT_CODE)})["data"]
    entry = candidates[0]
    resp = check(client, spec, "GET", "/api/inventories/binLocationDetails",
                 params={"locationId": main,
                         "productCode": PRODUCT_CODE,
                         "binLocation": (entry.get("binLocation") or {}).get("name") or "",
                         "lotNumber": (entry.get("inventoryItem") or {}).get("lotNumber") or ""})
    assert resp.json()["data"]["product"]["productCode"] == PRODUCT_CODE


def test_adjust_stock_roundtrip(client, batch1):
    # Adjust up by 1 and back down so the suite stays re-runnable.
    main = client.location_id("Main Warehouse")
    candidates = client.get_json(
        "/api/inventories/transactionCandidates",
        params={"locationId": main,
                "product.id": client.product_id(PRODUCT_CODE)})["data"]
    entry = next(e for e in candidates if e.get("inventoryItem"))
    payload = {
        "locationId": main,
        "inventoryItemId": entry["inventoryItem"]["id"],
        "binLocationId": (entry.get("binLocation") or {}).get("id"),
        "currentQuantity": entry["quantityOnHand"],
        "reasonCode": "CORRECTION",
        "comment": "ZZ Contract adjust stock",
    }
    check(client, spec, "POST", "/api/inventories/adjustStock",
          json={**payload, "newQuantity": entry["quantityOnHand"] + 1})
    check(client, spec, "POST", "/api/inventories/adjustStock",
          json={**payload,
                "currentQuantity": entry["quantityOnHand"] + 1,
                "newQuantity": entry["quantityOnHand"]})


def test_adjust_stock_unchanged_quantity(client, batch1):
    main = client.location_id("Main Warehouse")
    candidates = client.get_json(
        "/api/inventories/transactionCandidates",
        params={"locationId": main,
                "product.id": client.product_id(PRODUCT_CODE)})["data"]
    entry = next(e for e in candidates if e.get("inventoryItem"))
    check(client, spec, "POST", "/api/inventories/adjustStock",
          json={
              "locationId": main,
              "inventoryItemId": entry["inventoryItem"]["id"],
              "binLocationId": (entry.get("binLocation") or {}).get("id"),
              "currentQuantity": entry["quantityOnHand"],
              "newQuantity": entry["quantityOnHand"],
              "reasonCode": "CORRECTION",
              "comment": "ZZ Contract adjust stock noop",
          })


@pytest.fixture(scope="module")
def batch2_endpoints(client):
    main = client.location_id("Main Warehouse")
    if client.request("GET", f"/api/facilities/{main}/inventories/summary").status_code == 404:
        pytest.skip("inventory summary/expiration endpoints not present in this build")
    return main


def test_inventory_summary(client, batch2_endpoints):
    main = batch2_endpoints
    resp = check(client, spec, "GET",
                 "/api/facilities/{facilityId}/inventories/summary",
                 path=f"/api/facilities/{main}/inventories/summary")
    body = resp.json()
    assert body["data"], "seeded Main Warehouse should have inventory rows"
    assert body["totalCount"] == len(body["data"])


def test_inventory_summary_low_stock(client, batch2_endpoints):
    main = batch2_endpoints
    resp = check(client, spec, "GET",
                 "/api/facilities/{facilityId}/inventories/summary",
                 path=f"/api/facilities/{main}/inventories/summary",
                 params={"status": "lowStock"})
    all_rows = client.get_json(
        f"/api/facilities/{main}/inventories/summary")["data"]
    assert len(resp.json()["data"]) <= len(all_rows)


def test_expired_stock(client, batch2_endpoints):
    main = batch2_endpoints
    resp = check(client, spec, "GET",
                 "/api/facilities/{facilityId}/inventories/expiredStock",
                 path=f"/api/facilities/{main}/inventories/expiredStock")
    data = resp.json()["data"]
    assert data["totalCount"] == len(data["items"])


def test_expiring_stock(client, batch2_endpoints):
    main = batch2_endpoints
    resp = check(client, spec, "GET",
                 "/api/facilities/{facilityId}/inventories/expiringStock",
                 path=f"/api/facilities/{main}/inventories/expiringStock")
    data = resp.json()["data"]
    assert data["totalCount"] == len(data["items"])


def test_expiring_stock_status_filter(client, batch2_endpoints):
    main = batch2_endpoints
    check(client, spec, "GET",
          "/api/facilities/{facilityId}/inventories/expiringStock",
          path=f"/api/facilities/{main}/inventories/expiringStock",
          params={"status": "within30Days"})


@pytest.fixture(scope="module")
def batch3_endpoints(client):
    main = client.location_id("Main Warehouse")
    if client.request(
            "GET", f"/api/facilities/{main}/inventories/binLocations").status_code == 404:
        pytest.skip("inventory batch 3 endpoints not present in this build")
    return main


def test_inventory_summary_reorder_stock(client, batch3_endpoints):
    main = batch3_endpoints
    resp = check(client, spec, "GET",
                 "/api/facilities/{facilityId}/inventories/summary",
                 path=f"/api/facilities/{main}/inventories/summary",
                 params={"status": "reorderStock"})
    all_rows = client.get_json(
        f"/api/facilities/{main}/inventories/summary")["data"]
    assert len(resp.json()["data"]) <= len(all_rows)


def test_bin_locations(client, batch3_endpoints):
    main = batch3_endpoints
    resp = check(client, spec, "GET",
                 "/api/facilities/{facilityId}/inventories/binLocations",
                 path=f"/api/facilities/{main}/inventories/binLocations")
    body = resp.json()
    assert body["data"], "seeded Main Warehouse should have stock rows"
    assert body["totalCount"] == len(body["data"])


def test_products_without_default_inventory_item(client, batch3_endpoints):
    resp = check(client, spec, "GET",
                 "/api/inventories/productsWithoutDefaultInventoryItem")
    body = resp.json()
    assert body["totalCount"] == len(body["data"])


# createDefaultInventoryItems is not exercised - a successful call would
# mutate the seeded dataset by creating blank-lot inventory items.


def test_upload_inventory_missing_file(client, batch3_endpoints):
    # A real upload only parses the file (no mutation), but building a valid
    # Excel workbook here would add a test dependency, so only the
    # missing-file error branch is exercised.
    main = batch3_endpoints
    check(client, spec, "POST",
          "/api/facilities/{facilityId}/inventories/upload",
          path=f"/api/facilities/{main}/inventories/upload",
          files={"other": ("empty.txt", b"")})


def test_import_csv_empty_body(client):
    # A successful import would mutate the seeded inventory, so only the
    # empty-body error branch is exercised (IllegalArgumentException -> 500).
    main = client.location_id("Main Warehouse")
    check(client, spec, "POST",
          "/api/facilities/{facilityId}/inventories/import",
          path=f"/api/facilities/{main}/inventories/import",
          data=b"", headers={"Content-Type": "text/csv"})


def test_product_group_summary(client, batch4_endpoints):
    main = client.location_id("Main Warehouse")
    resp = check(client, spec, "GET",
                 "/api/facilities/{facilityId}/inventories/productGroupSummary",
                 path=f"/api/facilities/{main}/inventories/productGroupSummary",
                 params={"status": ["IN_STOCK", "STOCK_OUT", "LOW_STOCK",
                                    "REORDER", "IDEAL_STOCK", "OVERSTOCK",
                                    "INVALID"]})
    data = resp.json()["data"]
    assert data["rows"], "seeded Main Warehouse should have in-stock products"
    assert data["totalValue"] >= 0
    assert data["totalValueFormatted"]


def test_product_group_summary_no_status_is_empty(client, batch4_endpoints):
    main = client.location_id("Main Warehouse")
    resp = check(client, spec, "GET",
                 "/api/facilities/{facilityId}/inventories/productGroupSummary",
                 path=f"/api/facilities/{main}/inventories/productGroupSummary")
    assert resp.json()["data"]["rows"] == []
