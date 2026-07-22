"""Contract tests for StockCardApiController (stock-card-api.yaml).

Read-only endpoints backing the React stock card screen. All operate on the
session's current location (Main Warehouse via the login fixture).
"""

import pytest

from oas import Spec, check

spec = Spec("stock-card-api.yaml")

TABS = [
    ("summary", "getStockCardSummary"),
    ("stockHistory", "getStockCardStockHistory"),
    ("allLocations", "getStockCardAllLocations"),
    ("pendingInbound", "getStockCardPendingInbound"),
    ("pendingOutbound", "getStockCardPendingOutbound"),
    ("demand", "getStockCardDemand"),
    ("snapshots", "getStockCardSnapshots"),
    ("suppliers", "getStockCardSuppliers"),
    ("documents", "getStockCardDocuments"),
    ("associations", "getStockCardAssociations"),
]


@pytest.mark.parametrize("segment", [t[0] for t in TABS])
def test_stock_card_tab(client, batch4_endpoints, segment):
    product = client.product("BF640")
    resp = check(
        client, spec, "GET", "/api/stockCard/{id}/" + segment,
        path=f"/api/stockCard/{product['id']}/{segment}",
    )
    assert resp.status_code == 200


def test_summary_has_product_and_totals(client, batch4_endpoints):
    product = client.product("BF640")
    data = client.get_json(f"/api/stockCard/{product['id']}/summary")["data"]
    assert data["product"]["productCode"] == "BF640"
    assert data["totalQuantityOnHand"] >= 0
    assert data["totalQuantityAvailableToPromise"] >= 0


def test_stock_history_balances(client, batch4_endpoints):
    product = client.product("BF640")
    data = client.get_json(f"/api/stockCard/{product['id']}/stockHistory")["data"]
    assert isinstance(data["rows"], list)
    summary = client.get_json(f"/api/stockCard/{product['id']}/summary")["data"]
    assert data["totalBalance"] == summary["totalQuantityOnHand"]


def test_unknown_product_is_server_error(client, batch4_endpoints):
    resp = check(
        client, spec, "GET", "/api/stockCard/{id}/summary",
        path="/api/stockCard/ZZ-unknown-product/summary",
    )
    assert resp.status_code == 500


TRANSACTION_LOG_PATH = "/api/stockCard/{id}/transactionLog"


def test_transaction_log(client, batch5_endpoints):
    product = client.product("BF640")
    resp = check(client, spec, "GET", TRANSACTION_LOG_PATH,
                 path=f"/api/stockCard/{product['id']}/transactionLog")
    body = resp.json()
    assert body["totalCount"] == len(body["data"])
    for row in body["data"]:
        assert row["transactionType"]["name"]


def test_transaction_log_type_filter(client, batch5_endpoints):
    product = client.product("BF640")
    all_rows = client.get_json(
        f"/api/stockCard/{product['id']}/transactionLog")["data"]
    if not all_rows:
        pytest.skip("no seeded transactions for BF640")
    type_id = all_rows[0]["transactionType"]["id"]
    resp = check(client, spec, "GET", TRANSACTION_LOG_PATH,
                 path=f"/api/stockCard/{product['id']}/transactionLog",
                 params={"transactionType.id": type_id})
    body = resp.json()
    assert body["data"], "filtering by an existing type should return rows"
    for row in body["data"]:
        assert row["transactionType"]["id"] == type_id
    # totalCount stays the unfiltered count (legacy footer parity)
    assert body["totalCount"] == len(all_rows)
