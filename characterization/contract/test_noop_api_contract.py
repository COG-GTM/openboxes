"""Contract tests for NoopApiController (openapi/specs/noop-api.yaml).

Every action throws NotImplementedException, so every operation is pinned
to the 500 JSON error rendering.
"""

from oas import Spec, check

spec = Spec("noop-api.yaml")


def test_list(client):
    check(client, spec, "GET", "/api/noops")


def test_create(client):
    check(client, spec, "POST", "/api/noops", json={})


def test_read(client):
    check(client, spec, "GET", "/api/noops/{id}", path="/api/noops/doesnotexist0000")


def test_update_post(client):
    check(client, spec, "POST", "/api/noops/{id}",
          path="/api/noops/doesnotexist0000", json={})


def test_update_put(client):
    check(client, spec, "PUT", "/api/noops/{id}",
          path="/api/noops/doesnotexist0000", json={})


def test_delete(client):
    check(client, spec, "DELETE", "/api/noops/{id}",
          path="/api/noops/doesnotexist0000")
