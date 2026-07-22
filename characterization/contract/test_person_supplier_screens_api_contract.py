"""Contract tests for the Batch 36 person/supplier screen endpoints
(/api/persons/search, /api/persons/{id}/details, POST /api/persons,
PUT/DELETE /api/persons/{id} in openapi/specs/person-api.yaml;
/api/suppliers/search, /api/suppliers/{id}/details,
/api/suppliers/{id}/priceHistory in openapi/specs/supplier-api.yaml)."""

import pytest

from oas import Spec, check

person_spec = Spec("person-api.yaml")
supplier_spec = Spec("supplier-api.yaml")


@pytest.fixture(scope="module", autouse=True)
def require_endpoint(client):
    # The pinned released image predates the Batch 36 screen endpoints; only
    # source builds of this branch expose them.
    if client.request("GET", "/api/persons/search",
                      params={"max": "1"}).status_code != 200:
        pytest.skip("app build does not expose /api/persons/search")


def test_person_search(client):
    resp = check(client, person_spec, "GET", "/api/persons/search")
    body = resp.json()
    assert body["totalCount"] >= len(body["data"])
    assert len(body["data"]) <= 10


def test_person_search_sorted_and_paged(client):
    resp = check(client, person_spec, "GET", "/api/persons/search",
                 params={"max": "5", "offset": "0", "sort": "lastName",
                         "order": "asc"})
    data = resp.json()["data"]
    assert len(data) <= 5
    last_names = [(row["lastName"] or "").lower() for row in data]
    assert last_names == sorted(last_names)


def test_person_search_filtered(client):
    resp = check(client, person_spec, "GET", "/api/persons/search",
                 params={"q": "Smith", "max": "50"})
    data = resp.json()["data"]
    assert data, "demo dataset should have persons matching 'Smith'"
    for row in data:
        haystack = " ".join(
            filter(None, [row["firstName"], row["lastName"], row["email"]]))
        assert "smith" in haystack.lower()


def test_person_search_no_match(client):
    resp = check(client, person_spec, "GET", "/api/persons/search",
                 params={"q": "zzznosuchperson", "max": "5"})
    body = resp.json()
    assert body["data"] == []
    assert body["totalCount"] == 0


def test_person_details_matches_search_row(client):
    row = client.get_json("/api/persons/search", params={"max": "1"})["data"][0]
    resp = check(client, person_spec, "GET", "/api/persons/{id}/details",
                 path=f"/api/persons/{row['id']}/details")
    details = resp.json()["data"]
    assert details["id"] == row["id"]
    assert details["type"] == row["type"]


def test_person_details_unknown(client):
    check(client, person_spec, "GET", "/api/persons/{id}/details",
          path="/api/persons/doesnotexist0000/details")


def test_person_roundtrip(client):
    resp = check(client, person_spec, "POST", "/api/persons",
                 json={"firstName": "ZZ Contract", "lastName": "Person",
                       "email": "zz.contract.person@example.com",
                       "phoneNumber": "555-0136", "active": True})
    person_id = resp.json()["data"]["id"]
    try:
        resp = check(client, person_spec, "GET", "/api/persons/{id}/details",
                     path=f"/api/persons/{person_id}/details")
        details = resp.json()["data"]
        assert details["firstName"] == "ZZ Contract"
        assert details["lastName"] == "Person"
        assert details["email"] == "zz.contract.person@example.com"
        assert details["phoneNumber"] == "555-0136"
        assert details["active"] is True
        assert details["type"] == "Person"

        resp = check(client, person_spec, "PUT", "/api/persons/{id}",
                     path=f"/api/persons/{person_id}",
                     json={"lastName": "Person Updated", "active": False})
        assert resp.json()["data"]["id"] == person_id

        details = client.get_json(f"/api/persons/{person_id}/details")["data"]
        assert details["firstName"] == "ZZ Contract"
        assert details["lastName"] == "Person Updated"
        assert details["active"] is False
    finally:
        resp = check(client, person_spec, "DELETE", "/api/persons/{id}",
                     path=f"/api/persons/{person_id}")
        assert resp.status_code == 204


