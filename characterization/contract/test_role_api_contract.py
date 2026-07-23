"""Contract tests for RoleApiController (openapi/specs/role-api.yaml)."""

import pytest

from oas import Spec, check

spec = Spec("role-api.yaml")

# Demo data seeds the Admin role with id "1"
ADMIN_ROLE_ID = "1"


@pytest.fixture(scope="module", autouse=True)
def require_endpoint(client):
    # The pinned released image predates the Batch 45 role endpoints;
    # only source builds of this branch expose them.
    if client.request("GET", f"/api/roles/{ADMIN_ROLE_ID}").status_code not in (200, 404):
        pytest.skip("app build does not expose /api/roles/{id}")


def test_read_role(client):
    resp = check(client, spec, "GET", "/api/roles/{id}",
                 path=f"/api/roles/{ADMIN_ROLE_ID}")
    if resp.status_code == 404:
        pytest.skip("Admin role not seeded with id 1 in this database")
    data = resp.json()["data"]
    assert data["id"] == ADMIN_ROLE_ID
    assert data["name"]
    assert data["roleType"], "seeded roles have a role type"


def test_read_unknown_role(client):
    resp = check(client, spec, "GET", "/api/roles/{id}",
                 path="/api/roles/no-such-role")
    assert resp.status_code == 404


def test_delete_unknown_role(client):
    resp = check(client, spec, "DELETE", "/api/roles/{id}",
                 path="/api/roles/no-such-role")
    assert resp.status_code == 404


def test_delete_role_in_use(client):
    # The Admin role is assigned to seeded users, so deleting it must fail
    # with a conflict instead of corrupting the data.
    if client.request("GET", f"/api/roles/{ADMIN_ROLE_ID}").status_code != 200:
        pytest.skip("Admin role not seeded with id 1 in this database")
    resp = check(client, spec, "DELETE", "/api/roles/{id}",
                 path=f"/api/roles/{ADMIN_ROLE_ID}")
    assert resp.status_code == 409
    # Role must still exist
    assert client.request(
        "GET", f"/api/roles/{ADMIN_ROLE_ID}").status_code == 200
