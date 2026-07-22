"""Contract tests for PicklistApiController (openapi/specs/picklist-api.yaml).

The demo dataset has no picklists, so the happy path builds one: a dedicated
ZZ-named outbound stock movement (whose requisition backs the picklist) plus
a picklist created via the generic API, all deleted afterwards.
"""

import pytest

from oas import Spec, check

spec = Spec("picklist-api.yaml")

TEST_DESCRIPTION = "ZZ Contract Picklist Movement"


@pytest.fixture(scope="module", autouse=True)
def cleanup_leftovers(client):
    for pl in client.get_json("/api/generic/picklist")["data"]:
        if pl.get("name") == "ZZ Contract Picklist":
            client.request("DELETE", f"/api/generic/picklist/{pl['id']}")
    for req in client.get_json("/api/generic/requisition")["data"]:
        if (req.get("description") or "") == TEST_DESCRIPTION:
            client.request("DELETE", f"/api/stockMovements/{req['id']}")


@pytest.fixture()
def picklist_id(client):
    resp = client.request("POST", "/api/stockMovements", json={
        "name": "",
        "description": TEST_DESCRIPTION,
        "origin": {"id": client.location_id("Main Warehouse")},
        "destination": {"id": client.location_id("Boston Office")},
        "requestedBy": {"id": "1"},
        "dateRequested": "07/01/2026",
    })
    assert resp.status_code == 201
    movement_id = resp.json()["data"]["id"]
    resp = client.request("POST", "/api/generic/picklist", json={
        "requisition": {"id": movement_id},
        "name": "ZZ Contract Picklist",
    })
    assert resp.status_code == 201
    picklist_id = resp.json()["data"]["id"]
    yield picklist_id
    client.request("DELETE", f"/api/generic/picklist/{picklist_id}")
    client.request("DELETE", f"/api/stockMovements/{movement_id}")


def test_clear_picklist(client, picklist_id):
    resp = check(client, spec, "DELETE", "/api/picklists/{id}/items",
                 path=f"/api/picklists/{picklist_id}/items")
    assert resp.status_code == 204


def test_clear_picklist_unknown(client):
    resp = check(client, spec, "DELETE", "/api/picklists/{id}/items",
                 path="/api/picklists/doesnotexist0000/items")
    assert resp.status_code == 404
