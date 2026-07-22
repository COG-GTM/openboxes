"""Contract tests for SelectOptionsApiController (select-options-api.yaml)."""

from oas import Spec, check

spec = Spec("select-options-api.yaml")


def test_gl_account_options(client):
    check(client, spec, "GET", "/api/glAccountOptions")


def test_product_group_options(client):
    check(client, spec, "GET", "/api/productGroupOptions")


def test_catalog_options(client):
    resp = check(client, spec, "GET", "/api/catalogOptions")
    assert resp.json()["data"], "seeded demo data should have catalogs"


def test_catalog_options_hide_numbers(client):
    resp = check(client, spec, "GET", "/api/catalogOptions", params={"hideNumbers": "true"})
    assert all("(" not in option["label"] for option in resp.json()["data"])


def test_category_options(client):
    resp = check(client, spec, "GET", "/api/categoryOptions")
    assert resp.json()["data"], "seeded demo data should have categories"


def test_tag_options(client):
    resp = check(client, spec, "GET", "/api/tagOptions")
    assert resp.json()["data"], "seeded demo data should have tags"


def test_payment_term_options(client):
    resp = check(client, spec, "GET", "/api/paymentTermOptions")
    assert resp.json()["data"]


def test_users_options(client):
    resp = check(client, spec, "GET", "/api/users")
    usernames = {user["username"] for user in resp.json()["data"]}
    assert "admin" in usernames


def test_preference_type_options(client):
    check(client, spec, "GET", "/api/preferenceTypeOptions")


def test_preference_type_options_include_multiple_and_none(client):
    resp = check(
        client, spec, "GET", "/api/preferenceTypeOptions",
        params={"includeMultiple": "true", "includeNone": "true"},
    )
    ids = [option["id"] for option in resp.json()["data"]]
    assert ids[:2] == ["MULTIPLE", "NONE"]


def test_rating_type_code_options(client):
    resp = check(client, spec, "GET", "/api/ratingTypeCodeOptions")
    assert {option["id"] for option in resp.json()["data"]} == {
        "OUTSTANDING", "GOOD", "FAIR", "POOR", "NOT_RATED",
    }


def test_handling_requirements_options(client):
    resp = check(client, spec, "GET", "/api/handlingRequirementsOptions")
    assert {option["id"] for option in resp.json()["data"]} == {
        "COLD_CHAIN", "CONTROLLED_SUBSTANCE", "HAZARDOUS_MATERIAL", "RECONDITIONED",
    }


def test_shipment_status_codes(client):
    resp = check(client, spec, "GET", "/api/stockMovements/shipmentStatusCodes")
    assert all("variant" in option for option in resp.json()["data"])


def test_shipment_status_codes_excluded_statuses(client):
    resp = check(
        client, spec, "GET", "/api/stockMovements/shipmentStatusCodes",
        params={"excludedStatuses": "SHIPPED"},
    )
    assert "SHIPPED" not in {option["id"] for option in resp.json()["data"]}


def test_product_type_options(client, batch8_endpoints):
    resp = check(client, spec, "GET", "/api/productTypeOptions")
    labels = [option["label"] for option in resp.json()["data"]]
    assert "Default" in labels


def test_document_type_options(client, batch8_endpoints):
    resp = check(client, spec, "GET", "/api/documentTypeOptions")
    assert resp.json()["data"]
