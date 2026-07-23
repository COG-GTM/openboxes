"""Contract tests for the Batch 44 migration admin dashboard endpoints
(/api/migration/* in openapi/specs/migration-api.yaml) and the localization
record endpoints added to openapi/specs/localization-api.yaml."""

import time

import pytest

from oas import Spec, check

migration_spec = Spec("migration-api.yaml")
localization_spec = Spec("localization-api.yaml")


@pytest.fixture(scope="module", autouse=True)
def require_endpoints(client):
    # The pinned released image predates the Batch 44 screen endpoints; only
    # source builds of this branch expose them.
    if client.request("GET", "/api/migration/dataQuality").status_code != 200:
        pytest.skip("app build does not expose /api/migration/*")


def test_data_quality(client):
    resp = check(client, migration_spec, "GET", "/api/migration/dataQuality")
    data = resp.json()["data"]
    assert data["receiptsWithoutTransactionCount"] >= 0
    assert data["shipmentsWithoutTransactionsCount"] >= 0
    assert data["stockMovementsWithoutShipmentItemsCount"] >= 0


def test_data_quality_counts_match_detail_lists(client):
    counts = client.get_json("/api/migration/dataQuality")["data"]

    resp = check(client, migration_spec, "GET",
                 "/api/migration/receiptsWithoutTransaction")
    body = resp.json()
    assert body["totalCount"] == len(body["data"])
    assert body["totalCount"] == counts["receiptsWithoutTransactionCount"]

    resp = check(client, migration_spec, "GET",
                 "/api/migration/shipmentsWithoutTransactions")
    body = resp.json()
    assert body["totalCount"] == len(body["data"])
    assert body["totalCount"] == counts["shipmentsWithoutTransactionsCount"]

    resp = check(client, migration_spec, "GET",
                 "/api/migration/stockMovementsWithoutShipmentItems")
    body = resp.json()
    assert body["totalCount"] == len(body["data"])
    assert body["totalCount"] == counts["stockMovementsWithoutShipmentItemsCount"]


def test_data_migration(client):
    resp = check(client, migration_spec, "GET", "/api/migration/dataMigration")
    data = resp.json()["data"]
    assert data["organizationCount"] >= 0
    assert data["inventoryTransactionCount"] >= 0
    assert isinstance(data["overlappingTransactions"], dict)
    assert isinstance(
        data["productsWithProductInventoryTransactionInCurrentLocation"], list)
    if (data["amountOfMissingInventoryImportTransactionSources"]
            + data["amountOfMissingCycleCountTransactionSources"]) != 0:
        # Only computable after the earlier migrations are complete.
        assert data["amountOfMissingRecordStockTransactionSources"] is None


def test_dimension_tables(client):
    resp = check(client, migration_spec, "GET", "/api/migration/dimensionTables")
    data = resp.json()["data"]
    for key in ("dateDimensionCount", "locationDimensionCount",
                "lotDimensionCount", "productDimensionCount"):
        assert data[key] >= 0


def test_fact_tables(client):
    resp = check(client, migration_spec, "GET", "/api/migration/factTables")
    data = resp.json()["data"]
    for key in ("transactionFactCount", "consumptionFactCount",
                "stockoutFactCount"):
        assert data[key] >= 0


def test_localization_details_unknown(client):
    check(client, localization_spec, "GET", "/api/localizations/{id}/details",
          path="/api/localizations/doesnotexist0000/details")


def test_localization_delete_unknown(client):
    check(client, localization_spec, "DELETE", "/api/localizations/{id}",
          path="/api/localizations/doesnotexist0000")


def test_localization_details_and_delete_roundtrip(client):
    # There is no create API for Localization records; create one through the
    # legacy save action (it redirects to the show screen with the new id).
    code = f"contract.test.batch44.{int(time.time() * 1000)}.label"
    resp = client.request("POST", "/localization/save",
                          data={"code": code,
                                "locale": "en",
                                "text": "Contract Test"},
                          allow_redirects=False)
    assert resp.status_code == 302, resp.text
    localization_id = resp.headers["Location"].rstrip("/").split("/")[-1]

    resp = check(client, localization_spec, "GET",
                 "/api/localizations/{id}/details",
                 path=f"/api/localizations/{localization_id}/details")
    data = resp.json()["data"]
    assert data["id"] == localization_id
    assert data["code"] == code
    assert data["locale"] == "en"
    assert data["text"] == "Contract Test"

    resp = check(client, localization_spec, "DELETE",
                 "/api/localizations/{id}",
                 path=f"/api/localizations/{localization_id}")
    assert resp.status_code == 204

    check(client, localization_spec, "GET",
          "/api/localizations/{id}/details",
          path=f"/api/localizations/{localization_id}/details")
