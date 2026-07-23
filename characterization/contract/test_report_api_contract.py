"""Contract tests for ReportApiController (openapi/specs/report-api.yaml)."""

from datetime import date

import pytest

from oas import Spec, check

spec = Spec("report-api.yaml")


@pytest.fixture(autouse=True)
def _require_report_api(client):
    # The Batch 38 report endpoints only exist in source builds; the pinned
    # baseline image responds 404 for them.
    if client.request("GET", "/api/reports/on-order-summary").status_code == 404:
        pytest.skip("report API endpoints not present in this build")


def _location_id(client, name="Main Warehouse"):
    return client.location_id(name)


def test_on_order_summary(client):
    resp = check(client, spec, "GET", "/api/reports/on-order-summary")
    assert isinstance(resp.json()["data"], list)


def test_on_order_details(client):
    resp = check(client, spec, "GET", "/api/reports/on-order-details")
    assert isinstance(resp.json()["data"], list)


def test_request_details(client):
    origin = _location_id(client)
    resp = check(client, spec, "GET", "/api/reports/request-details",
                 params={"originId": origin,
                         "startDate": "01/01/2000",
                         "endDate": "01/01/2050"})
    assert isinstance(resp.json()["data"], list)


def test_request_details_missing_params(client):
    resp = check(client, spec, "GET", "/api/reports/request-details")
    assert resp.status_code == 400
    assert "required" in resp.json()["errorMessage"]


def test_request_reason_codes(client):
    resp = check(client, spec, "GET", "/api/reports/request-reason-codes")
    data = resp.json()["data"]
    assert data
    assert all("id" in rc and "name" in rc for rc in data)


def test_inventory_by_location(client):
    origin = _location_id(client)
    resp = check(client, spec, "GET", "/api/reports/inventory-by-location",
                 params={"locations": origin})
    body = resp.json()
    assert body["locations"] == [{"id": origin, "name": "Main Warehouse"}]
    assert isinstance(body["data"], list)


def test_inventory_by_location_no_locations(client):
    resp = check(client, spec, "GET", "/api/reports/inventory-by-location")
    body = resp.json()
    assert body["locations"] == []
    assert body["data"] == []


def test_packing_list_shipments(client):
    resp = check(client, spec, "GET", "/api/reports/packing-list-shipments")
    assert isinstance(resp.json()["data"], list)


def test_packing_list_unknown_shipment(client):
    resp = check(client, spec, "GET", "/api/reports/packing-list",
                 params={"shipmentId": "bogus-shipment-id"})
    assert resp.json()["data"] is None


def test_packing_list(client):
    shipments = check(client, spec, "GET",
                      "/api/reports/packing-list-shipments").json()["data"]
    if not shipments:
        pytest.skip("no seeded shipments destined for the current location")
    resp = check(client, spec, "GET", "/api/reports/packing-list",
                 params={"shipmentId": shipments[0]["id"]})
    data = resp.json()["data"]
    assert data["shipment"]["id"] == shipments[0]["id"]
    assert isinstance(data["containers"], list)


def _today():
    return date.today().strftime("%m/%d/%Y")


def test_transaction_report(client):
    # Demo transactions are dated at seed time, so the range must end today.
    location = _location_id(client)
    resp = check(client, spec, "GET", "/api/reports/transaction-report",
                 params={"locationId": location,
                         "startDate": "01/01/2000",
                         "endDate": _today()})
    assert isinstance(resp.json()["data"], list)


def test_transaction_report_missing_params(client):
    resp = check(client, spec, "GET", "/api/reports/transaction-report")
    assert resp.status_code == 400
    assert "required" in resp.json()["errorMessage"]


def test_transaction_report_invalid_date_range(client):
    location = _location_id(client)
    resp = check(client, spec, "GET", "/api/reports/transaction-report",
                 params={"locationId": location,
                         "startDate": "01/01/2020",
                         "endDate": "01/01/2000"})
    assert resp.status_code == 400
    assert "Start date" in resp.json()["errorMessage"]


