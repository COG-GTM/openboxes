"""Contract tests for ProductAssociationApiController (product-association-api.yaml)."""

import pytest

from oas import Spec, check

spec = Spec("product-association-api.yaml")

# Product codes are randomly generated at demo-import time on source builds,
# so resolve products by their stable seeded names.
PRODUCT_NAME = "Lamivudine 150mg tablet"
ASSOCIATED_PRODUCT_NAME = "Lamivudine 150mg + zidovudine 300mg tablet"
TEST_COMMENT = "ZZ contract test association"


def _product_id_by_name(client, name):
    data = client.get_json("/api/products/search", params={"name": name})["data"]
    matches = [p for p in data if p.get("name") == name]
    assert matches, f"Product not found in seeded data: {name}"
    return matches[0]["id"]


@pytest.fixture(scope="module", autouse=True)
def require_endpoint(client):
    # The pinned released image predates the product association API; only
    # source builds of this branch expose it.
    if client.request("GET", "/api/productAssociations",
                      params={"max": "1"}).status_code != 200:
        pytest.skip("app build does not expose /api/productAssociations")


@pytest.fixture(scope="module", autouse=True)
def cleanup_leftovers(client, require_endpoint):
    for pa in client.get_json("/api/productAssociations",
                              params={"max": "100"})["data"]:
        if str(pa.get("comments") or "").startswith(TEST_COMMENT):
            client.request("DELETE", f"/api/productAssociations/{pa['id']}",
                           params={"mutualDelete": "true"})


def test_list(client):
    resp = check(client, spec, "GET", "/api/productAssociations",
                 params={"max": "10", "offset": "0"})
    body = resp.json()
    assert body["totalCount"] >= len(body["data"])


def test_list_filtered_by_code(client):
    resp = check(client, spec, "GET", "/api/productAssociations",
                 params={"code": "SUBSTITUTE", "max": "10"})
    assert all(pa["code"] == "SUBSTITUTE" for pa in resp.json()["data"])


def test_read_unknown(client):
    resp = check(client, spec, "GET", "/api/productAssociations/{id}",
                 path="/api/productAssociations/doesnotexist0000")
    assert resp.status_code == 404


def test_delete_unknown(client):
    resp = check(client, spec, "DELETE", "/api/productAssociations/{id}",
                 path="/api/productAssociations/doesnotexist0000")
    assert resp.status_code == 404


def test_create_invalid(client):
    # Missing code/product/associatedProduct fails domain validation -> 400.
    resp = check(client, spec, "POST", "/api/productAssociations",
                 json={"comments": TEST_COMMENT})
    assert resp.status_code == 400


def test_create_read_update_delete(client):
    pid = _product_id_by_name(client, PRODUCT_NAME)
    apid = _product_id_by_name(client, ASSOCIATED_PRODUCT_NAME)

    resp = check(client, spec, "POST", "/api/productAssociations",
                 json={"code": "SUBSTITUTE",
                       "product": {"id": pid},
                       "associatedProduct": {"id": apid},
                       "quantity": 2,
                       "comments": TEST_COMMENT,
                       "hasMutualAssociation": False})
    assert resp.status_code == 200
    pa_id = resp.json()["data"]["id"]
    try:
        resp = check(client, spec, "GET", "/api/productAssociations/{id}",
                     path=f"/api/productAssociations/{pa_id}")
        data = resp.json()["data"]
        assert data["code"] == "SUBSTITUTE"
        assert data["product"]["id"] == pid
        assert data["associatedProduct"]["id"] == apid
        assert data["hasMutualAssociation"] is False

        resp = check(client, spec, "GET", "/api/productAssociations",
                     params={"q": pa_id[:8], "max": "10"})
        assert any(pa["id"] == pa_id for pa in resp.json()["data"])

        resp = check(client, spec, "PUT", "/api/productAssociations/{id}",
                     path=f"/api/productAssociations/{pa_id}",
                     json={"code": "EQUIVALENT",
                           "product": {"id": pid},
                           "associatedProduct": {"id": apid},
                           "quantity": 4,
                           "comments": f"{TEST_COMMENT} (updated)",
                           "hasMutualAssociation": True})
        data = resp.json()["data"]
        assert data["code"] == "EQUIVALENT"
        assert data["hasMutualAssociation"] is True

        # The reciprocal association points back with inverted quantity.
        mutual = [pa for pa in client.get_json(
            "/api/productAssociations", params={"max": "100"})["data"]
            if pa["product"]["id"] == apid
            and pa["associatedProduct"]["id"] == pid
            and str(pa.get("comments") or "").startswith(TEST_COMMENT)]
        assert mutual and float(mutual[0]["quantity"]) == 0.25
    finally:
        resp = check(client, spec, "DELETE", "/api/productAssociations/{id}",
                     path=f"/api/productAssociations/{pa_id}",
                     params={"mutualDelete": "true"})
        assert resp.status_code == 204


def test_create_with_mutual_association(client):
    pid = _product_id_by_name(client, PRODUCT_NAME)
    apid = _product_id_by_name(client, ASSOCIATED_PRODUCT_NAME)

    resp = check(client, spec, "POST", "/api/productAssociations",
                 json={"code": "SUBSTITUTE",
                       "product": {"id": pid},
                       "associatedProduct": {"id": apid},
                       "quantity": 2,
                       "comments": TEST_COMMENT,
                       "hasMutualAssociation": True})
    assert resp.status_code == 200
    data = resp.json()["data"]
    pa_id = data["id"]
    try:
        assert data["hasMutualAssociation"] is True
        mutual = [pa for pa in client.get_json(
            "/api/productAssociations", params={"max": "100"})["data"]
            if pa["product"]["id"] == apid
            and pa["associatedProduct"]["id"] == pid
            and str(pa.get("comments") or "").startswith(TEST_COMMENT)]
        assert mutual and float(mutual[0]["quantity"]) == 0.5
    finally:
        resp = check(client, spec, "DELETE", "/api/productAssociations/{id}",
                     path=f"/api/productAssociations/{pa_id}",
                     params={"mutualDelete": "true"})
        assert resp.status_code == 204


def test_type_code_options(client):
    options_spec = Spec("select-options-api.yaml")
    resp = check(client, options_spec, "GET",
                 "/api/productAssociationTypeCodeOptions")
    values = [option["value"] for option in resp.json()["data"]]
    assert values[:3] == ["ACCESSORY", "REPLACEMENT", "SUBSTITUTE"]


def test_product_search_screen(client):
    product_spec = Spec("product-api.yaml")
    resp = check(client, product_spec, "GET", "/api/products/productSearch",
                 params={"q": "Lamivudine"})
    body = resp.json()
    assert body["totalCount"] == len(body["data"])
    assert any(p["name"] == PRODUCT_NAME for p in body["data"])

    resp = check(client, product_spec, "GET", "/api/products/productSearch")
    assert resp.json() == {"data": [], "totalCount": 0}


def test_upn_database(client):
    product_spec = Spec("product-api.yaml")
    resp = check(client, product_spec, "GET", "/api/products/upnDatabase")
    body = resp.json()
    assert body["totalCount"] == len(body["data"])
