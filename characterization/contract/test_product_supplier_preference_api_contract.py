"""Contract tests for ProductSupplierPreferenceApiController
(openapi/specs/product-supplier-preference-api.yaml).

There is no list/read endpoint, so leftover cleanup goes through the generic
API. The flow uses a dedicated ZZ Contract comment marker and a non-null
destinationParty (Main Warehouse's organization) so it never collides with
the seeded default (null-destinationParty) preferences.
"""

import pytest

from oas import Spec, check

spec = Spec("product-supplier-preference-api.yaml")

COMMENT_MARKER = "ZZ Contract preference"
ORGANIZATION_ID = "1"  # Main Warehouse's organization


@pytest.fixture(scope="module", autouse=True)
def cleanup_leftovers(client):
    for pref in client.get_json("/api/generic/productSupplierPreference/")["data"]:
        if (pref.get("comments") or "").startswith(COMMENT_MARKER):
            client.request("DELETE",
                           f"/api/productSupplierPreferences/{pref['id']}")


@pytest.fixture(scope="module")
def product_supplier_id(client):
    suppliers = client.get_json("/api/productSuppliers")["data"]
    assert suppliers, "seeded dataset should have product suppliers"
    return suppliers[0]["id"]


def test_create_update_delete(client, product_supplier_id):
    resp = check(client, spec, "POST", "/api/productSupplierPreferences",
                 json={"productSupplier": {"id": product_supplier_id},
                       "preferenceType": {"id": "QUALIFIED"},
                       "destinationParty": {"id": ORGANIZATION_ID},
                       "comments": COMMENT_MARKER})
    pref_id = resp.json()["data"]["id"]
    try:
        resp = check(client, spec, "PUT",
                     "/api/productSupplierPreferences/{id}",
                     path=f"/api/productSupplierPreferences/{pref_id}",
                     json={"comments": f"{COMMENT_MARKER} updated"})
        assert resp.json()["data"]["comments"] == f"{COMMENT_MARKER} updated"
        resp = check(client, spec, "POST",
                     "/api/productSupplierPreferences/{id}",
                     path=f"/api/productSupplierPreferences/{pref_id}",
                     json={"comments": f"{COMMENT_MARKER} post-updated"})
        assert resp.json()["data"]["comments"] == f"{COMMENT_MARKER} post-updated"
    finally:
        check(client, spec, "DELETE", "/api/productSupplierPreferences/{id}",
              path=f"/api/productSupplierPreferences/{pref_id}")


def test_create_invalid(client):
    resp = check(client, spec, "POST", "/api/productSupplierPreferences",
                 json={})
    assert resp.status_code == 400


def test_batch(client, product_supplier_id):
    resp = check(client, spec, "POST",
                 "/api/productSupplierPreferences/batch",
                 json={"productSupplierPreferences": [
                     {"productSupplier": {"id": product_supplier_id},
                      "preferenceType": {"id": "PREFERRED"},
                      "destinationParty": {"id": ORGANIZATION_ID},
                      "comments": f"{COMMENT_MARKER} batch"}]})
    for pref in resp.json()["data"]:
        client.request("DELETE",
                       f"/api/productSupplierPreferences/{pref['id']}")


def test_delete_unknown_is_noop(client):
    check(client, spec, "DELETE", "/api/productSupplierPreferences/{id}",
          path="/api/productSupplierPreferences/doesnotexist0000")
