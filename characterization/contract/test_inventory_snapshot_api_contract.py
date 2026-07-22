"""Contract tests for InventorySnapshotApiController
(openapi/specs/inventory-snapshot-api.yaml).

The endpoint was added in Phase 2 Batch 6 for the React migration of the
legacy inventorySnapshot/list screen; these tests skip against builds
(e.g. the pinned baseline image) that predate it.
"""

import pytest

from oas import Spec, check

spec = Spec("inventory-snapshot-api.yaml")

PATH = "/api/inventorySnapshots"


@pytest.fixture(autouse=True, scope="module")
def _requires_inventory_snapshot_api(client):
    if client.request("GET", PATH).status_code == 404:
        pytest.skip("inventory snapshot API not present in target build")


def test_list_default(client):
    resp = check(client, spec, "GET", PATH)
    assert isinstance(resp.json()["data"], list)


def test_list_with_date_and_location(client):
    main = client.location_id("Main Warehouse")
    resp = check(client, spec, "GET", PATH,
                 params={"date": "01/01/2030", "location.id": main})
    # No snapshot job has run for that future date, so no rows.
    assert resp.json()["data"] == []


def test_list_invalid_date(client):
    resp = check(client, spec, "GET", PATH, params={"date": "not-a-date"})
    assert resp.status_code == 400
    assert "Invalid date" in resp.json()["errorMessage"]
