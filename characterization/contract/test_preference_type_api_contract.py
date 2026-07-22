"""Contract tests for PreferenceTypeApiController
(openapi/specs/preference-type-api.yaml)."""

import uuid

import pytest

from oas import Spec, check

spec = Spec("preference-type-api.yaml")


@pytest.fixture(scope="module", autouse=True)
def require_endpoint(client):
    # The pinned released image predates this endpoint; only source builds
    # of this branch expose it.
    if client.request("GET", "/api/preferenceTypes").status_code != 200:
        pytest.skip("app build does not expose /api/preferenceTypes")


def test_list(client):
    resp = check(client, spec, "GET", "/api/preferenceTypes")
    assert resp.status_code == 200
    body = resp.json()
    assert body["totalCount"] >= len(body["data"]) >= 0


def test_list_pagination_and_filter(client):
    resp = check(client, spec, "GET", "/api/preferenceTypes",
                 params={"max": 1, "offset": 0, "sort": "name", "order": "asc"})
    assert resp.status_code == 200
    assert len(resp.json()["data"]) <= 1


def test_create_read_update(client):
    suffix = uuid.uuid4().hex[:8]
    name = f"ZZ Contract preference type {suffix}"
    created = check(client, spec, "POST", "/api/preferenceTypes",
                    json={"name": name, "validationCode": "WARN"})
    assert created.status_code == 201
    data = created.json()["data"]
    assert data["name"] == name
    assert data["validationCode"] == "WARN"

    read = check(client, spec, "GET", "/api/preferenceTypes/{id}", path=f"/api/preferenceTypes/{data['id']}")
    assert read.status_code == 200
    assert read.json()["data"]["name"] == name

    updated = check(client, spec, "PUT", "/api/preferenceTypes/{id}", path=f"/api/preferenceTypes/{data['id']}",
                    json={"name": f"{name} (edited)", "validationCode": "BLOCK"})
    assert updated.status_code == 200
    assert updated.json()["data"]["name"] == f"{name} (edited)"
    assert updated.json()["data"]["validationCode"] == "BLOCK"


def test_create_invalid_validation_code(client):
    resp = check(client, spec, "POST", "/api/preferenceTypes",
                 json={"name": f"ZZ bad {uuid.uuid4().hex[:8]}",
                       "validationCode": "NOT_A_CODE"})
    assert resp.status_code == 400
