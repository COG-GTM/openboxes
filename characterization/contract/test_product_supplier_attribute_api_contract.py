"""Contract tests for ProductSupplierAttributeApiController
(openapi/specs/product-supplier-attribute-api.yaml).

The seeded demo dataset defines no attributes with entity type
PRODUCT_SUPPLIER (and there is no API to create attributes), so the
create/update/delete branches of the batch endpoint cannot be exercised;
the empty-batch happy path and the pinned error branches are.
"""

from oas import Spec, check

spec = Spec("product-supplier-attribute-api.yaml")

PATH = "/api/productSupplierAttributes/batch"


def test_empty_batch(client):
    resp = check(client, spec, "POST", PATH, json={"productAttributes": []})
    assert resp.json()["data"] == {
        "createdAttributes": [],
        "updatedAttributes": [],
        "deletedAttributes": [],
    }


def test_invalid_attribute(client):
    # Unknown attribute id -> not a PRODUCT_SUPPLIER attribute -> 400.
    resp = check(client, spec, "POST", PATH, json={
        "productAttributes": [
            {"attribute": {"id": "doesnotexist0000"}, "value": "x"},
        ],
    })
    assert resp.status_code == 400


def test_missing_product_attributes(client):
    # Parity quirk: an absent productAttributes list is not rejected - the
    # batch validates and responds 200 with an empty change summary.
    resp = check(client, spec, "POST", PATH, json={})
    assert resp.status_code == 200
