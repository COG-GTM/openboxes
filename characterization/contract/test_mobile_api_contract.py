"""Contract tests for MobileApiController (openapi/specs/mobile-api.yaml)."""

import pytest

from oas import Spec, check

spec = Spec("mobile-api.yaml")


@pytest.fixture(scope="module", autouse=True)
def batch49_endpoints(client):
    # The api-snapshot job runs against the pinned released image, which
    # predates the Batch 49 mobile endpoints. Skip there; these run against
    # source builds (and locally per RUNNING_LOCALLY.md).
    if client.request("GET", "/api/mobile/dashboard").status_code == 404:
        pytest.skip("Batch 49 mobile endpoints not present in target build")


def test_dashboard(client):
    resp = check(client, spec, "GET", "/api/mobile/dashboard")
    data = resp.json()["data"]
    assert [row["id"] for row in data] == [
        "inventoryItems", "purchaseOrders", "replenishmentOrders"]
    assert all(row["count"] >= 0 for row in data)


def test_product_summaries(client):
    resp = check(client, spec, "GET", "/api/mobile/productSummaries")
    body = resp.json()
    assert len(body["data"]) <= 10
    assert body["totalCount"] >= len(body["data"])


def test_product_summaries_pagination(client):
    resp = check(client, spec, "GET", "/api/mobile/productSummaries",
                 params={"max": 1, "offset": 0})
    assert len(resp.json()["data"]) <= 1


def test_product_summary_details(client):
    summaries = check(client, spec, "GET",
                      "/api/mobile/productSummaries").json()["data"]
    if not summaries:
        pytest.skip("no seeded product summaries for the current location")
    product = summaries[0]["product"]
    resp = check(client, spec, "GET", "/api/mobile/productSummaries/{id}",
                 path=f"/api/mobile/productSummaries/{product['id']}")
    data = resp.json()["data"]
    assert data["product"]["id"] == product["id"]
    assert "attributes" in data["product"]


def test_product_summary_details_by_product_code(client):
    summaries = check(client, spec, "GET",
                      "/api/mobile/productSummaries").json()["data"]
    if not summaries:
        pytest.skip("no seeded product summaries for the current location")
    product = summaries[0]["product"]
    resp = check(client, spec, "GET", "/api/mobile/productSummaries/{id}",
                 path=f"/api/mobile/productSummaries/{product['productCode']}")
    assert resp.json()["data"]["product"]["productCode"] == product["productCode"]


def test_product_summary_details_unknown_product(client):
    resp = check(client, spec, "GET", "/api/mobile/productSummaries/{id}",
                 path="/api/mobile/productSummaries/doesnotexist0000")
    body = resp.json()
    assert body["data"] is None
    assert "not available" in body["errorMessage"]


def test_outbound_items(client):
    resp = check(client, spec, "GET", "/api/mobile/outboundItems")
    body = resp.json()
    assert isinstance(body["data"], list)
    assert len(body["data"]) <= 10
