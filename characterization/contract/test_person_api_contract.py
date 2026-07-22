"""Contract tests for PersonApiController (openapi/specs/person-api.yaml)."""

from oas import Spec, check

spec = Spec("person-api.yaml")


def test_list(client):
    resp = check(client, spec, "GET", "/api/persons")
    assert resp.json()["data"], "seeded dataset should have persons"


def test_list_filtered(client):
    resp = check(client, spec, "GET", "/api/persons",
                 params={"name": "Smith", "max": "2", "sort": "firstName",
                         "order": "asc"})
    data = resp.json()["data"]
    assert data, "demo dataset should have persons matching 'Smith'"
    assert all(p["lastName"] == "Smith" for p in data)


def test_list_by_status(client):
    check(client, spec, "GET", "/api/persons", params={"status": "true"})
