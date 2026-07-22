"""Contract tests for PurchaseOrderApiController (openapi/specs/purchase-order-api.yaml).

Purchase orders cannot be created through this API, so the write flow builds
a PENDING order through the legacy purchaseOrder web controller (the same
request the PO wizard issues) and deletes it via DELETE /api/purchaseOrders.
Generating an order number also increments the destination organization's
PURCHASE_ORDER_NUMBER sequence, which deleting the order does not undo, so
the module snapshots the organization's sequences up front and restores them
when it finishes, keeping the suite re-runnable.
"""

import datetime
import re

import pytest

from oas import Spec, check

spec = Spec("purchase-order-api.yaml")

PO_NAME = "ZZ Contract purchase order"
SUPPLIER_NAME = "Main Supplier"
MAIN_WAREHOUSE_ID = "1"
MAIN_WAREHOUSE_ORGANIZATION_ID = "1"


def create_pending_order(client):
    supplier_id = client.location_id(SUPPLIER_NAME)
    user_id = client.get_json("/api/getAppContext")["data"]["user"]["id"]
    now = datetime.date.today()
    resp = client.session.post(
        client.base_url + "/purchaseOrder/saveOrderDetails",
        data={
            "order.id": "",
            "orderType.id": "PURCHASE_ORDER",
            "name": PO_NAME,
            "origin.id": supplier_id,
            "destination.id": MAIN_WAREHOUSE_ID,
            "destinationParty.id": MAIN_WAREHOUSE_ORGANIZATION_ID,
            "orderedBy.id": user_id,
            "dateOrdered": f"{now.month}/{now.day}/{now.year}",
            "currencyCode": "USD",
        },
        allow_redirects=False)
    assert resp.status_code == 302, resp.text[:500]
    match = re.search(r"addItems/([0-9a-f]+)", resp.headers["location"])
    assert match, resp.headers["location"]
    return match.group(1)


@pytest.fixture(scope="module", autouse=True)
def restore_sequences(client):
    # Creating an order bumps the destination organization's
    # PURCHASE_ORDER_NUMBER sequence; restore the original value afterwards.
    org_path = f"/api/generic/organization/{MAIN_WAREHOUSE_ORGANIZATION_ID}"
    before = client.get_json(org_path)["data"].get("sequences") or None
    yield
    resp = client.request("PUT", org_path, json={"sequences": before})
    assert resp.status_code == 200, resp.text[:500]


@pytest.fixture(scope="module")
def order_id(client):
    # Leftover cleanup: delete PENDING ZZ Contract orders from aborted runs.
    for row in client.get_json("/api/purchaseOrders")["data"]:
        if row.get("name") == PO_NAME and row.get("status") == "PENDING":
            client.request("DELETE", f"/api/purchaseOrders/{row['id']}")
    oid = create_pending_order(client)
    yield oid
    client.request("DELETE", f"/api/purchaseOrders/{oid}")


def test_status_options(client):
    resp = check(client, spec, "GET", "/api/orderSummaryStatus")
    values = {o["value"] for o in resp.json()["data"]}
    assert "PENDING" in values


def test_list(client, order_id):
    resp = check(client, spec, "GET", "/api/purchaseOrders")
    assert any(row["id"] == order_id for row in resp.json()["data"])


def test_list_csv(client):
    resp = check(client, spec, "GET", "/api/purchaseOrders",
                 params={"format": "csv"})
    assert resp.text.startswith("Status,PO Number")


def test_list_csv_order_items(client):
    resp = check(client, spec, "GET", "/api/purchaseOrders",
                 params={"format": "csv", "orderItems": "true"})
    assert resp.text.startswith("Supplier organization,Supplier location")


def test_read(client, order_id):
    resp = check(client, spec, "GET", "/api/purchaseOrders/{id}",
                 path=f"/api/purchaseOrders/{order_id}")
    assert resp.json()["data"]["name"] == PO_NAME


def test_read_unknown(client):
    resp = check(client, spec, "GET", "/api/purchaseOrders/{id}",
                 path="/api/purchaseOrders/doesnotexist0000")
    # Parity quirk: not-found message immediately followed by the JSON
    # fallback render.
    assert resp.status_code == 404
    assert resp.text.endswith('{"data":null}')


def test_rollback_pending_is_noop(client, order_id):
    check(client, spec, "POST", "/api/purchaseOrders/{id}/rollback",
          path=f"/api/purchaseOrders/{order_id}/rollback", json={})


def test_rollback_unknown(client):
    resp = check(client, spec, "POST", "/api/purchaseOrders/{id}/rollback",
                 path="/api/purchaseOrders/doesnotexist0000/rollback", json={})
    assert resp.status_code == 404


def test_delete_unknown(client):
    resp = check(client, spec, "DELETE", "/api/purchaseOrders/{id}",
                 path="/api/purchaseOrders/doesnotexist0000")
    assert resp.status_code == 404


def test_delete(client):
    oid = create_pending_order(client)
    check(client, spec, "DELETE", "/api/purchaseOrders/{id}",
          path=f"/api/purchaseOrders/{oid}")
