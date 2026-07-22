"""Contract tests for StocklistItemApiController (openapi/specs/stocklist-item-api.yaml).

The write flow adds a product to a dedicated 'ZZ Contract ...'-named stock
list created just for these tests and removes everything afterwards so the
suite stays re-runnable.
"""

import pytest

from oas import Spec, check

spec = Spec("stocklist-item-api.yaml")

TEST_NAME = "ZZ Contract Stocklist For Items"
PRODUCT_CODE = "AX738"  # seeded demo product with stocklist rows


@pytest.fixture(scope="module", autouse=True)
def cleanup_leftovers(client):
    for published in ("true", "false"):
        data = client.get_json(
            "/api/stocklists", params={"isPublished": published})["data"]
        for sl in data:
            if (sl.get("name") or "").startswith(TEST_NAME):
                client.request("DELETE", f"/api/stocklists/{sl['id']}")


def test_available_stocklists(client):
    resp = check(client, spec, "GET", "/api/stocklistItems/availableStocklists")
    assert resp.json()["data"], "seeded dataset should have stock lists"


def test_list(client):
    pid = client.product_id(PRODUCT_CODE)
    resp = check(client, spec, "GET", "/api/stocklistItems",
                 params={"product.id": pid})
    assert resp.json()["data"], "seeded stock lists should contain the product"


def test_list_missing_product_is_500(client):
    check(client, spec, "GET", "/api/stocklistItems")


def test_read(client):
    pid = client.product_id(PRODUCT_CODE)
    rows = client.get_json("/api/stocklistItems",
                           params={"product.id": pid})["data"]
    check(client, spec, "GET", "/api/stocklistItems/{id}",
          path=f"/api/stocklistItems/{rows[0]['id']}")


def test_read_unknown(client):
    check(client, spec, "GET", "/api/stocklistItems/{id}",
          path="/api/stocklistItems/doesnotexist0000")


def test_remove_unknown_is_500(client):
    check(client, spec, "DELETE", "/api/stocklistItems/{id}",
          path="/api/stocklistItems/doesnotexist0000")


def test_create_unknown_stocklist_is_500(client):
    pid = client.product_id(PRODUCT_CODE)
    check(client, spec, "POST", "/api/stocklistItems",
          params={"product.id": pid},
          json={"stocklistId": "doesnotexist0000", "maxQuantity": 1})


def test_create_update_remove(client):
    main = client.location_id("Main Warehouse")
    boston = client.location_id("Boston Warehouse")
    pid = client.product_id(PRODUCT_CODE)
    stocklist = client.request("POST", "/api/stocklists", json={
        "name": TEST_NAME, "origin": {"id": main},
        "destination": {"id": boston}, "requestedBy": {"id": "1"},
    }).json()["data"]
    sid = stocklist["requisition.id"]
    try:
        resp = check(client, spec, "POST", "/api/stocklistItems",
                     path=f"/api/stocklistItems?product.id={pid}",
                     json={"stocklistId": sid, "maxQuantity": 7})
        item_id = resp.json()["data"]["requisitionItem.id"]

        resp = check(client, spec, "PUT", "/api/stocklistItems/{id}",
                     path=f"/api/stocklistItems/{item_id}",
                     json={"maxQuantity": 9})
        assert resp.json()["data"]["maxQuantity"] == 9

        check(client, spec, "GET", "/api/stocklistItems/{id}",
              path=f"/api/stocklistItems/{item_id}")
        check(client, spec, "DELETE", "/api/stocklistItems/{id}",
              path=f"/api/stocklistItems/{item_id}")
    finally:
        client.request("DELETE", f"/api/stocklists/{sid}")
