"""Contract tests for RequisitionApiController (openapi/specs/requisition-api.yaml).

Covers the classic requisition flow endpoints added for the React migration
of the legacy requisition screens (create, chooseTemplate, confirm,
addDocument). Created requisitions use a ZZ-prefixed description and are
deleted afterwards via the stock movement API (a requisition backs every
stock movement).
"""

import io

import pytest

from oas import Spec, check

spec = Spec("requisition-api.yaml")

TEST_DESCRIPTION = "ZZ Contract Requisition"


@pytest.fixture(scope="module", autouse=True)
def cleanup_leftovers(client, batch14_endpoints):
    for req in client.get_json("/api/generic/requisition")["data"]:
        if (req.get("description") or "") == TEST_DESCRIPTION:
            client.request("DELETE", f"/api/stockMovements/{req['id']}")


@pytest.fixture()
def requisition_id(client):
    resp = client.request("POST", "/api/requisitions", json={
        "type": "ADHOC",
        "destinationId": client.location_id("Boston Office"),
        "requestedById": "1",
        "commodityClass": "CONSUMABLES",
        "dateRequested": "2026-07-01",
        "description": TEST_DESCRIPTION,
    })
    assert resp.status_code == 201
    requisition_id = resp.json()["data"]["id"]
    yield requisition_id
    client.request("DELETE", f"/api/stockMovements/{requisition_id}")


def test_create_requisition(client, requisition_id):
    resp = check(client, spec, "POST", "/api/requisitions",
                 path="/api/requisitions", json={
                     "type": "ADHOC",
                     "destinationId": client.location_id("Boston Office"),
                     "requestedById": "1",
                     "dateRequested": "2026-07-01",
                     "description": TEST_DESCRIPTION,
                 })
    assert resp.status_code == 201
    data = resp.json()["data"]
    assert data["status"] == "CREATED"
    assert data["requestNumber"]
    client.request("DELETE", f"/api/stockMovements/{data['id']}")


def test_list_templates(client):
    resp = check(client, spec, "GET", "/api/requisitions/templates",
                 path="/api/requisitions/templates")
    assert resp.status_code == 200
    assert isinstance(resp.json()["data"], list)


def test_list_document_types(client):
    resp = check(client, spec, "GET", "/api/requisitions/documentTypes",
                 path="/api/requisitions/documentTypes")
    assert resp.status_code == 200
    assert resp.json()["data"], "expected seeded document types"


def test_read_requisition(client, requisition_id):
    resp = check(client, spec, "GET", "/api/requisitions/{id}",
                 path=f"/api/requisitions/{requisition_id}")
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert data["id"] == requisition_id
    assert data["description"] == TEST_DESCRIPTION


def test_read_requisition_unknown(client):
    resp = check(client, spec, "GET", "/api/requisitions/{id}",
                 path="/api/requisitions/doesnotexist0000")
    assert resp.status_code == 404


def test_confirm_requisition(client, requisition_id):
    resp = check(client, spec, "POST", "/api/requisitions/{id}/confirm",
                 path=f"/api/requisitions/{requisition_id}/confirm")
    assert resp.status_code == 200
    assert resp.json()["data"]["status"] == "CHECKING"


def test_confirm_requisition_unknown(client):
    resp = check(client, spec, "POST", "/api/requisitions/{id}/confirm",
                 path="/api/requisitions/doesnotexist0000/confirm")
    assert resp.status_code == 404


def test_save_details(client, requisition_id):
    resp = check(client, spec, "POST", "/api/requisitions/{id}/details",
                 path=f"/api/requisitions/{requisition_id}/details", json={
                     "checkedById": "1",
                     "dateChecked": "2026-07-02",
                 })
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert data["checkedBy"]["id"] == "1"
    assert data["dateChecked"] == "2026-07-02"


def test_upload_document(client, requisition_id):
    resp = check(client, spec, "POST", "/api/requisitions/{id}/documents",
                 path=f"/api/requisitions/{requisition_id}/documents",
                 files={"fileContents": ("zz-contract.txt", io.BytesIO(b"contract test"), "text/plain")},
                 data={"name": "ZZ Contract Document", "documentNumber": "ZZ-1"})
    assert resp.status_code == 201
    data = resp.json()["data"]
    assert data["name"] == "ZZ Contract Document"
    assert data["filename"] == "zz-contract.txt"


def test_save_details_verified_by(client, requisition_id):
    resp = check(client, spec, "POST", "/api/requisitions/{id}/details",
                 path=f"/api/requisitions/{requisition_id}/details", json={
                     "verifiedById": "1",
                     "dateVerified": "2026-07-02",
                 })
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert data["verifiedBy"]["id"] == "1"
    assert data["dateVerified"] == "2026-07-02"


def test_review_requisition(client, requisition_id):
    resp = check(client, spec, "POST", "/api/requisitions/{id}/review",
                 path=f"/api/requisitions/{requisition_id}/review")
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert data["status"] == "VERIFYING"
    assert isinstance(data["quantityOnHandMap"], dict)


def test_review_requisition_unknown(client):
    resp = check(client, spec, "POST", "/api/requisitions/{id}/review",
                 path="/api/requisitions/doesnotexist0000/review")
    assert resp.status_code == 404


def test_process_requisition(client, requisition_id):
    resp = check(client, spec, "GET", "/api/requisitions/{id}/process",
                 path=f"/api/requisitions/{requisition_id}/process")
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert isinstance(data["productInventoryItemsMap"], dict)


def test_process_requisition_unknown(client):
    resp = check(client, spec, "GET", "/api/requisitions/{id}/process",
                 path="/api/requisitions/doesnotexist0000/process")
    assert resp.status_code == 404


def test_issue_requisition_unknown(client):
    resp = check(client, spec, "POST", "/api/requisitions/{id}/issue",
                 path="/api/requisitions/doesnotexist0000/issue", json={})
    assert resp.status_code == 404


def test_print_draft(client, requisition_id):
    resp = check(client, spec, "GET", "/api/requisitions/{id}/printDraft",
                 path=f"/api/requisitions/{requisition_id}/printDraft")
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert data["id"] == requisition_id
    assert isinstance(data["requisitionItems"], list)


def test_print_draft_unknown(client):
    resp = check(client, spec, "GET", "/api/requisitions/{id}/printDraft",
                 path="/api/requisitions/doesnotexist0000/printDraft")
    assert resp.status_code == 404


def test_delivery_note(client, requisition_id):
    resp = check(client, spec, "GET", "/api/requisitions/{id}/deliveryNote",
                 path=f"/api/requisitions/{requisition_id}/deliveryNote")
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert data["id"] == requisition_id
    assert isinstance(data["requisitionItems"], list)
    assert isinstance(data["canceledItems"], list)


def test_delivery_note_unknown(client):
    resp = check(client, spec, "GET", "/api/requisitions/{id}/deliveryNote",
                 path="/api/requisitions/doesnotexist0000/deliveryNote")
    assert resp.status_code == 404


def test_upload_document_empty(client, requisition_id):
    resp = check(client, spec, "POST", "/api/requisitions/{id}/documents",
                 path=f"/api/requisitions/{requisition_id}/documents",
                 files={"fileContents": ("empty.txt", io.BytesIO(b""), "text/plain")})
    assert resp.status_code == 400
