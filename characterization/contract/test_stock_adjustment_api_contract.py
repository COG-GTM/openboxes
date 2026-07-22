"""Contract tests for StockAdjustmentApiController (stock-adjustment-api.yaml).

PARITY QUIRK: POST /api/stockAdjustments is currently broken - the controller
assigns AdjustStockCommand.quantity, a property that does not exist, so every
request fails with a 500 MissingPropertyException before adjusting anything.
The spec pins this behavior; if these tests start failing with a 2xx, the
application was fixed and the spec should be updated.
"""

from oas import Spec, check

spec = Spec("stock-adjustment-api.yaml")


def test_create_stock_adjustment_currently_fails_with_500(client):
    main = client.location_id("Main Warehouse")
    product = client.product("AX738")
    resp = check(
        client, spec, "POST", "/api/stockAdjustments",
        params={"location.id": main},
        json=[
            {
                "productId": product["id"],
                "lotNumber": "",
                "binLocation": {"id": ""},
                "quantityAdjusted": 1,
                "comments": "ZZ Contract stock adjustment",
            },
        ],
    )
    assert resp.status_code == 500
    body = resp.json()
    assert body["cause"] == "groovy.lang.MissingPropertyException"
    assert "No such property: quantity" in body["errorMessage"]
