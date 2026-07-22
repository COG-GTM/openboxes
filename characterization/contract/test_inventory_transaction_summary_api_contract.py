"""Contract tests for InventoryTransactionSummaryApiController
(openapi/specs/inventory-transaction-summary-api.yaml)."""

from oas import Spec, check

spec = Spec("inventory-transaction-summary-api.yaml")

PATH = "/api/reports/inventory-transactions-summary"


def test_get_summary(client):
    main = client.location_id("Main Warehouse")
    check(client, spec, "GET", PATH,
          params={"facility": main, "max": "10", "offset": "0"})


def test_get_summary_with_date_range(client):
    main = client.location_id("Main Warehouse")
    check(client, spec, "GET", PATH,
          params={"facility": main, "max": "10", "offset": "0",
                  "startDate": "01/01/2010 00:00:00 Z",
                  "endDate": "01/01/2030 00:00:00 Z"})


def test_get_summary_csv(client):
    # CSV is only selectable via the .csv URL extension (a format=csv query
    # parameter is ignored, see the spec description).
    main = client.location_id("Main Warehouse")
    resp = check(client, spec, "GET", PATH + ".csv",
                 params={"facility": main})
    assert "attachment" in resp.headers.get("Content-Disposition", "")


def test_get_summary_format_csv_query_param_ignored(client):
    # Pins the quirk: format=csv as a query parameter is ignored on the
    # extensionless path and plain JSON is returned.
    main = client.location_id("Main Warehouse")
    resp = check(client, spec, "GET", PATH,
                 params={"facility": main, "format": "csv",
                         "max": "10", "offset": "0"})
    assert resp.headers.get("Content-Type", "").startswith("application/json")


def test_get_summary_missing_facility(client):
    check(client, spec, "GET", PATH, params={"max": "10", "offset": "0"})
