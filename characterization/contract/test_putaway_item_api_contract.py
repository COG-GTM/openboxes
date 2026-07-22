"""Contract tests for PutawayItemApiController (openapi/specs/putaway-item-api.yaml)."""

from oas import Spec, check

spec = Spec("putaway-item-api.yaml")

PRODUCT_NAME = "Lamivudine 150mg tablet"


def test_remove_item(client):
    products = client.get_json("/api/products/search",
                               params={"name": PRODUCT_NAME})["data"]
    product_id = next(p["id"] for p in products if p["name"] == PRODUCT_NAME)
    putaway = client.request(
        "POST", "/api/putaways",
        json={"putawayStatus": "PENDING",
              "putawayItems": [{"product": {"id": product_id},
                                "quantity": 1}]}).json()["data"]
    try:
        item_id = putaway["putawayItems"][0]["id"]
        check(client, spec, "DELETE", "/api/putawayItems/{id}",
              path=f"/api/putawayItems/{item_id}")
    finally:
        client.request("DELETE", f"/api/generic/order/{putaway['id']}")


def test_remove_unknown_item(client):
    resp = check(client, spec, "DELETE", "/api/putawayItems/{id}",
                 path="/api/putawayItems/doesnotexist0000")
    assert resp.status_code == 500
