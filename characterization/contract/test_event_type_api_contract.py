"""Contract tests for EventTypeApiController
(openapi/specs/event-type-api.yaml) and the eventCodeOptions action
(openapi/specs/select-options-api.yaml)."""

import pytest

from oas import Spec, check

spec = Spec("event-type-api.yaml")
options_spec = Spec("select-options-api.yaml")

TEST_NAME = "ZZ Contract Event Type"


@pytest.fixture(scope="module", autouse=True)
def require_endpoint(client):
    # The pinned released image predates the event type API; only source
    # builds of this branch expose it.
    if client.request("GET", "/api/eventTypes",
                      params={"max": "1"}).status_code != 200:
        pytest.skip("app build does not expose /api/eventTypes")


@pytest.fixture(scope="module", autouse=True)
def cleanup_leftovers(client, require_endpoint):
    for et in client.get_json("/api/eventTypes?max=100")["data"]:
        if et.get("name") == TEST_NAME:
            client.request("DELETE", f"/api/eventTypes/{et['id']}")


def test_event_code_options(client):
    resp = check(client, options_spec, "GET", "/api/eventCodeOptions")
    values = {o["value"] for o in resp.json()["data"]}
    assert {"CREATED", "SHIPPED", "RECEIVED", "CUSTOM"} <= values
    for option in resp.json()["data"]:
        assert option["id"] == option["value"] == option["label"]


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


def test_create_read_update_delete(client):
    resp = check(client, spec, "POST", "/api/eventTypes",
                 json={"name": TEST_NAME, "description": "Contract test",
                       "sortOrder": 999, "eventCode": "CUSTOM"})
    assert resp.status_code == 201
    et_id = resp.json()["data"]["id"]
    try:
        resp = check(client, spec, "GET", "/api/eventTypes/{id}",
                     path=f"/api/eventTypes/{et_id}")
        assert resp.json()["data"]["name"] == TEST_NAME
        assert resp.json()["data"]["eventCode"] == "CUSTOM"
        assert resp.json()["data"]["sortOrder"] == 999

        resp = check(client, spec, "PUT", "/api/eventTypes/{id}",
                     path=f"/api/eventTypes/{et_id}",
                     json={"description": "Renamed contract test"})
        assert resp.json()["data"]["description"] == "Renamed contract test"
        # Partial update: untouched fields keep their values
        assert resp.json()["data"]["name"] == TEST_NAME
    finally:
        resp = check(client, spec, "DELETE", "/api/eventTypes/{id}",
                     path=f"/api/eventTypes/{et_id}")
        assert resp.status_code == 204


def test_create_validation_error(client):
    resp = check(client, spec, "POST", "/api/eventTypes",
                 json={"name": ""})
    assert resp.status_code == 400