def test_update_person_with_stale_version_conflicts(client):
    resp = check(client, person_spec, "POST", "/api/persons",
                 json={"firstName": "ZZ Stale", "lastName": "Version"})
    person_id = resp.json()["data"]["id"]
    try:
        resp = check(client, person_spec, "PUT", "/api/persons/{id}",
                     path=f"/api/persons/{person_id}",
                     json={"lastName": "Version 2", "version": 0})
        assert resp.status_code == 200

        resp = check(client, person_spec, "PUT", "/api/persons/{id}",
                     path=f"/api/persons/{person_id}",
                     json={"lastName": "Version 3", "version": 0})
        assert resp.status_code == 409

        details = client.get_json(f"/api/persons/{person_id}/details")["data"]
        assert details["lastName"] == "Version 2"
    finally:
        resp = check(client, person_spec, "DELETE", "/api/persons/{id}",
                     path=f"/api/persons/{person_id}")
        assert resp.status_code == 204


def test_create_person_without_names_is_validation_error(client):
    resp = check(client, person_spec, "POST", "/api/persons", json={})
    assert resp.status_code == 400


def test_delete_unknown_person(client):
    resp = check(client, person_spec, "DELETE", "/api/persons/{id}",
                 path="/api/persons/doesnotexist0000")
    assert resp.status_code == 404


def test_supplier_search(client):
    resp = check(client, supplier_spec, "GET", "/api/suppliers/search")
    body = resp.json()
    assert body["data"], "demo dataset should have suppliers"
    assert body["totalCount"] >= len(body["data"])
    assert len(body["data"]) <= 10
    names = [(row["name"] or "").lower() for row in body["data"]]
    assert names == sorted(names)


def test_supplier_search_filtered(client):
    row = client.get_json("/api/suppliers/search", params={"max": "1"})["data"][0]
    query = row["name"][:5]
    resp = check(client, supplier_spec, "GET", "/api/suppliers/search",
                 params={"q": query, "max": "50"})
    data = resp.json()["data"]
    assert data
    for match in data:
        haystack = " ".join(
            filter(None, [match["name"], (match["organization"] or {}).get("name")]))
        assert query.lower() in haystack.lower()


def test_supplier_search_no_match(client):
    resp = check(client, supplier_spec, "GET", "/api/suppliers/search",
                 params={"q": "zzznosuchsupplier", "max": "5"})
    body = resp.json()
    assert body["data"] == []
    assert body["totalCount"] == 0


def test_supplier_details_matches_search_row(client):
    row = client.get_json("/api/suppliers/search", params={"max": "1"})["data"][0]
    organization_id = row["organization"]["id"]
    resp = check(client, supplier_spec, "GET", "/api/suppliers/{id}/details",
                 path=f"/api/suppliers/{organization_id}/details")
    details = resp.json()["data"]
    assert details["id"] == organization_id
    assert details["name"] == row["organization"]["name"]
    assert row["id"] in [location["id"] for location in details["locations"]]


def test_supplier_details_unknown(client):
    check(client, supplier_spec, "GET", "/api/suppliers/{id}/details",
          path="/api/suppliers/doesnotexist0000/details")


def test_supplier_price_history(client):
    row = client.get_json("/api/suppliers/search", params={"max": "1"})["data"][0]
    organization_id = row["organization"]["id"]
    check(client, supplier_spec, "GET", "/api/suppliers/{id}/priceHistory",
          path=f"/api/suppliers/{organization_id}/priceHistory")
    check(client, supplier_spec, "GET", "/api/suppliers/{id}/priceHistory",
          path=f"/api/suppliers/{organization_id}/priceHistory",
          params={"q": "zzznosuchproduct"})


def test_supplier_price_history_unknown(client):
    check(client, supplier_spec, "GET", "/api/suppliers/{id}/priceHistory",
          path="/api/suppliers/doesnotexist0000/priceHistory")