def test_transaction_report_metadata(client):
    location = _location_id(client)
    resp = check(client, spec, "GET", "/api/reports/transaction-report-metadata",
                 params={"locationId": location})
    data = resp.json()["data"]
    assert isinstance(data["productCount"], (int, float))
    assert isinstance(data["transactionCount"], (int, float))


def test_transaction_report_details(client):
    # The demo ARVS category contains products with seeded transactions.
    location = _location_id(client)
    categories = client.request("GET", "/api/categories").json()["data"]
    arvs = next((c for c in categories if c["name"] == "ARVS"), None)
    if not arvs:
        pytest.skip("demo ARVS category not present")
    rows = check(client, spec, "GET", "/api/reports/transaction-report",
                 params={"locationId": location,
                         "startDate": "01/01/2000",
                         "endDate": _today(),
                         "category": arvs["id"],
                         "includeCategoryChildren": "on"}).json()["data"]
    if not rows:
        pytest.skip("no seeded transactions in the date range")
    resp = check(client, spec, "GET", "/api/reports/transaction-report-details",
                 params={"productCode": rows[0]["productCode"],
                         "locationId": location,
                         "startDate": "01/01/2000",
                         "endDate": _today()})
    data = resp.json()["data"]
    assert data[0]["transactionCode"] == "BALANCE_OPENING"
    assert data[-1]["transactionCode"] == "BALANCE_CLOSING"


def test_transaction_report_details_missing_params(client):
    resp = check(client, spec, "GET", "/api/reports/transaction-report-details")
    assert resp.status_code == 400
    assert "required" in resp.json()["errorMessage"]


# --- Batch 37 endpoints (bin location / cycle count / shipping report / data exports) ---

report_spec = Spec("report-api.yaml")
data_export_spec = Spec("data-export-api.yaml")


@pytest.fixture(scope="module", autouse=True)
def batch37_endpoints(client):
    # The api-snapshot job runs against the pinned released image, which
    # predates the Batch 37 report endpoints. Skip there; these run against
    # source builds (and locally per RUNNING_LOCALLY.md).
    if client.request("GET", "/api/dataExports").status_code == 404:
        pytest.skip("Batch 37 report endpoints not present in target build")


def _seeded_shipment_id(client):
    data = client.get_json("/api/generic/shipment")["data"]
    if not data:
        pytest.skip("no seeded shipments")
    return data[0]["id"]


def test_bin_location_report(client):
    resp = check(client, report_spec, "GET", "/api/reports/binLocationReport")
    body = resp.json()
    assert body["location"]["id"]
    assert isinstance(body["data"], list)


def test_bin_location_report_status_filter(client):
    resp = check(client, report_spec, "GET", "/api/reports/binLocationReport",
                 params={"status": "inStock"})
    unfiltered = client.get_json("/api/reports/binLocationReport")
    assert len(resp.json()["data"]) <= len(unfiltered["data"])


def test_bin_location_report_unknown_location(client):
    check(client, report_spec, "GET", "/api/reports/binLocationReport",
          params={"location.id": "doesnotexist0000"})


def test_cycle_count_report(client):
    resp = check(client, report_spec, "GET", "/api/reports/cycleCountReport")
    body = resp.json()
    assert body["location"]["id"]
    for row in body["data"]:
        assert "quantityOnHand" in row


def test_shipping_report(client):
    sid = _seeded_shipment_id(client)
    resp = check(client, report_spec, "GET", "/api/reports/shippingReport/{id}",
                 path=f"/api/reports/shippingReport/{sid}")
    data = resp.json()["data"]
    assert data["shipment"]["id"] == sid
    assert isinstance(data["entries"], list)


def test_shipping_report_unknown(client):
    check(client, report_spec, "GET", "/api/reports/shippingReport/{id}",
          path="/api/reports/shippingReport/doesnotexist0000")


def test_data_exports(client):
    resp = check(client, data_export_spec, "GET", "/api/dataExports")
    assert isinstance(resp.json()["data"], list)
