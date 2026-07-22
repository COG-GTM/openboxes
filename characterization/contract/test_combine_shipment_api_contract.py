"""Contract tests for CombineShipmentApiController
(openapi/specs/combine-shipment-api.yaml)."""

from oas import Spec, check

spec = Spec("combine-shipment-api.yaml")


def test_read_unknown(client):
    # The demo dataset has no orders; the parity-pinned behavior for unknown
    # ids is 200 with {"data": null}.
    resp = check(client, spec, "GET", "/api/combineShipments/{id}",
                 path="/api/combineShipments/doesnotexist0000")
    assert resp.json()["data"] is None
