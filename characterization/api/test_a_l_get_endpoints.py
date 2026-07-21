"""Snapshot tests for read-only (GET) endpoints of API controllers A-L.

Each case issues a request against the seeded app and compares the normalized
response (obx.normalize plus the A-L masks in a_l.extra_mask) to a committed
snapshot under snapshots/.

Reference records (bin location, root category, organization, location group,
location type) are resolved at runtime deterministically (sorted by name /
looked up by stable natural keys), never by generated ids.

See docs/migration/API_SNAPSHOT_COVERAGE_A.md for the coverage table.
"""

import re

import pytest

from a_l import mask_doc, warm_up_product_availability
from obx import check_snapshot, record_response

PLACEHOLDER_RE = re.compile(r"\{(\w+)\}")

DASHBOARD_ACTIONS = [
    "inventoryByLotAndBin", "inProgressShipments", "inProgressPutaways",
    "receivingBin", "itemsInventoried", "defaultBin",
    "expiredProductsInStock", "fillRate",
    "fillRateDestinations", "inventorySummary", "requisitionsByYear",
    "sentStockMovements", "receivedStockMovements", "outgoingStock",
    "incomingStock", "discrepancy", "delayedShipments",
    "productWithNegativeInventory", "lossCausedByExpiry",
    "productsInventoried", "percentageAdHoc", "stockOutLastMonth",
    "openStockRequests", "requestsPendingApproval", "inventoryValue",
    "openPurchaseOrdersCount", "backdatedOutboundShipments",
    "backdatedInboundShipments", "itemsWithBackdatedShipments",
]


@pytest.fixture(scope="session")
def refs(client):
    """Deterministically resolved reference records from the seeded dataset."""
    warm_up_product_availability(client, client.location_id("Main Warehouse"))

    bins = sorted(client.get_json("/api/binLocations")["data"], key=lambda b: b["name"])
    categories = client.get_json("/api/categories")["data"]
    root = next(c for c in categories if c.get("name") == "ROOT")
    organizations = sorted(
        client.get_json("/api/organizations")["data"], key=lambda o: o["name"])
    location_groups = sorted(
        client.get_json("/api/locationGroups")["data"], key=lambda g: g["name"])
    location_types = sorted(
        client.get_json("/api/generic/locationType/")["data"],
        key=lambda t: t.get("name") or "")
    depot = next(t for t in location_types if t.get("name") == "Depot")

    return {
        "main": client.location_id("Main Warehouse"),
        "boston": client.location_id("Boston Warehouse"),
        "binLocation": bins[0]["id"],
        "rootCategory": root["id"],
        "organization": organizations[0]["id"],
        "locationGroup": location_groups[0]["id"],
        "locationType": depot["id"],
    }


