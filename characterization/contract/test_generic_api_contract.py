"""Contract tests for GenericApiController (openapi/specs/generic-api.yaml).

Exercises the generic CRUD endpoints against the Tag domain (simple, no
seeded dependencies). Write flows use dedicated "ZZ Contract ..." names and
clean up after themselves so the suite stays re-runnable.
"""

import pytest

from oas import Spec, check

spec = Spec("generic-api.yaml")

TAG_PREFIX = "ZZ Contract Tag"


def _cleanup(client):
    for tag in client.get_json("/api/generic/tag")["data"]:
        if str(tag.get("tag", "")).startswith(TAG_PREFIX):
            client.request("DELETE", f"/api/generic/tag/{tag['id']}")


@pytest.fixture(scope="module", autouse=True)
def cleanup_leftovers(client):
    _cleanup(client)
    yield
    _cleanup(client)


def test_list(client):
    resp = check(client, spec, "GET", "/api/generic/{resource}",
                 path="/api/generic/tag")
    assert isinstance(resp.json()["data"], list)


def test_crud_flow(client):
    resp = check(client, spec, "POST", "/api/generic/{resource}",
                 path="/api/generic/tag", json={"tag": TAG_PREFIX})
    assert resp.status_code == 201
    tag_id = resp.json()["data"]["id"]
    try:
        check(client, spec, "GET", "/api/generic/{resource}/{id}",
              path=f"/api/generic/tag/{tag_id}")
        check(client, spec, "POST", "/api/generic/{resource}/{id}",
              path=f"/api/generic/tag/{tag_id}",
              json={"tag": f"{TAG_PREFIX} via POST"})
        check(client, spec, "PUT", "/api/generic/{resource}/{id}",
              path=f"/api/generic/tag/{tag_id}",
              json={"tag": f"{TAG_PREFIX} via PUT"})
        resp = check(client, spec, "POST", "/api/generic/{resource}/search",
                     path="/api/generic/tag/search",
                     json={"searchAttributes": [
                         {"property": "tag", "operator": "eq",
                          "value": f"{TAG_PREFIX} via PUT"}]})
        assert [t["id"] for t in resp.json()["data"]] == [tag_id]
    finally:
        resp = check(client, spec, "DELETE", "/api/generic/{resource}/{id}",
                     path=f"/api/generic/tag/{tag_id}")
        assert resp.status_code == 204


def test_create_batch(client):
    resp = check(client, spec, "POST", "/api/generic/{resource}",
                 path="/api/generic/tag",
                 json=[{"tag": f"{TAG_PREFIX} A"}, {"tag": f"{TAG_PREFIX} B"}])
    assert resp.status_code == 201
    created = resp.json()["data"]
    assert isinstance(created, list) and len(created) == 2
    for tag in created:
        client.request("DELETE", f"/api/generic/tag/{tag['id']}")


def test_search_get(client):
    check(client, spec, "GET", "/api/generic/{resource}/search",
          path="/api/generic/tag/search")


def test_create_validation_error(client):
    resp = check(client, spec, "POST", "/api/generic/{resource}",
                 path="/api/generic/tag", json={})
    assert resp.status_code == 400


def test_read_unknown_id(client):
    check(client, spec, "GET", "/api/generic/{resource}/{id}",
          path="/api/generic/tag/doesnotexist0000")


def test_unknown_resource(client):
    resp = check(client, spec, "GET", "/api/generic/{resource}",
                 path="/api/generic/notadomainclass/")
    assert resp.status_code == 500
