"""Contract tests for ReplenishmentApiController (replenishment-api.yaml).

The seeded demo dataset has no transfer orders or replenishment
requirements, so the read-only endpoints render empty lists; the write flow
(create + picklists) needs bin-location/inventory-level fixtures that cannot
be cleaned up over the API (transfer orders have no delete endpoint), so it
is not exercised here.
"""

import pytest

from oas import Spec, check

spec = Spec("replenishment-api.yaml")


def test_list_replenishments(client):
    resp = check(client, spec, "GET", "/api/replenishments")
    assert isinstance(resp.json()["data"], list)


def test_status_options(client):
    resp = check(client, spec, "GET", "/api/replenishments/statusOptions")
    assert {option["id"] for option in resp.json()["data"]} == {
        "BELOW_MINIMUM", "BELOW_REORDER", "BELOW_MAXIMUM",
    }


def test_requirements(client):
    main = client.location_id("Main Warehouse")
    resp = check(client, spec, "GET", "/api/requirements", params={"location.id": main})
    assert isinstance(resp.json()["data"], list)


def test_requirements_without_location_is_500(client):
    resp = check(client, spec, "GET", "/api/requirements")
    assert resp.status_code == 500
    assert resp.json()["cause"] == "java.lang.NullPointerException"


def test_read_unknown_replenishment_is_500_not_404(client):
    resp = check(
        client, spec, "GET", "/api/replenishments/{id}",
        path="/api/replenishments/zz-contract-missing",
    )
    assert resp.status_code == 500
    assert resp.json()["cause"] == "java.lang.IllegalArgumentException"
    assert "No replenishment found" in resp.json()["errorMessage"]


def test_print_unknown_order_is_404(client):
    # The print endpoint was added in Batch 6; older builds 404 with an HTML
    # error page instead of the JSON body - skip there.
    resp = client.request("GET", "/api/replenishments/zz-contract-missing/print")
    if "application/json" not in resp.headers.get("Content-Type", ""):
        pytest.skip("replenishment print endpoint not present in target build")
    check(client, spec, "GET", "/api/replenishments/{id}/print",
          path="/api/replenishments/zz-contract-missing/print")


def test_print_existing_orders(client):
    # The seeded demo dataset has no transfer orders, so this exercises the
    # 200 branch only when one exists (e.g. created through the UI).
    orders = client.get_json("/api/replenishments")["data"]
    if not orders:
        pytest.skip("no seeded transfer orders to print")
    resp = check(client, spec, "GET", "/api/replenishments/{id}/print",
                 path=f"/api/replenishments/{orders[0]['id']}/print")
    data = resp.json()["data"]
    assert data["order"]["id"] == orders[0]["id"]
    assert isinstance(data["zones"], list)