# (snapshot name, path, params)
GET_CASES = [
    # ApiController (login/logout are exercised in test_a_l_flows.py)
    ("api__status", "/api/status", {}),
    ("api__chooseLocation", "/api/chooseLocation/{main}", {}),
    ("api__chooseLocale", "/api/chooseLocale/en", {}),
    ("api__getMenuConfig", "/api/getMenuConfig", {}),
    ("api__getAppContext", "/api/getAppContext", {}),
    ("api__getRequestTypes", "/api/getRequestTypes", {}),
    ("api__supportLinks", "/api/supportLinks", {}),
    ("api__resettingInstance_command", "/api/resettingInstance/command", {}),
    # AttributeApiController
    ("attribute__list", "/api/attributes", {}),
    ("attribute__list_product_type", "/api/attributes", {"entityType": "PRODUCT"}),
    # BinLocationApiController
    ("binLocation__list", "/api/binLocations", {}),
    ("binLocation__read", "/api/binLocations/{binLocation}", {}),
    # CategoryApiController (CRUD flow in test_a_l_flows.py)
    ("category__list", "/api/categories", {}),
    ("category__read", "/api/categories/{rootCategory}", {}),
    # CombineShipmentApiController: read() renders {"data": null} for an
    # unknown order id - demo data has no orders, so we characterize that
    # behaviour with a fixed bogus id.
    ("combineShipment__read_unknown", "/api/combineShipments/doesnotexist0000", {}),
    # CombinedShipmentItemApiController
    ("combinedShipmentItem__orderNumberOptions", "/api/orderNumberOptions", {}),
    ("combinedShipmentItem__getProductsInOrders",
     "/api/combinedShipmentItems/getProductsInOrders", {"orderIds": ""}),
    ("combinedShipmentItem__exportTemplate",
     "/api/combinedShipmentItems/exportTemplate", {"blank": "true"}),
    # CycleCountApiController (GET/report endpoints)
    ("cycleCount__candidates",
     "/api/facilities/{main}/cycle-counts/candidates", {"max": "10", "offset": "0"}),
    ("cycleCount__pendingRequests",
     "/api/facilities/{main}/cycle-counts/requests/pending", {"max": "10", "offset": "0"}),
    ("cycleCount__list", "/api/facilities/{main}/cycle-counts", {}),
    ("cycleCount__report_details",
     "/api/reports/cycle-count-details", {"facility": "{main}", "max": "10", "offset": "0"}),
    ("cycleCount__report_summary",
     "/api/reports/cycle-count-summary", {"facility": "{main}", "max": "10", "offset": "0"}),
    # DashboardApiController
    ("dashboard__config", "/api/dashboard/mainDashboard/config", {}),
    ("dashboard__subdashboardKeys", "/api/dashboard/mainDashboard/subdashboardKeys", {}),
] + [
    ("dashboard__%s" % action, "/api/dashboard/%s" % action, {"locationId": "{main}"})
    for action in DASHBOARD_ACTIONS
] + [
    ("dashboard__expirationSummary", "/api/dashboard/expirationSummary",
     {"locationId": "{main}", "querySize": "3"}),
    ("dashboard__fillRateSnapshot", "/api/dashboard/fillRateSnapshot",
     {"locationId": "{main}", "destinationLocation": "{boston}"}),
    # GenericApiController (via a small stable domain: locationType;
    # create/update/delete flow in test_a_l_flows.py)
    ("generic__locationType_list", "/api/generic/locationType/", {}),
    ("generic__locationType_read", "/api/generic/locationType/{locationType}", {}),
    # HelpScoutApiController
    ("helpScout__configuration", "/api/helpscout/configuration", {}),
    # IndicatorApiController
    ("indicator__productsInventoried",
     "/api/reports/indicators/productsInventoried", {"facility": "{main}"}),
    ("indicator__inventoryAccuracy",
     "/api/reports/indicators/inventoryAccuracy", {"facility": "{main}"}),
    ("indicator__inventoryShrinkage",
     "/api/reports/indicators/inventoryShrinkage", {"facility": "{main}"}),
    # InternalLocationApiController
    ("internalLocation__list", "/api/internalLocations", {"location.id": "{main}"}),
    ("internalLocation__search", "/api/internalLocations/search", {"max": "5"}),
    ("internalLocation__listReceiving", "/api/internalLocations/receiving",
     {"location.id": "{main}", "shipmentNumber": "TEST123"}),
    ("internalLocation__read", "/api/internalLocations/{binLocation}", {}),
    # InventoryApiController
    ("inventory__reorderReport",
     "/api/facilities/{main}/inventories/reorderReport", {"max": "10", "offset": "0"}),
    # startDate/endDate are required; fixed historic range keeps it deterministic
    ("inventory__expirationHistoryReport", "/api/inventories/expirationHistoryReport",
     {"facilityId": "{main}", "startDate": "01/01/2010 00:00:00 Z",
      "endDate": "01/01/2011 00:00:00 Z"}),
    # InventoryLevelApiController
    ("inventoryLevel__list", "/api/facilities/{main}/inventory-levels", {}),
    # InventoryTransactionSummaryApiController
    ("inventoryTransactionSummary__get", "/api/reports/inventory-transactions-summary",
     {"facility": "{main}", "max": "10", "offset": "0"}),
    # InvoiceApiController: demo data contains no invoices; characterize the
    # list shape and the unknown-id error shape
    ("invoice__list", "/api/invoices", {"max": "10", "offset": "0"}),
    ("invoice__read_unknown", "/api/invoices/doesnotexist0000", {}),
    ("invoice__statusOptions", "/api/invoiceStatuses", {}),
    ("invoice__invoiceTypeCodes", "/api/invoiceTypeCodes", {}),
    # LoadDataApiController
    ("loadData__listOfDemoData", "/api/loadData/listOfDemoData", {}),
    # LocalizationApiController
    ("localization__list", "/api/localizations",
     {"languageCode": "en", "prefix": "default.button"}),
    ("localization__read", "/api/localizations/default.button.save.label", {"lang": "en"}),
    # LocationApiController
    ("location__list", "/api/locations", {}),
    ("location__read", "/api/locations/{main}", {}),
    ("location__locationTypes", "/api/locations/locationTypes", {}),
    ("location__supportedActivities", "/api/locations/supportedActivities", {}),
    ("location__productSummary", "/api/locations/{main}/productSummary", {}),
    ("location__downloadTemplate", "/api/locations/template", {}),
    ("location__downloadBinLocationTemplate", "/api/locations/binLocations/template", {}),
    # LocationGroupApiController (CRUD flow in test_a_l_flows.py)
    ("locationGroup__list", "/api/locationGroups", {}),
    ("locationGroup__read", "/api/locationGroups/{locationGroup}", {}),
    # NoopApiController: all five actions render the same
    # NotImplementedException; list + read snapshotted as representatives
    ("noop__list", "/api/noops", {}),
    ("noop__read", "/api/noops/doesnotexist0000", {}),
    # OrganizationApiController (create/delete flow in test_a_l_flows.py)
    ("organization__list", "/api/organizations", {}),
    ("organization__read", "/api/organizations/{organization}", {}),
    # PackListApiController: demo data contains no shipments; characterize
    # the unknown-id error shape
    ("packList__exportPackTemplate_unknown",
     "/api/stockMovements/packlistTemplate/doesnotexist0000", {}),
]


def resolve(refs, value):
    return PLACEHOLDER_RE.sub(lambda m: str(refs[m.group(1)]), value)


@pytest.mark.parametrize("name,path,params", GET_CASES, ids=[c[0] for c in GET_CASES])
def test_get_endpoint(client, refs, name, path, params):
    resolved_path = resolve(refs, path)
    resolved_params = {k: resolve(refs, v) for k, v in params.items()}
    resp = client.request("GET", resolved_path, params=resolved_params)
    doc = mask_doc(record_response(name, "GET", resolved_path, resp, resolved_params))
    check_snapshot(name, doc)
