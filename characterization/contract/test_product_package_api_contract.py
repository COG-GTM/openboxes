"""Contract tests for ProductPackageApiController
(openapi/specs/product-package-api.yaml).

Packages hang off a product source, so the flow creates a dedicated
ZZ-named product source, adds a package to it, and deletes the source
afterwards (which cascades to its packages).
"""

import pytest

from oas import Spec, check

spec = Spec("product-package-api.yaml")

TEST_CODE = "ZZCONTRACT-PP"
PRODUCT_CODE = "AX738"


@pytest.fixture(scope="module")
def product_supplier(client, supplier_id):
    data = client.get_json("/api/productSuppliers",
                           params={"searchTerm": TEST_CODE})["data"]
    for ps in data:
        if ps.get("code") == TEST_CODE:
            client.request("DELETE", f"/api/productSuppliers/{ps['id']}")
    resp = client.request("POST", "/api/productSuppliers", json={
        "product": {"id": client.product_id(PRODUCT_CODE)},
        "supplier": {"id": supplier_id},
        "code": TEST_CODE,
        "name": "ZZ Contract Product Source (packages)",
        "active": True,
    })
    resp.raise_for_status()
    ps_id = resp.json()["data"]["id"]
    yield ps_id
    client.request("DELETE", f"/api/productSuppliers/{ps_id}")


def _seeded_uom_id(client):
    # Resolve a unit of measure by the stable "BX" code from the seeded
    # product sources (there is no dedicated UoM list API).
    for ps in client.get_json("/api/productSuppliers",
                              params={"disableMaxLimit": "true"})["data"]:
        uom = (ps.get("defaultProductPackage") or {}).get("uom") or {}
        if uom.get("code") == "BX":
            return uom["id"]
    pytest.fail("No seeded product source with a BX package found")


def test_create_package(client, product_supplier):
    resp = check(client, spec, "POST", "/api/productPackages", json={
        "productSupplier": {"id": product_supplier},
        "uom": {"id": _seeded_uom_id(client)},
        "productPackageQuantity": 10,
        "productPackagePrice": 1.5,
    })
    # Parity quirk: 200 (not 201), body is the parent product source.
    assert resp.status_code == 200
    package = resp.json()["data"]["defaultProductPackage"]
    assert package["quantity"] == 10


def test_create_invalid(client, product_supplier):
    # productPackageQuantity is required (non-nullable constraint).
    resp = check(client, spec, "POST", "/api/productPackages", json={
        "productSupplier": {"id": product_supplier},
    })
    assert resp.status_code == 400
