"""Contract tests for TagApiController (openapi/specs/tag-api.yaml).

Tags are created through the generic API (there is no dedicated create
endpoint; tag create/edit/list remain legacy GSP screens in Batch 13).
"""

import pytest

from oas import Spec, check

spec = Spec("tag-api.yaml")

TEST_TAG = "ZZ Contract Tag"
UNKNOWN = "doesnotexist0000"


@pytest.fixture(scope="module", autouse=True)
def require_endpoint(client):
    # The pinned released image predates this endpoint; only source builds
    # of this branch expose it. A 404 on an unknown id cannot distinguish
    # "endpoint missing" from "tag missing", so probe with a real tag.
    resp = client.request("POST", "/api/generic/tag",
                          json={"tag": f"{TEST_TAG} probe"})
    assert resp.status_code == 201
    probe_id = resp.json()["data"]["id"]
    exists = client.request("GET", f"/api/tags/{probe_id}").status_code == 200
    client.request("DELETE", f"/api/generic/tag/{probe_id}")
    if not exists:
        pytest.skip("app build does not expose /api/tags/{id}")


@pytest.fixture(scope="module", autouse=True)
def cleanup_leftovers(client, require_endpoint):
    for tag in client.get_json("/api/generic/tag?max=100")["data"]:
        if str(tag.get("tag", "")).startswith(TEST_TAG):
            client.request("DELETE", f"/api/tags/{tag['id']}")


def _create_tag(client):
    resp = client.request("POST", "/api/generic/tag", json={"tag": TEST_TAG})
    assert resp.status_code == 201
    return resp.json()["data"]["id"]


def test_read_unknown(client):
    resp = check(client, spec, "GET", "/api/tags/{id}",
                 path=f"/api/tags/{UNKNOWN}")
    assert resp.status_code == 404


def test_delete_unknown(client):
    resp = check(client, spec, "DELETE", "/api/tags/{id}",
                 path=f"/api/tags/{UNKNOWN}")
    assert resp.status_code == 404


def test_read_and_delete(client):
    tag_id = _create_tag(client)

    read = check(client, spec, "GET", "/api/tags/{id}",
                 path=f"/api/tags/{tag_id}")
    assert read.status_code == 200
    data = read.json()["data"]
    assert data["tag"] == TEST_TAG
    assert data["products"] == []

    deleted = check(client, spec, "DELETE", "/api/tags/{id}",
                    path=f"/api/tags/{tag_id}")
    assert deleted.status_code == 204

    gone = check(client, spec, "GET", "/api/tags/{id}",
                 path=f"/api/tags/{tag_id}")
    assert gone.status_code == 404
