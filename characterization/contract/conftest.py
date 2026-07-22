import sys
from pathlib import Path

import pytest

# Reuse the snapshot suite's authenticated client and seeded-data lookups.
sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "api"))

from obx import ApiClient  # noqa: E402


@pytest.fixture(scope="session")
def client():
    c = ApiClient()
    # Ask for JSON errors (RequestUtil.isAjax) so error responses match the
    # JSON error shapes declared in openapi/components/common.yaml.
    c.session.headers["Accept"] = "application/json"
    c.login()
    return c


@pytest.fixture(scope="session")
def batch7_api(client):
    """Skip when the app build predates the Phase 2 Batch 7 endpoints.

    The snapshot/contract CI job runs against the pinned released image,
    which does not include the attribute CRUD and category tree/details
    endpoints added by the React product-catalog migration; those tests
    only run against source builds that include them.
    """
    resp = client.request("GET", "/api/categories/tree")
    if resp.status_code != 200:
        pytest.skip("Batch 7 endpoints not present in this app build")


@pytest.fixture(scope="session")
def batch14_endpoints(client):
    # The api-snapshot job runs against the pinned released image, which
    # predates the Batch 14 requisition/picklist endpoints. Skip their tests
    # there; they run against source builds (and locally per RUNNING_LOCALLY.md).
    if client.request("GET", "/api/requisitions/documentTypes").status_code == 404:
        pytest.skip("Batch 14 requisition/picklist endpoints not present in target build")


@pytest.fixture(scope="session")
def batch15_endpoints(client):
    # Same rationale as batch14_endpoints for the Batch 15 requisition
    # list/edit/header/items/pick/picklist endpoints.
    if client.request("GET", "/api/requisitions").status_code != 200:
        pytest.skip("Batch 15 requisition endpoints not present in target build")


@pytest.fixture(scope="session")
def batch4_endpoints(client):
    # The api-snapshot job runs against the pinned released image, which
    # predates the Batch 4 inventory/stock-card endpoints. Skip their tests
    # there; they run against source builds (and locally per RUNNING_LOCALLY.md).
    main = client.location_id("Main Warehouse")
    resp = client.request("GET", f"/api/facilities/{main}/inventories/productGroupSummary")
    if resp.status_code == 404:
        pytest.skip("Batch 4 inventory/stock-card endpoints not present in target build")


@pytest.fixture(scope="session")
def batch8_endpoints(client):
    # The api-snapshot job runs against the pinned released image, which
    # predates the Batch 8 product screen endpoints (mergeLogs, batchEdit,
    # details, documents, validateImport). Skip their tests there.
    if client.request("GET", "/api/products/mergeLogs").status_code == 404:
        pytest.skip("Batch 8 product endpoints not present in target build")


@pytest.fixture(scope="session")
def supplier_id(client):
    # Resolve a supplier organization by its stable seeded code (natural key)
    # from the seeded product sources - there is no organization list API.
    code = "MID"
    for ps in client.get_json("/api/productSuppliers",
                              params={"disableMaxLimit": "true"})["data"]:
        supplier = ps.get("supplier") or {}
        if supplier.get("code") == code:
            return supplier["id"]
    pytest.fail(f"No seeded product source with supplier code {code} found")
