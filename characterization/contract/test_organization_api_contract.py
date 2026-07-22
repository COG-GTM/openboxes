"""Contract tests for OrganizationApiController (openapi/specs/organization-api.yaml).

The create flow makes a dedicated ZZ-named organization and deletes it via
the generic API afterwards (OrganizationApiController has no working delete
of its own), same convention as the snapshot suite.
"""

import pytest

from oas import Spec, check

spec = Spec("organization-api.yaml")

TEST_NAME = "ZZ Contract Organization"


@pytest.fixture(scope="module", autouse=True)
def cleanup_leftovers(client):
    for org in client.get_json("/api/organizations")["data"]:
        if org.get("name") == TEST_NAME:
            client.request("DELETE", f"/api/generic/organization/{org['id']}")


def test_list(client):
    resp = check(client, spec, "GET", "/api/organizations")
    assert resp.json()["data"], "seeded dataset should have organizations"


def test_list_filtered(client):
    resp = check(client, spec, "GET", "/api/organizations",
                 params={"q": "Amazon", "roleType": "ROLE_SUPPLIER",
                         "sort": "name", "order": "asc"})
    assert any(o["name"] == "Amazon.com" for o in resp.json()["data"])


def test_read(client):
    amazon = next(o for o in client.get_json("/api/organizations")["data"]
                  if o.get("name") == "Amazon.com")
    check(client, spec, "GET", "/api/organizations/{id}",
          path=f"/api/organizations/{amazon['id']}")


def test_read_unknown(client):
    resp = check(client, spec, "GET", "/api/organizations/{id}",
                 path="/api/organizations/doesnotexist0000")
    assert resp.status_code == 500


def test_create(client):
    resp = check(client, spec, "POST", "/api/organizations",
                 json={"name": TEST_NAME})
    assert resp.status_code == 200
    org_id = resp.json()["data"]["id"]
    try:
        check(client, spec, "GET", "/api/organizations/{id}",
              path=f"/api/organizations/{org_id}")
    finally:
        client.request("DELETE", f"/api/generic/organization/{org_id}")
