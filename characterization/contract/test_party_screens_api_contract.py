"""Contract tests for the Batch 34 party/partyRole screen endpoints
(/api/parties/search, /api/parties/{id}/details, POST /api/parties,
PUT/DELETE /api/parties/{id} in openapi/specs/party-api.yaml;
/api/partyRoles CRUD + /api/partyRoles/{id}/details in
openapi/specs/party-role-api.yaml; plus the role type / party options in
openapi/specs/select-options-api.yaml)."""

import pytest

from oas import Spec, check

party_spec = Spec("party-api.yaml")
party_role_spec = Spec("party-role-api.yaml")
options_spec = Spec("select-options-api.yaml")


@pytest.fixture(scope="module", autouse=True)
def require_endpoint(client):
    # The pinned released image predates the Batch 34 screen endpoints; only
    # source builds of this branch expose them.
    if client.request("GET", "/api/parties/search",
                      params={"max": "1"}).status_code != 200:
        pytest.skip("app build does not expose /api/parties/search")


def test_role_type_options(client):
    resp = check(client, options_spec, "GET", "/api/roleTypeOptions")
    ids = [option["id"] for option in resp.json()["data"]]
    assert "ROLE_SUPPLIER" in ids
    assert "ROLE_ADMIN" in ids


def test_party_options(client):
    resp = check(client, options_spec, "GET", "/api/partyOptions")
    data = resp.json()["data"]
    for option in data:
        assert option["label"] == option["id"]


def test_search(client):
    resp = check(client, party_spec, "GET", "/api/parties/search")
    body = resp.json()
    assert body["totalCount"] >= len(body["data"])
    assert len(body["data"]) <= 10


def test_search_sorted_and_paged(client):
    resp = check(client, party_spec, "GET", "/api/parties/search",
                 params={"max": "5", "offset": "0", "sort": "id", "order": "asc"})
    data = resp.json()["data"]
    assert len(data) <= 5
    ids = [row["id"] for row in data]
    assert ids == sorted(ids)


def test_search_filtered(client):
    resp = check(client, party_spec, "GET", "/api/parties/search",
                 params={"q": "zzznosuchparty", "max": "5"})
    body = resp.json()
    assert body["data"] == []
    assert body["totalCount"] == 0


def test_details_matches_search_row(client):
    row = client.get_json("/api/parties/search", params={"max": "1"})["data"][0]
    resp = check(client, party_spec, "GET", "/api/parties/{id}/details",
                 path=f"/api/parties/{row['id']}/details")
    details = resp.json()["data"]
    assert details["id"] == row["id"]
    assert (details["partyType"] or {}).get("name") == row["partyType"]
    assert sorted(role["name"] for role in details["roles"]) == row["roles"]


def test_details_unknown(client):
    check(client, party_spec, "GET", "/api/parties/{id}/details",
          path="/api/parties/doesnotexist0000/details")


def _organization_party_type_id(client):
    options = client.get_json("/api/partyTypeOptions")["data"]
    return next(option["id"] for option in options
                if option["label"] == "Organization")


def test_party_and_party_role_roundtrip(client):
    party_type_id = _organization_party_type_id(client)

    resp = check(client, party_spec, "POST", "/api/parties",
                 json={"partyType": party_type_id})
    party_id = resp.json()["data"]["id"]
    try:
        resp = check(client, party_spec, "GET", "/api/parties/{id}/details",
                     path=f"/api/parties/{party_id}/details")
        details = resp.json()["data"]
        assert details["partyType"]["name"] == "Organization"
        assert details["roles"] == []

        resp = check(client, party_spec, "PUT", "/api/parties/{id}",
                     path=f"/api/parties/{party_id}",
                     json={"partyType": party_type_id})
        assert resp.json()["data"]["id"] == party_id

        # Party role CRUD against the new party.
        resp = check(client, party_role_spec, "POST", "/api/partyRoles",
                     json={"party": party_id, "roleType": "ROLE_SUPPLIER"})
        party_role_id = resp.json()["data"]["id"]

        resp = check(client, party_role_spec, "GET",
                     "/api/partyRoles/{id}/details",
                     path=f"/api/partyRoles/{party_role_id}/details")
        role_details = resp.json()["data"]
        assert role_details["party"]["id"] == party_id
        assert role_details["roleType"] == "ROLE_SUPPLIER"
        assert role_details["startDate"] is None

        resp = check(client, party_role_spec, "PUT", "/api/partyRoles/{id}",
                     path=f"/api/partyRoles/{party_role_id}",
                     json={"roleType": "ROLE_MANUFACTURER",
                           "startDate": "2026-01-01T00:00:00Z"})
        assert resp.json()["data"]["id"] == party_role_id

        resp = check(client, party_role_spec, "GET",
                     "/api/partyRoles/{id}/details",
                     path=f"/api/partyRoles/{party_role_id}/details")
        role_details = resp.json()["data"]
        assert role_details["roleType"] == "ROLE_MANUFACTURER"
        assert role_details["startDate"] == "2026-01-01T00:00:00Z"

        # The party details now include the role.
        details = client.get_json(f"/api/parties/{party_id}/details")["data"]
        assert [role["roleType"] for role in details["roles"]] == ["ROLE_MANUFACTURER"]

        resp = check(client, party_role_spec, "DELETE", "/api/partyRoles/{id}",
                     path=f"/api/partyRoles/{party_role_id}")
        assert resp.status_code == 204
    finally:
        resp = check(client, party_spec, "DELETE", "/api/parties/{id}",
                     path=f"/api/parties/{party_id}")
        assert resp.status_code == 204


def test_create_party_without_party_type_is_validation_error(client):
    resp = check(client, party_spec, "POST", "/api/parties", json={})
    assert resp.status_code == 400


def test_delete_unknown_party(client):
    resp = check(client, party_spec, "DELETE", "/api/parties/{id}",
                 path="/api/parties/doesnotexist0000")
    assert resp.status_code == 404


def test_party_role_details_unknown(client):
    check(client, party_role_spec, "GET", "/api/partyRoles/{id}/details",
          path="/api/partyRoles/doesnotexist0000/details")
