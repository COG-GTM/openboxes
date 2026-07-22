"""Contract tests for ShipmentWorkflowApiController
(openapi/specs/shipment-workflow-api.yaml)."""

import pytest

from oas import Spec, check

spec = Spec("shipment-workflow-api.yaml")


@pytest.fixture(scope="module", autouse=True)
def require_endpoint(client):
    # The pinned released image predates this endpoint; only source builds
    # of this branch expose it.
    if client.request("GET", "/api/shipmentWorkflows").status_code != 200:
        pytest.skip("app build does not expose /api/shipmentWorkflows")


def test_list(client):
    resp = check(client, spec, "GET", "/api/shipmentWorkflows")
    body = resp.json()
    assert "data" in body and "totalCount" in body


def test_list_pagination(client):
    resp = check(client, spec, "GET", "/api/shipmentWorkflows",
                 params={"max": "1", "offset": "0"})
    assert len(resp.json()["data"]) <= 1


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
        # No DELETE API endpoint (the workflow list/delete screens are still
        # legacy GSPs); clean up through the legacy controller action.
        client.request("POST", f"/shipmentWorkflow/delete/{workflow['id']}",
                       allow_redirects=False)
