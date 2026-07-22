"""Contract tests for InvoiceApiController (openapi/specs/invoice-api.yaml).

The demo dataset contains no invoices, and the API exposes no invoice
delete endpoint, so create/update/submit/post are spec'd against the
controller source but only their unknown-id error branches are exercised
(creating an invoice would leave an undeletable record and break the
snapshot suite's empty-list pin).
"""

from oas import Spec, check

spec = Spec("invoice-api.yaml")

UNKNOWN = "doesnotexist0000"


def test_list(client):
    check(client, spec, "GET", "/api/invoices",
          params={"max": "10", "offset": "0"})


def test_list_csv(client):
    check(client, spec, "GET", "/api/invoices", params={"format": "csv"})


def test_status_options(client):
    resp = check(client, spec, "GET", "/api/invoiceStatuses")
    assert {o["value"] for o in resp.json()["data"]} >= {"PENDING", "POSTED"}


def test_invoice_type_codes(client):
    resp = check(client, spec, "GET", "/api/invoiceTypeCodes")
    assert {o["value"] for o in resp.json()["data"]} >= {"INVOICE"}


def test_read_unknown(client):
    check(client, spec, "GET", "/api/invoices/{id}",
          path=f"/api/invoices/{UNKNOWN}")


def test_update_unknown(client):
    check(client, spec, "PUT", "/api/invoices/{id}",
          path=f"/api/invoices/{UNKNOWN}", json={"name": "x"})


def test_items_unknown_invoice(client):
    # Quirk: 200 with an empty data array, not a 404.
    resp = check(client, spec, "GET", "/api/invoices/{id}/items",
                 path=f"/api/invoices/{UNKNOWN}/items")
    assert resp.json()["data"] == []


def test_update_items_unknown_invoice_empty_list(client):
    # With an empty invoiceItems array nothing dereferences the missing
    # invoice, so this still responds 204.
    check(client, spec, "POST", "/api/invoices/{id}/items",
          path=f"/api/invoices/{UNKNOWN}/items", json={"invoiceItems": []})


def test_order_numbers_unknown_invoice(client):
    resp = check(client, spec, "GET", "/api/invoices/{id}/orders",
                 path=f"/api/invoices/{UNKNOWN}/orders")
    assert resp.json()["data"] == []


def test_shipment_numbers_unknown_invoice(client):
    resp = check(client, spec, "GET", "/api/invoices/{id}/shipments",
                 path=f"/api/invoices/{UNKNOWN}/shipments")
    assert resp.json()["data"] == []


def test_invoice_item_candidates_unknown_invoice(client):
    check(client, spec, "POST", "/api/invoices/{id}/invoiceItemCandidates",
          path=f"/api/invoices/{UNKNOWN}/invoiceItemCandidates", json={})


def test_remove_item_unknown(client):
    check(client, spec, "DELETE", "/api/invoices/{id}/removeItem",
          path=f"/api/invoices/{UNKNOWN}/removeItem")


def test_submit_unknown(client):
    check(client, spec, "POST", "/api/invoices/{id}/submit",
          path=f"/api/invoices/{UNKNOWN}/submit")


def test_post_unknown(client):
    check(client, spec, "POST", "/api/invoices/{id}/post",
          path=f"/api/invoices/{UNKNOWN}/post")


def test_prepayment_items_unknown(client):
    check(client, spec, "GET", "/api/invoices/{id}/prepaymentItems",
          path=f"/api/invoices/{UNKNOWN}/prepaymentItems")


def test_validate_invoice_item_invalid(client):
    check(client, spec, "POST", "/api/invoiceItems/{id}/validation",
          path=f"/api/invoiceItems/{UNKNOWN}/validation", json={})
