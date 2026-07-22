"""Contract tests for PackListApiController (openapi/specs/pack-list-api.yaml).

The demo dataset has no stock movements, so the flow creates a dedicated
ZZ-named outbound movement (empty pack list -> template with one blank row)
and deletes it afterwards.
"""

import pytest

from oas import Spec, check

spec = Spec("pack-list-api.yaml")

TEST_DESCRIPTION = "ZZ Contract PackList Movement"

# Header-only CSV matching the exported template columns.
TEMPLATE_HEADER = (
    "Id,Code,Name,Bin Location,Serial / Lot Number,Expiration date,"
    "Quantity Shipped,Unit of measure,Recipient,Pack level 1,Pack level 2\n"
)


@pytest.fixture(scope="module", autouse=True)
def cleanup_leftovers(client):
    for req in client.get_json("/api/generic/requisition")["data"]:
        if (req.get("description") or "") == TEST_DESCRIPTION:
            client.request("DELETE", f"/api/stockMovements/{req['id']}")


@pytest.fixture(scope="module")
def movement_id(client):
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
    yield movement_id
    client.request("DELETE", f"/api/stockMovements/{movement_id}")


def test_export_template_csv(client, movement_id):
    resp = check(client, spec, "GET",
                 "/api/stockMovements/packlistTemplate/{id}",
                 path=f"/api/stockMovements/packlistTemplate/{movement_id}")
    assert "attachment" in resp.headers.get("Content-disposition", "")


def test_export_template_xls(client, movement_id):
    check(client, spec, "GET", "/api/stockMovements/packlistTemplate/{id}",
          path=f"/api/stockMovements/packlistTemplate/{movement_id}",
          params={"format": "xls"})


def test_export_template_bad_format(client, movement_id):
    resp = check(client, spec, "GET",
                 "/api/stockMovements/packlistTemplate/{id}",
                 path=f"/api/stockMovements/packlistTemplate/{movement_id}",
                 params={"format": "pdf"})
    assert resp.status_code == 500


def test_export_template_unknown(client):
    resp = check(client, spec, "GET",
                 "/api/stockMovements/packlistTemplate/{id}",
                 path="/api/stockMovements/packlistTemplate/doesnotexist0000")
    assert resp.status_code == 404


def test_import_pack_list_items(client, movement_id):
    resp = check(client, spec, "POST",
                 "/api/stockMovements/importPackListItems/{id}",
                 path=f"/api/stockMovements/importPackListItems/{movement_id}",
                 files={"importFile": ("import.csv", TEMPLATE_HEADER, "text/csv")})
    assert resp.json()["message"] == "Data imported successfully"


def test_import_pack_list_items_unknown(client):
    resp = check(client, spec, "POST",
                 "/api/stockMovements/importPackListItems/{id}",
                 path="/api/stockMovements/importPackListItems/doesnotexist0000",
                 files={"importFile": ("import.csv", TEMPLATE_HEADER, "text/csv")})
    assert resp.status_code == 404
