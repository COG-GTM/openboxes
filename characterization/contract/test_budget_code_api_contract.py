"""Contract tests for BudgetCodeApiController (openapi/specs/budget-code-api.yaml)."""

import pytest

from oas import Spec, check

spec = Spec("budget-code-api.yaml")

TEST_CODE = "ZZCONTRACTBC"


@pytest.fixture(scope="module", autouse=True)
def require_endpoint(client):
    # The pinned released image predates the budget code API; only source
    # builds of this branch expose it.
    if client.request("GET", "/api/budgetCodes", params={"max": "1"}).status_code == 404:
        pytest.skip("app build does not expose /api/budgetCodes")


@pytest.fixture(scope="module", autouse=True)
def cleanup_leftovers(client, require_endpoint):
    for bc in client.get_json("/api/budgetCodes",
                              params={"q": TEST_CODE, "max": "100"})["data"]:
        if bc.get("code") == TEST_CODE:
            client.request("DELETE", f"/api/budgetCodes/{bc['id']}")


def test_list(client):
    resp = check(client, spec, "GET", "/api/budgetCodes")
    body = resp.json()
    assert body["totalCount"] >= len(body["data"])


def test_list_paged_and_sorted(client):
    resp = check(client, spec, "GET", "/api/budgetCodes",
                 params={"max": "5", "offset": "0",
                         "sort": "code", "order": "asc"})
    data = resp.json()["data"]
    assert len(data) <= 5
    codes = [bc["code"] for bc in data]
    assert codes == sorted(codes)


def test_read_unknown(client):
    resp = check(client, spec, "GET", "/api/budgetCodes/{id}",
                 path="/api/budgetCodes/doesnotexist0000")
    assert resp.status_code == 404


def test_create_read_update_delete(client):
    resp = check(client, spec, "POST", "/api/budgetCodes",
                 json={"code": TEST_CODE, "name": "Contract Budget Code",
                       "description": "contract test", "active": True})
    assert resp.status_code == 201
    bc_id = resp.json()["data"]["id"]
    try:
        resp = check(client, spec, "GET", "/api/budgetCodes/{id}",
                     path=f"/api/budgetCodes/{bc_id}")
        assert resp.json()["data"]["code"] == TEST_CODE

        resp = check(client, spec, "GET", "/api/budgetCodes",
                     params={"q": TEST_CODE})
        assert any(bc["id"] == bc_id for bc in resp.json()["data"])

        resp = check(client, spec, "PUT", "/api/budgetCodes/{id}",
                     path=f"/api/budgetCodes/{bc_id}",
                     json={"name": "Renamed Budget Code", "active": False})
        assert resp.json()["data"]["name"] == "Renamed Budget Code"
        assert resp.json()["data"]["active"] is False
    finally:
        resp = check(client, spec, "DELETE", "/api/budgetCodes/{id}",
                     path=f"/api/budgetCodes/{bc_id}")
        assert resp.status_code == 204


def test_create_validation_error(client):
    resp = check(client, spec, "POST", "/api/budgetCodes", json={"code": ""})
    assert resp.status_code == 400
