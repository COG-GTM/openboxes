"""Contract tests for GlAccountApiController (openapi/specs/gl-account-api.yaml)
and the glAccountTypeOptions action (openapi/specs/select-options-api.yaml)."""

import pytest

from oas import Spec, check

spec = Spec("gl-account-api.yaml")
options_spec = Spec("select-options-api.yaml")

TEST_CODE = "ZZCONTRACTGL"


@pytest.fixture(scope="module", autouse=True)
def require_endpoint(client):
    # The pinned released image predates the GL account API; only source
    # builds of this branch expose it.
    if client.request("GET", "/api/glAccounts", params={"max": "1"}).status_code == 404:
        pytest.skip("app build does not expose /api/glAccounts")


@pytest.fixture(scope="module", autouse=True)
def cleanup_leftovers(client, require_endpoint):
    for gl in client.get_json("/api/glAccounts?max=100&sort=code&order=desc")["data"]:
        if gl.get("code") == TEST_CODE:
            client.request("DELETE", f"/api/glAccounts/{gl['id']}")


@pytest.fixture(scope="module")
def gl_account_type_id(client):
    resp = client.get_json("/api/glAccountTypeOptions")
    if not resp["data"]:
        pytest.skip("seeded dataset has no GL account types")
    return resp["data"][0]["id"]


def test_gl_account_type_options(client):
    resp = check(client, options_spec, "GET", "/api/glAccountTypeOptions")
    assert isinstance(resp.json()["data"], list)


def test_list(client):
    resp = check(client, spec, "GET", "/api/glAccounts")
    body = resp.json()
    assert body["totalCount"] >= len(body["data"])


def test_list_paged_and_sorted(client):
    resp = check(client, spec, "GET", "/api/glAccounts",
                 params={"max": "5", "offset": "0",
                         "sort": "code", "order": "asc"})
    data = resp.json()["data"]
    assert len(data) <= 5
    codes = [gl["code"] for gl in data]
    assert codes == sorted(codes)


def test_read_unknown(client):
    resp = check(client, spec, "GET", "/api/glAccounts/{id}",
                 path="/api/glAccounts/doesnotexist0000")
    assert resp.status_code == 404


def test_create_read_update_delete(client, gl_account_type_id):
    resp = check(client, spec, "POST", "/api/glAccounts",
                 json={"code": TEST_CODE, "name": "Contract GL Account",
                       "description": "contract test", "active": True,
                       "glAccountType": {"id": gl_account_type_id}})
    assert resp.status_code == 201
    gl_id = resp.json()["data"]["id"]
    try:
        resp = check(client, spec, "GET", "/api/glAccounts/{id}",
                     path=f"/api/glAccounts/{gl_id}")
        assert resp.json()["data"]["code"] == TEST_CODE
        assert resp.json()["data"]["glAccountType"]["id"] == gl_account_type_id

        resp = check(client, spec, "PUT", "/api/glAccounts/{id}",
                     path=f"/api/glAccounts/{gl_id}",
                     json={"name": "Renamed GL Account", "active": False})
        assert resp.json()["data"]["name"] == "Renamed GL Account"
        assert resp.json()["data"]["active"] is False
    finally:
        resp = check(client, spec, "DELETE", "/api/glAccounts/{id}",
                     path=f"/api/glAccounts/{gl_id}")
        assert resp.status_code == 204


def test_create_validation_error(client):
    resp = check(client, spec, "POST", "/api/glAccounts", json={"code": ""})
    assert resp.status_code == 400


def test_cannot_deactivate_gl_account_with_products(client):
    # Find a GL account referenced by a seeded product via the generic API.
    products = client.get_json("/api/generic/product/?max=200")["data"]
    gl_ids = {p["glAccount"]["id"] for p in products
              if isinstance(p.get("glAccount"), dict) and p["glAccount"].get("id")}
    if not gl_ids:
        pytest.skip("no seeded product with a GL account")
    gl_id = next(iter(gl_ids))
    resp = check(client, spec, "PUT", "/api/glAccounts/{id}",
                 path=f"/api/glAccounts/{gl_id}",
                 json={"active": False})
    assert resp.status_code == 400
