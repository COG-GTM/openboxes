"""Contract tests for DashboardApiController (openapi/specs/dashboard-api.yaml).

All indicator endpoints are read-only; updateConfig is exercised by
re-posting the user's current config so nothing effectively changes.
"""

import pytest

from oas import Spec, check

spec = Spec("dashboard-api.yaml")

NUMBER_ENDPOINTS = [
    "inventoryByLotAndBin",
    "inProgressShipments",
    "inProgressPutaways",
    "receivingBin",
    "itemsInventoried",
    "defaultBin",
    "expiredProductsInStock",
    "productWithNegativeInventory",
    "openStockRequests",
    "requestsPendingApproval",
    "inventoryValue",
    "openPurchaseOrdersCount",
]

GRAPH_ENDPOINTS = [
    "expirationSummary",
    "fillRate",
    "fillRateSnapshot",
    "inventorySummary",
    "requisitionsByYear",
    "sentStockMovements",
    "receivedStockMovements",
    "outgoingStock",
    "incomingStock",
    "discrepancy",
    "delayedShipments",
    "lossCausedByExpiry",
    "productsInventoried",
    "percentageAdHoc",
    "stockOutLastMonth",
    "backdatedOutboundShipments",
    "backdatedInboundShipments",
    "itemsWithBackdatedShipments",
]


@pytest.fixture(scope="module")
def location_id(client):
    return client.location_id("Main Warehouse")


@pytest.mark.parametrize("endpoint", NUMBER_ENDPOINTS)
def test_number_indicator(client, location_id, endpoint):
    check(client, spec, "GET", f"/api/dashboard/{endpoint}",
          params={"locationId": location_id})


@pytest.mark.parametrize("endpoint", GRAPH_ENDPOINTS)
def test_graph_indicator(client, location_id, endpoint):
    check(client, spec, "GET", f"/api/dashboard/{endpoint}",
          params={"locationId": location_id})


def test_fill_rate_destinations(client, location_id):
    resp = check(client, spec, "GET", "/api/dashboard/fillRateDestinations",
                 params={"locationId": location_id})
    assert resp.json()["data"], "should at least contain the synthetic option"


def test_get_config(client):
    resp = check(client, spec, "GET", "/api/dashboard/{id}/config",
                 path="/api/dashboard/mainDashboard/config")
    assert "dashboard" in resp.json()


def test_subdashboard_keys(client):
    resp = check(client, spec, "GET", "/api/dashboard/{id}/subdashboardKeys",
                 path="/api/dashboard/mainDashboard/subdashboardKeys")
    assert isinstance(resp.json(), list)


def test_update_config_roundtrip(client):
    current = client.get_json("/api/dashboard/mainDashboard/config")
    check(client, spec, "POST", "/api/dashboard/config", json=current)
