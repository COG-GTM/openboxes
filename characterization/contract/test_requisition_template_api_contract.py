"""Contract tests for RequisitionTemplateApiController
(openapi/specs/requisition-template-api.yaml) plus the Batch 17 canceled
requisition item list endpoint (requisition-item-api.yaml).

Created templates use a ZZ-prefixed name and are deleted afterwards via the
stocklist API (a requisition template backs every stocklist).
"""

import pytest

from oas import Spec, check

spec = Spec("requisition-template-api.yaml")
item_spec = Spec("requisition-item-api.yaml")

TEST_NAME = "ZZ Contract Template"
PRODUCT_CODE = "AX738"  # seeded demo product used across the contract suites


@pytest.fixture(scope="module", autouse=True)
def cleanup_leftovers(client, batch17_endpoints):
    for template in client.get_json("/api/stocklists")["data"]:
        if (template.get("name") or "").startswith(TEST_NAME):
            client.request("DELETE", f"/api/stocklists/{template['id']}")


@pytest.fixture()
def template_id(client):
    resp = client.request("POST", "/api/requisitionTemplates", json={
        "type": "STOCK",
        "name": TEST_NAME,
        "originId": client.location_id("Main Warehouse"),
        "destinationId": client.location_id("Boston Office"),
        "requestedById": "1",
        "replenishmentTypeCode": "PUSH",
        "description": "contract test template",
    })
    assert resp.status_code == 201
    template_id = resp.json()["data"]["id"]
    yield template_id
    client.request("DELETE", f"/api/stocklists/{template_id}")


def test_create_template(client):
    resp = check(client, spec, "POST", "/api/requisitionTemplates",
                 json={
                     "type": "STOCK",
                     "name": TEST_NAME + " create",
                     "originId": client.location_id("Main Warehouse"),
                     "destinationId": client.location_id("Boston Office"),
                     "requestedById": "1",
                     "replenishmentPeriod": 30,
                     "replenishmentTypeCode": "PUSH",
                     "sortByCode": "CATEGORY",
                     "description": "contract test template",
                 })
    assert resp.status_code == 201
    data = resp.json()["data"]
    assert data["isTemplate"] is True
    assert data["name"] == TEST_NAME + " create"
    assert data["replenishmentPeriod"] == 30
    assert data["sortByCode"] == "CATEGORY"
    client.request("DELETE", f"/api/stocklists/{data['id']}")


def test_read_template(client, template_id):
    resp = check(client, spec, "GET", "/api/requisitionTemplates/{id}",
                 path=f"/api/requisitionTemplates/{template_id}")
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert data["id"] == template_id
    assert data["isTemplate"] is True
    assert data["requisitionItems"] == []


def test_read_template_not_found(client, batch17_endpoints):
    resp = check(client, spec, "GET", "/api/requisitionTemplates/{id}",
                 path="/api/requisitionTemplates/doesnotexist")
    assert resp.status_code == 404


def test_update_template_header(client, template_id):
    resp = check(client, spec, "POST", "/api/requisitionTemplates/{id}/header",
                 path=f"/api/requisitionTemplates/{template_id}/header",
                 json={
                     "name": TEST_NAME + " updated",
                     "replenishmentPeriod": 14,
                     "sortByCode": "SORT_INDEX",
                 })
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert data["name"] == TEST_NAME + " updated"
    assert data["replenishmentPeriod"] == 14
    assert data["sortByCode"] == "SORT_INDEX"


def test_add_update_and_remove_item(client, template_id):
    product_id = client.product_id(PRODUCT_CODE)
    resp = check(client, spec, "POST", "/api/requisitionTemplates/{id}/items",
                 path=f"/api/requisitionTemplates/{template_id}/items",
                 json={"productId": product_id, "quantity": 5})
    assert resp.status_code == 200
    item = resp.json()["data"]
    assert item["quantity"] == 5
    assert item["product"]["productCode"] == PRODUCT_CODE

    # Adding the same product again is a duplicate -> 400
    resp = check(client, spec, "POST", "/api/requisitionTemplates/{id}/items",
                 path=f"/api/requisitionTemplates/{template_id}/items",
                 json={"productId": product_id, "quantity": 1})
    assert resp.status_code == 400

    resp = check(client, spec, "POST", "/api/requisitionTemplates/{id}/updateItems",
                 path=f"/api/requisitionTemplates/{template_id}/updateItems",
                 json={"items": [{"id": item["id"], "quantity": 9}]})
    assert resp.status_code == 200
    items = resp.json()["data"]["requisitionItems"]
    assert len(items) == 1
    assert items[0]["quantity"] == 9

    resp = check(client, spec, "DELETE", "/api/requisitionTemplates/{id}/items/{itemId}",
                 path=f"/api/requisitionTemplates/{template_id}/items/{item['id']}")
    assert resp.status_code == 204
    details = client.get_json(f"/api/requisitionTemplates/{template_id}")["data"]
    assert details["requisitionItems"] == []


def test_import_data_and_import(client, template_id):
    product = client.product(PRODUCT_CODE)
    csv = f"{PRODUCT_CODE},\"{product['name']}\",7,EA"
    resp = check(client, spec, "POST", "/api/requisitionTemplates/{id}/importData",
                 path=f"/api/requisitionTemplates/{template_id}/importData",
                 json={"csv": csv, "delimiter": ",", "skipLines": 0})
    assert resp.status_code == 200
    body = resp.json()
    assert body["errors"] == []
    assert body["data"][0][0] == PRODUCT_CODE

    resp = check(client, spec, "POST", "/api/requisitionTemplates/{id}/import",
                 path=f"/api/requisitionTemplates/{template_id}/import",
                 json={"data": body["data"]})
    assert resp.status_code == 200
    counts = resp.json()["data"]
    assert counts["insertCount"] == 1
    details = client.get_json(f"/api/requisitionTemplates/{template_id}")["data"]
    assert len(details["requisitionItems"]) == 1
    assert details["requisitionItems"][0]["quantity"] == 7


def test_add_product_codes(client, template_id):
    resp = check(client, spec, "POST", "/api/requisitionTemplates/{id}/addProductCodes",
                 path=f"/api/requisitionTemplates/{template_id}/addProductCodes",
                 json={"productCodes": [PRODUCT_CODE, "ZZNOPE"]})
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert data["processedProductCodes"] == [PRODUCT_CODE]
    assert data["ignoredProductCodes"] == ["ZZNOPE"]


def test_list_canceled_requisition_items(client, batch17_endpoints):
    resp = check(client, item_spec, "GET", "/api/requisitionItems",
                 path="/api/requisitionItems")
    assert resp.status_code == 200
    body = resp.json()
    assert isinstance(body["data"], list)
    assert isinstance(body["totalCount"], int)


def test_list_canceled_requisition_items_filtered(client, batch17_endpoints):
    resp = check(client, item_spec, "GET", "/api/requisitionItems",
                 path="/api/requisitionItems",
                 params={
                     "cancelReasonCode": "STOCKOUT",
                     "dateRequestedFrom": "2020-01-01",
                     "dateRequestedTo": "2026-12-31",
                     "max": 5,
                     "offset": 0,
                 })
    assert resp.status_code == 200
    for row in resp.json()["data"]:
        assert row["cancelReasonCode"] == "STOCKOUT"
