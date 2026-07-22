"""Contract tests for PutawayApiController (openapi/specs/putaway-api.yaml).

The write flow creates a PENDING putaway (a PUTAWAY order) with one item and
removes the order afterwards through the generic API, so the suite stays
re-runnable. Completed putaways need received stock sitting in a receiving
bin, which the seeded dataset does not provide; the COMPLETED branch is
covered by the Playwright putaway flow instead.
"""

import pytest

from oas import Spec, check

spec = Spec("putaway-api.yaml")

PRODUCT_NAME = "Lamivudine 150mg tablet"


@pytest.fixture()
def pending_putaway(client):
    products = client.get_json("/api/products/search",
                               params={"name": PRODUCT_NAME})["data"]
    product_id = next(p["id"] for p in products if p["name"] == PRODUCT_NAME)
    resp = check(client, spec, "POST", "/api/putaways",
                 json={"putawayStatus": "PENDING",
                       "putawayItems": [{"product": {"id": product_id},
                                         "quantity": 1}]})
    putaway = resp.json()["data"]
    yield putaway
    client.request("DELETE", f"/api/generic/order/{putaway['id']}")


def test_list(client):
    check(client, spec, "GET", "/api/putaways")


def test_list_unknown_location(client):
    resp = check(client, spec, "GET", "/api/putaways",
                 params={"location.id": "doesnotexist0000"})
    assert resp.status_code == 500


def test_create_and_read(client, pending_putaway):
    assert pending_putaway["putawayStatus"] == "PENDING"
    assert len(pending_putaway["putawayItems"]) == 1
    check(client, spec, "GET", "/api/putaways/{id}",
          path=f"/api/putaways/{pending_putaway['id']}")


def test_read_with_sort(client, pending_putaway):
    resp = check(client, spec, "GET", "/api/putaways/{id}",
                 path=f"/api/putaways/{pending_putaway['id']}",
                 params={"sortBy": "currentBins"})
    assert resp.json()["data"]["sortBy"] == "currentBins"


def test_read_unknown(client):
    resp = check(client, spec, "GET", "/api/putaways/{id}",
                 path="/api/putaways/doesnotexist0000")
    assert resp.status_code == 500


def test_create_without_status(client):
    resp = check(client, spec, "POST", "/api/putaways",
                 json={"putawayItems": []})
    assert resp.status_code == 500
