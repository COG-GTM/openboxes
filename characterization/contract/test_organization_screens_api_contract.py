"""Contract tests for the Batch 33 organization screen endpoints
(/api/organizations/search, /api/organizations/{id}/details and the
PUT/DELETE /api/organizations/{id} actions in
openapi/specs/organization-api.yaml, plus the party type / organization role
type options in openapi/specs/select-options-api.yaml)."""

import pytest

from oas import Spec, check

spec = Spec("organization-api.yaml")
options_spec = Spec("select-options-api.yaml")

TEST_NAME = "ZZ Contract Org Screens"


@pytest.fixture(scope="module", autouse=True)
def require_endpoint(client):
    # The pinned released image predates the Batch 33 screen endpoints; only
    # source builds of this branch expose them.
    if client.request("GET", "/api/organizations/search",
                      params={"max": "1"}).status_code != 200:
        pytest.skip("app build does not expose /api/organizations/search")


@pytest.fixture(scope="module", autouse=True)
def cleanup_leftovers(client, require_endpoint):
    for org in client.get_json("/api/organizations")["data"]:
        if str(org.get("name", "")).startswith(TEST_NAME):
            client.request("DELETE", f"/api/organizations/{org['id']}")


def test_party_type_options(client):
    resp = check(client, options_spec, "GET", "/api/partyTypeOptions")
    labels = [option["label"] for option in resp.json()["data"]]
    assert "Organization" in labels


def test_organization_role_type_options(client):
    resp = check(client, options_spec, "GET", "/api/organizationRoleTypeOptions")
    ids = [option["id"] for option in resp.json()["data"]]
    assert "ROLE_SUPPLIER" in ids
    assert "ROLE_MANUFACTURER" in ids


def test_search(client):
    resp = check(client, spec, "GET", "/api/organizations/search")
    body = resp.json()
    assert body["totalCount"] >= len(body["data"])
    assert len(body["data"]) <= 10


def test_search_sorted_and_paged(client):
    resp = check(client, spec, "GET", "/api/organizations/search",
                 params={"max": "5", "offset": "0", "sort": "name", "order": "asc"})
    data = resp.json()["data"]
    assert len(data) <= 5
    names = [row["name"] for row in data]
    assert names == sorted(names)


def test_search_filtered(client):
    resp = check(client, spec, "GET", "/api/organizations/search",
                 params={"q": "ZZ No Such Organization", "max": "5"})
    body = resp.json()
    assert body["data"] == []
    assert body["totalCount"] == 0


def test_search_by_role_type(client):
    resp = check(client, spec, "GET", "/api/organizations/search",
                 params={"roleType": "ROLE_SUPPLIER", "max": "100"})
    # roles are returned as display names (RoleType.name), e.g. "Supplier"
    for row in resp.json()["data"]:
        assert "Supplier" in row["roles"]


def test_search_by_multiple_role_types_has_no_duplicates(client):
    resp = check(client, spec, "GET", "/api/organizations/search",
                 params={"roleType": ["ROLE_SUPPLIER", "ROLE_MANUFACTURER"], "max": "100"})
    body = resp.json()
    ids = [row["id"] for row in body["data"]]
    assert len(ids) == len(set(ids))
    for row in body["data"]:
        assert "Supplier" in row["roles"] or "Manufacturer" in row["roles"]
    if body["totalCount"] <= 100:
        assert body["totalCount"] == len(ids)


def test_details_matches_search_row(client):
    row = client.get_json("/api/organizations/search", params={"max": "1"})["data"][0]
    resp = check(client, spec, "GET", "/api/organizations/{id}/details",
                 path=f"/api/organizations/{row['id']}/details")
    details = resp.json()["data"]
    assert details["id"] == row["id"]
    assert details["name"] == row["name"]
    assert details["code"] == row["code"]
    assert sorted(role["name"] for role in details["roles"]) == row["roles"]


def test_details_unknown(client):
    check(client, spec, "GET", "/api/organizations/{id}/details",
          path="/api/organizations/doesnotexist0000/details")


def test_create_details_update_delete_roundtrip(client):
    resp = check(client, spec, "POST", "/api/organizations",
                 json={"name": TEST_NAME, "description": "contract test"})
    org_id = resp.json()["data"]["id"]
    try:
        resp = check(client, spec, "GET", "/api/organizations/{id}/details",
                     path=f"/api/organizations/{org_id}/details")
        details = resp.json()["data"]
        assert details["name"] == TEST_NAME
        assert details["description"] == "contract test"
        assert details["partyType"]["name"] == "Organization"
        assert details["code"]

        resp = check(client, spec, "PUT", "/api/organizations/{id}",
                     path=f"/api/organizations/{org_id}",
                     json={"name": f"{TEST_NAME} (renamed)",
                           "description": "contract test updated",
                           "active": False})
        assert resp.json()["data"]["id"] == org_id

        resp = check(client, spec, "GET", "/api/organizations/{id}/details",
                     path=f"/api/organizations/{org_id}/details")
        details = resp.json()["data"]
        assert details["name"] == f"{TEST_NAME} (renamed)"
        assert details["description"] == "contract test updated"
        assert details["active"] is False
    finally:
        resp = check(client, spec, "DELETE", "/api/organizations/{id}",
                     path=f"/api/organizations/{org_id}")
        assert resp.status_code == 204


def test_delete_unknown(client):
    resp = check(client, spec, "DELETE", "/api/organizations/{id}",
                 path="/api/organizations/doesnotexist0000")
    assert resp.status_code == 404
