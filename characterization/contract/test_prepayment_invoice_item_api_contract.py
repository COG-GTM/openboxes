"""Contract tests for PrepaymentInvoiceItemApiController
(openapi/specs/prepayment-invoice-item-api.yaml).

The happy paths (updating/deleting an item on a non-posted final invoice of a
prepaid purchase order) need fixtures the seeded demo dataset cannot provide,
so only the pinned error branches are exercised here: every business-rule
failure surfaces as IllegalArgumentException -> 500 (never 404/400).
"""

from oas import Spec, check

spec = Spec("prepayment-invoice-item-api.yaml")


def test_update_unknown_item(client):
    resp = check(client, spec, "POST", "/api/prepaymentInvoiceItems/{id}",
                 path="/api/prepaymentInvoiceItems/doesnotexist0000",
                 json={"quantity": 1})
    assert resp.status_code == 500


def test_update_missing_attributes(client):
    # Neither quantity nor unitPrice -> "Missing required attributes".
    resp = check(client, spec, "POST", "/api/prepaymentInvoiceItems/{id}",
                 path="/api/prepaymentInvoiceItems/doesnotexist0000",
                 json={})
    assert resp.status_code == 500


def test_delete_unknown_item(client):
    resp = check(client, spec, "DELETE", "/api/prepaymentInvoiceItems/{id}",
                 path="/api/prepaymentInvoiceItems/doesnotexist0000")
    assert resp.status_code == 500
