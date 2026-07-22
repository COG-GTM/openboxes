"""Contract tests for ProductSupplierApiController
(openapi/specs/product-supplier-api.yaml).

The CRUD flow creates a dedicated, deterministically-named product source and
deletes it afterwards so the suite stays re-runnable.
"""

import pytest

from oas import Spec, check

spec = Spec("product-supplier-api.yaml")

TEST_CODE = "ZZCONTRACT-PS"
TEST_NAME = "ZZ Contract Product Source"
PRODUCT_CODE = "AX738"


@pytest.fixture(scope="module", autouse=True)
def cleanup_leftovers(client):
    data = client.get_json("/api/productSuppliers",
                           params={"searchTerm": TEST_CODE})["data"]
    for ps in data:
        if ps.get("code") == TEST_CODE:
            client.request("DELETE", f"/api/productSuppliers/{ps['id']}")


def test_list(client):
    resp = check(client, spec, "GET", "/api/productSuppliers",
                 params={"max": "10", "offset": "0"})
    assert resp.json()["data"], "seeded dataset should have product sources"


def test_read_unknown(client):
    resp = check(client, spec, "GET", "/api/productSuppliers/{id}",
                 path="/api/productSuppliers/doesnotexist0000")
    assert resp.status_code == 404


def test_create_read_update_delete(client, supplier_id):
    body = {
        "product": {"id": client.product_id(PRODUCT_CODE)},
        "supplier": {"id": supplier_id},
        "code": TEST_CODE,
        "name": TEST_NAME,
        "active": True,
    }
    resp = check(client, spec, "POST", "/api/productSuppliers", json=body)
    assert resp.status_code == 201
    ps_id = resp.json()["data"]["id"]
    try:
        check(client, spec, "GET", "/api/productSuppliers/{id}",
              path=f"/api/productSuppliers/{ps_id}")
        check(client, spec, "PUT", "/api/productSuppliers/{id}",
              path=f"/api/productSuppliers/{ps_id}",
              json={**body, "name": f"{TEST_NAME} (renamed)"})
        check(client, spec, "POST", "/api/productSuppliers/{id}",
              path=f"/api/productSuppliers/{ps_id}",
              json={**body, "name": f"{TEST_NAME} (renamed again)"})
    finally:
        resp = check(client, spec, "DELETE", "/api/productSuppliers/{id}",
                     path=f"/api/productSuppliers/{ps_id}")
        assert resp.status_code == 204


def test_details(client):
    # Only source builds of this branch expose the details endpoint (added
    # in Phase 2 Batch 11 for the React show screen).
    listing = client.get_json("/api/productSuppliers",
                              params={"max": "1"})["data"]
    assert listing, "seeded dataset should have product sources"
    ps_id = listing[0]["id"]
    if client.request("GET",
                      f"/api/productSuppliers/{ps_id}/details").status_code == 404:
        pytest.skip("app build does not expose /api/productSuppliers/{id}/details")
    resp = check(client, spec, "GET", "/api/productSuppliers/{id}/details",
                 path=f"/api/productSuppliers/{ps_id}/details")
    assert resp.json()["data"]["id"] == ps_id


def test_details_unknown(client):
    # On builds without the endpoint the unmapped URL also responds 404.
    resp = check(client, spec, "GET", "/api/productSuppliers/{id}/details",
                 path="/api/productSuppliers/doesnotexist0000/details")
    assert resp.status_code == 404


def test_create_invalid(client):
    # name and supplier are required by ProductSupplierDetailsCommand.
    resp = check(client, spec, "POST", "/api/productSuppliers", json={})
    assert resp.status_code == 400


def test_delete_unknown(client):
    # Parity quirk: unknown ids respond 500 (NPE), not 404.
    resp = check(client, spec, "DELETE", "/api/productSuppliers/{id}",
                 path="/api/productSuppliers/doesnotexist0000")
    assert resp.status_code == 500


def test_export_json(client):
    check(client, spec, "GET", "/api/productSuppliers/export")


def test_export_csv(client):
    resp = check(client, spec, "GET", "/api/productSuppliers/export",
                 params={"format": "csv"})
    assert resp.headers["Content-Type"].startswith("text/csv")
