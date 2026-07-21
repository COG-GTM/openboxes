"""Snapshot tests for safe POST/PUT/DELETE flows of API controllers A-L.

Each flow creates a dedicated, deterministically-named test record ("ZZ
Characterization ..."), snapshots every step, and deletes what it created so
the suite stays re-runnable. Leftovers from a previous aborted run are
cleaned up first.

Also exercises the stateless POST search endpoints and the login/logout pair
(re-logging in afterwards so the shared session stays authenticated).
"""

import pytest

from a_l import mask_doc
from obx import PASSWORD, USERNAME, check_snapshot, record_response


def step(client, name, method, path, json=None, params=None, capture=None):
    resp = client.request(method, path, json=json, params=params)
    # Capture created-record ids before the snapshot assertion so cleanup
    # fixtures can still delete the record if the snapshot check fails.
    if capture is not None:
        capture(resp)
    doc = mask_doc(record_response(name, method, path, resp, params))
    check_snapshot(name, doc)
    return resp


@pytest.fixture(scope="module", autouse=True)
def cleanup_leftovers(client):
    """Remove dedicated test records left over from a previous aborted run."""
    for cat in client.get_json("/api/categories")["data"]:
        if cat.get("name") == "ZZ Characterization Category":
            client.request("DELETE", f"/api/categories/{cat['id']}")
    for group in client.get_json("/api/locationGroups")["data"]:
        if str(group.get("name", "")).startswith("ZZ Characterization Location Group"):
            client.request("DELETE", f"/api/locationGroups/{group['id']}")
    for lt in client.get_json("/api/generic/locationType/")["data"]:
        if lt.get("name") == "ZZ Characterization Location Type":
            client.request("DELETE", f"/api/generic/locationType/{lt['id']}")
    for org in client.get_json("/api/organizations")["data"]:
        if org.get("name") == "ZZ Characterization Organization":
            client.request("DELETE", f"/api/generic/organization/{org['id']}")


class TestSearchEndpoints:
    """Stateless POST search/query endpoints (no records created)."""

    def test_combined_shipment_item_find_order_items(self, client):
        step(client, "combinedShipmentItem__findOrderItems", "POST",
             "/api/combinedShipmentItems/findOrderItems", json={})

    def test_generic_location_type_search(self, client):
        step(client, "generic__locationType_search", "POST",
             "/api/generic/locationType/search", json={}, params={"max": "5"})


class TestCategoryFlow:
    """CategoryApiController create/read/delete flow."""

    @pytest.fixture(scope="class")
    def flow(self, client):
        state = {}
        yield state
        if state.get("category_id"):
            client.request("DELETE", f"/api/categories/{state['category_id']}")

    def test_01_create(self, client, flow):
        def capture(resp):
            parsed = resp.json()
            data = parsed.get("data") or parsed  # save() renders the bare category
            flow["category_id"] = data.get("id")

        root = next(c for c in client.get_json("/api/categories")["data"]
                    if c.get("name") == "ROOT")
        step(client, "category__create", "POST", "/api/categories",
             json={"name": "ZZ Characterization Category",
                   "parentCategory": {"id": root["id"]}},
             capture=capture)

    def test_02_read(self, client, flow):
        step(client, "category__read_created", "GET",
             f"/api/categories/{flow['category_id']}")

    def test_03_delete(self, client, flow):
        step(client, "category__delete_created", "DELETE",
             f"/api/categories/{flow['category_id']}")
        flow["category_id"] = None


class TestGenericLocationTypeFlow:
    """GenericApiController create/update/delete flow (locationType domain)."""

    @pytest.fixture(scope="class")
    def flow(self, client):
        state = {}
        yield state
        if state.get("location_type_id"):
            client.request(
                "DELETE", f"/api/generic/locationType/{state['location_type_id']}")

    def test_01_create(self, client, flow):
        step(client, "generic__locationType_create", "POST",
             "/api/generic/locationType/",
             json={"name": "ZZ Characterization Location Type",
                   "locationTypeCode": "INTERNAL"},
             capture=lambda r: flow.update(
                 location_type_id=(r.json().get("data") or {}).get("id")))

    def test_02_update(self, client, flow):
        step(client, "generic__locationType_update", "PUT",
             f"/api/generic/locationType/{flow['location_type_id']}",
             json={"description": "renamed by characterization suite"})

    def test_03_delete(self, client, flow):
        step(client, "generic__locationType_delete", "DELETE",
             f"/api/generic/locationType/{flow['location_type_id']}")
        flow["location_type_id"] = None


class TestLocationGroupFlow:
    """LocationGroupApiController create/update/delete flow."""

    @pytest.fixture(scope="class")
    def flow(self, client):
        state = {}
        yield state
        if state.get("location_group_id"):
            client.request(
                "DELETE", f"/api/locationGroups/{state['location_group_id']}")

    def test_01_create(self, client, flow):
        step(client, "locationGroup__create", "POST", "/api/locationGroups",
             json={"name": "ZZ Characterization Location Group"},
             capture=lambda r: flow.update(
                 location_group_id=(r.json().get("data") or {}).get("id")))

    def test_02_update(self, client, flow):
        step(client, "locationGroup__update", "PUT",
             f"/api/locationGroups/{flow['location_group_id']}",
             json={"name": "ZZ Characterization Location Group (renamed)"})

    def test_03_delete(self, client, flow):
        step(client, "locationGroup__delete", "DELETE",
             f"/api/locationGroups/{flow['location_group_id']}")
        flow["location_group_id"] = None


class TestOrganizationFlow:
    """OrganizationApiController create + delete (via generic) flow."""

    @pytest.fixture(scope="class")
    def flow(self, client):
        state = {}
        yield state
        if state.get("organization_id"):
            client.request(
                "DELETE", f"/api/generic/organization/{state['organization_id']}")

    def test_01_create(self, client, flow):
        step(client, "organization__create", "POST", "/api/organizations",
             json={"name": "ZZ Characterization Organization"},
             capture=lambda r: flow.update(
                 organization_id=(r.json().get("data") or {}).get("id")))

    def test_02_delete(self, client, flow):
        step(client, "organization__delete", "DELETE",
             f"/api/generic/organization/{flow['organization_id']}")
        flow["organization_id"] = None


class TestLoginLogout:
    """ApiController login/logout; the session is re-authenticated afterwards
    so later test modules keep a valid session."""

    def test_01_login(self, client):
        step(client, "api__login", "POST", "/api/login",
             json={"username": USERNAME, "password": PASSWORD})

    def test_02_logout(self, client):
        step(client, "api__logout", "GET", "/api/logout")
        client.login()
