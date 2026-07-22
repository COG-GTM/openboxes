"""Contract tests for EventTypeApiController (openapi/specs/event-type-api.yaml)."""

import pytest

from oas import Spec, check

spec = Spec("event-type-api.yaml")


@pytest.fixture(scope="module", autouse=True)
def require_endpoint(client):
    # The pinned released image predates the event type API; only source
    # builds of this branch expose it.
    if client.request("GET", "/api/eventTypes",
                      params={"max": "1"}).status_code != 200:
        pytest.skip("app build does not expose /api/eventTypes")


def test_list(client):
    resp = check(client, spec, "GET", "/api/eventTypes")
    body = resp.json()
    assert body["totalCount"] >= len(body["data"])
    assert body["data"], "seeded dataset should have event types"


def test_list_paged_and_sorted(client):
    resp = check(client, spec, "GET", "/api/eventTypes",
                 params={"max": "5", "offset": "0",
                         "sort": "name", "order": "asc"})
    data = resp.json()["data"]
    assert len(data) <= 5
    names = [et["name"] for et in data]
    assert names == sorted(names)


def test_list_filtered(client):
    all_types = check(client, spec, "GET", "/api/eventTypes",
                      params={"max": "100"}).json()["data"]
    name = all_types[0]["name"]
    resp = check(client, spec, "GET", "/api/eventTypes",
                 params={"q": name[:4], "max": "100"})
    data = resp.json()["data"]
    assert data
    assert all(et["name"].lower().startswith(name[:4].lower()) for et in data)


def test_read(client):
    listed = check(client, spec, "GET", "/api/eventTypes",
                   params={"max": "1"}).json()["data"][0]
    resp = check(client, spec, "GET", "/api/eventTypes/{id}",
                 path=f"/api/eventTypes/{listed['id']}")
    data = resp.json()["data"]
    assert data["id"] == listed["id"]
    assert data["name"] == listed["name"]
    assert data["eventCode"] == listed["eventCode"]


def test_read_unknown(client):
    resp = check(client, spec, "GET", "/api/eventTypes/{id}",
                 path="/api/eventTypes/doesnotexist0000")
    assert resp.status_code == 404


def test_delete_unknown(client):
    resp = check(client, spec, "DELETE", "/api/eventTypes/{id}",
                 path="/api/eventTypes/doesnotexist0000")
    assert resp.status_code == 404
