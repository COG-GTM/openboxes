"""Contract tests for PrepaymentInvoiceApiController
(openapi/specs/prepayment-invoice-api.yaml).

The happy path (200, empty body) needs a final invoice linked to a
prepayment invoice via a purchase order with prepayment items - fixtures the
demo dataset cannot provide via the API - so only the error branch is
exercised; the 200 response is still spec'd.
"""

from oas import Spec, check

spec = Spec("prepayment-invoice-api.yaml")


def test_update_items_unknown_invoice(client):
    resp = check(client, spec, "POST",
                 "/api/prepaymentInvoices/{id}/invoiceItems",
                 path="/api/prepaymentInvoices/doesnotexist0000/invoiceItems",
                 json=[])
    assert resp.status_code == 500
    assert "Cannot find invoice" in resp.json()["errorMessage"]
