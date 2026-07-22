"""Contract tests for FulfillmentApiController (openapi/specs/fulfillment-api.yaml).

The happy-path save() issues a real outbound stock movement (1 unit of a
high-stock seeded lot from Main Warehouse to Boston Warehouse), which is the
only way to pin the 200 response; the suite stays re-runnable because stock
stays deeply positive.
"""

import datetime

import pytest

from oas import Spec, check

spec = Spec("fulfillment-api.yaml")

PRODUCT_CODE = "QX039"  # Morphine 10mg, seeded with 100,000 units
LOT_NUMBER = "37627"
BIN_LOCATION = "RM1-RACK1-SHELF1"


@pytest.fixture(scope="module")
def valid_body(client):
    origin = client.location_id("Main Warehouse")
    destination = client.location_id("Boston Warehouse")
    yesterday = datetime.date.today() - datetime.timedelta(days=1)
    tomorrow = datetime.date.today() + datetime.timedelta(days=1)
    return {
        "fulfillmentDetails": {
            "origin": origin,
            "destination": destination,
            "requestedBy": "1",
            "dateRequested": yesterday.strftime("%m/%d/%Y"),
        },
        "sendingOptions": {
            # save() posts a transaction at this date, which must not be in
            # the future, hence yesterday
            "expectedShippingDate": yesterday.strftime("%m/%d/%Y 12:00 +00:00"),
            "expectedDeliveryDate": tomorrow.strftime("%m/%d/%Y 12:00 +00:00"),
            "shipmentType": "1",
        },
        "packingList": [
            {
                "rowId": "1",
                "origin": origin,
                "product": PRODUCT_CODE,
                "lotNumber": LOT_NUMBER,
                "binLocation": BIN_LOCATION,
                "quantityPicked": 1,
            }
        ],
    }


def test_validate_ok(client, valid_body):
    resp = check(client, spec, "POST", "/api/fulfillments/validate",
                 json=valid_body)
    assert resp.status_code == 200
    assert resp.json()["errors"] == {
        "fulfillmentDetails": {}, "packingList": {}, "sendingOptions": {}}


def test_validate_errors(client, valid_body):
    body = {**valid_body,
            "packingList": [{"rowId": "1", "product": PRODUCT_CODE,
                             "quantityPicked": 1}]}
    resp = check(client, spec, "POST", "/api/fulfillments/validate", json=body)
    assert resp.status_code == 400
    assert resp.json()["errors"]["packingList"]["1"]


def test_save_ok(client, valid_body):
    resp = check(client, spec, "POST", "/api/fulfillments", json=valid_body)
    assert resp.status_code == 200
    assert resp.json()["data"]["statusCode"] == "DISPATCHED"


def test_save_command_errors(client, valid_body):
    body = {**valid_body,
            "packingList": [{"rowId": "1", "product": PRODUCT_CODE,
                             "quantityPicked": 1}]}
    resp = check(client, spec, "POST", "/api/fulfillments", json=body)
    assert resp.status_code == 400
    assert resp.json()["errors"]["packingList"]["1"]


def test_save_domain_error(client, valid_body):
    future = datetime.date.today() + datetime.timedelta(days=1)
    body = {**valid_body,
            "sendingOptions": {**valid_body["sendingOptions"],
                               "expectedShippingDate":
                                   future.strftime("%m/%d/%Y 12:00 +00:00")}}
    resp = check(client, spec, "POST", "/api/fulfillments", json=body)
    assert resp.status_code == 400
    assert "errorMessage" in resp.json()
