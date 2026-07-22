"""Contract tests for CombinedShipmentItemApiController
(openapi/specs/combined-shipment-item-api.yaml)."""

from oas import Spec, check

spec = Spec("combined-shipment-item-api.yaml")


def test_order_number_options(client):
    check(client, spec, "GET", "/api/orderNumberOptions")


def test_find_order_items(client):
    check(client, spec, "POST", "/api/combinedShipmentItems/findOrderItems",
          json={})


def test_add_to_shipment_unknown(client):
    check(client, spec, "POST", "/api/combinedShipmentItems/addToShipment/{id}",
          path="/api/combinedShipmentItems/addToShipment/doesnotexist0000",
          json={"itemsToAdd": []})


def test_get_products_in_orders(client):
    check(client, spec, "GET", "/api/combinedShipmentItems/getProductsInOrders")


def test_export_template_blank(client):
    check(client, spec, "GET", "/api/combinedShipmentItems/exportTemplate",
          params={"blank": "true"})
