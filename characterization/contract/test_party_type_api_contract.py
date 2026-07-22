"""Contract tests for the Batch 35 partyType/partyRole screen endpoints
(/api/partyTypes CRUD in openapi/specs/party-type-api.yaml; the
GET /api/partyRoles list in openapi/specs/party-role-api.yaml; plus
/api/partyTypeCodeOptions in openapi/specs/select-options-api.yaml)."""

import pytest

from oas import Spec, check

party_type_spec = Spec("party-type-api.yaml")
party_role_spec = Spec("party-role-api.yaml")
options_spec = Spec("select-options-api.yaml")


@pytest.fixture(scope="module", autouse=True)
def require_endpoint(client):
    # The pinned released image predates the Batch 35 screen endpoints; only
    # source builds of this branch expose them.
    if client.request("GET", "/api/partyTypes",
                      params={"max": "1"}).status_code != 200:
        pytest.skip("app build does not expose /api/partyTypes")


def test_party_type_code_options(client):
    resp = check(client, options_spec, "GET", "/api/partyTypeCodeOptions")
    ids = [option["id"] for option in resp.json()["data"]]
    assert ids == ["PERSON", "ORGANIZATION"]


def test_list(client):
    resp = check(client, party_type_spec, "GET", "/api/partyTypes")
    body = resp.json()
    assert body["totalCount"] >= len(body["data"])
    assert len(body["data"]) <= 10


def test_list_sorted_and_paged(client):
    resp = check(client, party_type_spec, "GET", "/api/partyTypes",
                 params={"max": "5", "offset": "0", "sort": "name",
                         "order": "asc"})
    data = resp.json()["data"]
    assert len(data) <= 5
    names = [row["name"] for row in data]
    assert names == sorted(names, key=str.lower)


def test_list_filtered(client):
    resp = check(client, party_type_spec, "GET", "/api/partyTypes",
                 params={"q": "zzznosuchpartytype", "max": "5"})
    body = resp.json()
    assert body["data"] == []
    assert body["totalCount"] == 0


def test_read_matches_list_row(client):
    row = client.get_json("/api/partyTypes", params={"max": "1"})["data"][0]
    resp = check(client, party_type_spec, "GET", "/api/partyTypes/{id}",
                 path=f"/api/partyTypes/{row['id']}")
    data = resp.json()["data"]
    assert data["id"] == row["id"]
    assert data["code"] == row["code"]
    assert data["name"] == row["name"]
    assert data["partyTypeCode"] == row["partyTypeCode"]


def test_read_unknown(client):
    check(client, party_type_spec, "GET", "/api/partyTypes/{id}",
          path="/api/partyTypes/doesnotexist0000")


def test_party_type_roundtrip(client):
    resp = check(client, party_type_spec, "POST", "/api/partyTypes",
                 json={"code": "CONTRACT_TEST", "name": "Contract Test",
                       "description": "created by contract test",
                       "partyTypeCode": "ORGANIZATION"})
    assert resp.status_code == 201
    party_type_id = resp.json()["data"]["id"]
    try:
        resp = check(client, party_type_spec, "GET", "/api/partyTypes/{id}",
                     path=f"/api/partyTypes/{party_type_id}")
        data = resp.json()["data"]
        assert data["code"] == "CONTRACT_TEST"
        assert data["name"] == "Contract Test"
        assert data["partyTypeCode"] == "ORGANIZATION"

        resp = check(client, party_type_spec, "PUT", "/api/partyTypes/{id}",
                     path=f"/api/partyTypes/{party_type_id}",
                     json={"name": "Contract Test Renamed",
                           "partyTypeCode": "PERSON"})
        data = resp.json()["data"]
        assert data["name"] == "Contract Test Renamed"
        assert data["partyTypeCode"] == "PERSON"
        # Unmentioned keys are left untouched (partial update).
        assert data["code"] == "CONTRACT_TEST"
    finally:
        resp = check(client, party_type_spec, "DELETE", "/api/partyTypes/{id}",
                     path=f"/api/partyTypes/{party_type_id}")
        assert resp.status_code == 204


def test_create_without_required_fields_is_validation_error(client):
    resp = check(client, party_type_spec, "POST", "/api/partyTypes", json={})
    assert resp.status_code == 400


def test_create_with_unknown_party_type_code_is_bad_request(client):
    resp = check(client, party_type_spec, "POST", "/api/partyTypes",
                 json={"code": "BADCODE", "name": "Bad Code",
                       "partyTypeCode": "NOT_A_CODE"})
    assert resp.status_code == 400


def test_delete_unknown(client):
    resp = check(client, party_type_spec, "DELETE", "/api/partyTypes/{id}",
                 path="/api/partyTypes/doesnotexist0000")
    assert resp.status_code == 404


def test_party_role_list(client):
    resp = check(client, party_role_spec, "GET", "/api/partyRoles")
    body = resp.json()
    assert body["totalCount"] >= len(body["data"])
    assert len(body["data"]) <= 10


def test_party_role_list_sorted_and_paged(client):
    resp = check(client, party_role_spec, "GET", "/api/partyRoles",
                 params={"max": "5", "offset": "0", "sort": "id",
                         "order": "asc"})
    data = resp.json()["data"]
    assert len(data) <= 5
    ids = [row["id"] for row in data]
    assert ids == sorted(ids)


def test_party_role_list_row_matches_details(client):
    rows = client.get_json("/api/partyRoles", params={"max": "1"})["data"]
    if not rows:
        pytest.skip("no party roles in the dataset")
    row = rows[0]
    details = client.get_json(f"/api/partyRoles/{row['id']}/details")["data"]
    assert details["id"] == row["id"]
    assert details["roleType"] == row["roleType"]
    assert (details["party"] or {}).get("id") == (row["party"] or {}).get("id")
