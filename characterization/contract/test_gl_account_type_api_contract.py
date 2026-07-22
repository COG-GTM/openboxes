"""Contract tests for GlAccountTypeApiController
(openapi/specs/gl-account-type-api.yaml) and the glAccountTypeCodeOptions
action (openapi/specs/select-options-api.yaml)."""

import pytest

from oas import Spec, check

spec = Spec("gl-account-type-api.yaml")
options_spec = Spec("select-options-api.yaml")

TEST_CODE = "ZZCONTRACTGLTYPE"


@pytest.fixture(scope="module", autouse=True)
def require_endpoint(client):
    # The pinned released image predates the GL account type API; only source
    # builds of this branch expose it.
    if client.request("GET", "/api/glAccountTypes", params={"max": "1"}).status_code != 200:
        pytest.skip("app build does not expose /api/glAccountTypes")


@pytest.fixture(scope="module", autouse=True)
def cleanup_leftovers(client, require_endpoint):
    for glt in client.get_json("/api/glAccountTypes?max=100&sort=code&order=desc")["data"]:
        if glt.get("code") == TEST_CODE:
            client.request("DELETE", f"/api/glAccountTypes/{glt['id']}")


def test_gl_account_type_code_options(client):
    resp = check(client, options_spec, "GET", "/api/glAccountTypeCodeOptions")
    values = {o["value"] for o in resp.json()["data"]}
    assert values == {"ASSET", "EXPENSE", "LIABILITY", "EQUITY", "REVENUE"}


def test_list(client):
    resp = check(client, spec, "GET", "/api/glAccountTypes")
    body = resp.json()
    assert body["totalCount"] >= len(body["data"])


def test_list_paged_and_sorted(client):
    resp = check(client, spec, "GET", "/api/glAccountTypes",
                 params={"max": "5", "offset": "0",
                         "sort": "code", "order": "asc"})
    data = resp.json()["data"]
    assert len(data) <= 5
    codes = [glt["code"] for glt in data]
    assert codes == sorted(codes)


def test_read_unknown(client):
    resp = check(client, spec, "GET", "/api/glAccountTypes/{id}",
                 path="/api/glAccountTypes/doesnotexist0000")
    assert resp.status_code == 404


def test_create_read_update_delete(client):
    resp = check(client, spec, "POST", "/api/glAccountTypes",
                 json={"code": TEST_CODE, "name": "Contract GL Account Type",
                       "glAccountTypeCode": "ASSET"})
    assert resp.status_code == 201
    glt_id = resp.json()["data"]["id"]
    try:
        resp = check(client, spec, "GET", "/api/glAccountTypes/{id}",
                     path=f"/api/glAccountTypes/{glt_id}")
        assert resp.json()["data"]["code"] == TEST_CODE
        assert resp.json()["data"]["glAccountTypeCode"] == "ASSET"

        resp = check(client, spec, "PUT", "/api/glAccountTypes/{id}",
                     path=f"/api/glAccountTypes/{glt_id}",
                     json={"name": "Renamed GL Account Type",
                           "glAccountTypeCode": "EXPENSE"})
        assert resp.json()["data"]["name"] == "Renamed GL Account Type"
        assert resp.json()["data"]["glAccountTypeCode"] == "EXPENSE"
    finally:
        resp = check(client, spec, "DELETE", "/api/glAccountTypes/{id}",
                     path=f"/api/glAccountTypes/{glt_id}")
        assert resp.status_code == 204


def test_create_validation_error(client):
    resp = check(client, spec, "POST", "/api/glAccountTypes",
                 json={"code": ""})
    assert resp.status_code == 400
