"""Contract tests for ShipmentWorkflowApiController
(openapi/specs/shipment-workflow-api.yaml)."""

import pytest

from oas import Spec, check

spec = Spec("shipment-workflow-api.yaml")


@pytest.fixture(scope="module", autouse=True)
def require_endpoint(client):
    # The pinned released image predates this endpoint; only source builds
    # of this branch expose it.
    if client.request("GET", "/api/shipmentWorkflows").status_code == 404:
        pytest.skip("app build does not expose /api/shipmentWorkflows")


def test_list(client):
    resp = check(client, spec, "GET", "/api/shipmentWorkflows")
    assert resp.status_code == 200
    body = resp.json()
    assert body["totalCount"] >= len(body["data"]) >= 0
    for workflow in body["data"]:
        assert workflow["id"]
        assert workflow["name"]


def test_options(client):
    resp = check(client, spec, "GET", "/api/shipmentWorkflows/options")
    assert resp.status_code == 200
    data = resp.json()["data"]
    for key in ("shipmentTypes", "referenceNumberTypes",
                "containerTypes", "documentTemplates"):
        assert isinstance(data[key], list)
    # seeded data has shipment types
    assert len(data["shipmentTypes"]) > 0


def test_read(client):
    listed = client.request("GET", "/api/shipmentWorkflows").json()["data"]
    if not listed:
        pytest.skip("no seeded shipment workflows")
    workflow_id = listed[0]["id"]
    resp = check(client, spec, "GET", "/api/shipmentWorkflows/{id}",
                 path=f"/api/shipmentWorkflows/{workflow_id}")
    assert resp.status_code == 200
    assert resp.json()["data"]["id"] == workflow_id


def test_read_unknown_id(client):
    resp = check(client, spec, "GET", "/api/shipmentWorkflows/{id}",
                 path="/api/shipmentWorkflows/ffffffffffffffffffffffffffffffff")
    assert resp.status_code == 404


def test_update_roundtrip(client):
    listed = client.request("GET", "/api/shipmentWorkflows").json()["data"]
    if not listed:
        pytest.skip("no seeded shipment workflows")
    workflow_id = listed[0]["id"]
    original = check(client, spec, "GET", "/api/shipmentWorkflows/{id}",
                     path=f"/api/shipmentWorkflows/{workflow_id}").json()["data"]

    # No-op update with the same values must succeed and keep the same name.
    payload = {
        "version": original.get("version"),
        "name": original["name"],
        "shipmentType": ({"id": original["shipmentType"]["id"]}
                         if original.get("shipmentType") else None),
        "excludedFields": original.get("excludedFields"),
        "documentTemplate": original.get("documentTemplate"),
        "referenceNumberTypes": [{"id": t["id"]}
                                 for t in original.get("referenceNumberTypes") or []],
        "containerTypes": [{"id": t["id"]}
                           for t in original.get("containerTypes") or []],
        "documentTemplates": [{"id": d["id"]}
                              for d in original.get("documentTemplates") or []],
    }
    resp = check(client, spec, "PUT", "/api/shipmentWorkflows/{id}",
                 path=f"/api/shipmentWorkflows/{workflow_id}", json=payload)
    assert resp.status_code == 200
    assert resp.json()["data"]["name"] == original["name"]


def test_create_validation_error(client):
    # name and shipmentType are both required.
    resp = check(client, spec, "POST", "/api/shipmentWorkflows",
                 json={"name": None})
    assert resp.status_code == 400


def test_create(client):
    # A shipment type may only have one workflow, so create against a
    # shipment type without one; skip if all are taken.
    shipment_types = client.get_json("/api/generic/shipmentType?max=100")["data"]
    workflows = client.get_json("/api/shipmentWorkflows?max=100")["data"]
    used = {wf["shipmentType"]["id"] for wf in workflows if wf.get("shipmentType")}
    free = [st for st in shipment_types if st["id"] not in used]
    if not free:
        pytest.skip("every seeded shipment type already has a workflow")
    created = check(client, spec, "POST", "/api/shipmentWorkflows",
                    json={"name": "Contract Test Workflow",
                          "shipmentType": {"id": free[0]["id"]},
                          "excludedFields": "carrier",
                          "documentTemplate": "template.docx"})
    assert created.status_code == 201
    workflow = created.json()["data"]
    try:
        assert workflow["name"] == "Contract Test Workflow"
        assert workflow["shipmentType"]["id"] == free[0]["id"]
        listed = check(client, spec, "GET", "/api/shipmentWorkflows",
                       params={"max": "100"})
        assert any(wf["id"] == workflow["id"] for wf in listed.json()["data"])
    finally:
        check(client, spec, "DELETE", "/api/shipmentWorkflows/{id}",
              path=f"/api/shipmentWorkflows/{workflow['id']}")
