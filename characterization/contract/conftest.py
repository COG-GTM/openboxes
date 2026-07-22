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
def batch14_endpoints(client):
    # The api-snapshot job runs against the pinned released image, which
    # predates the Batch 14 requisition/picklist endpoints. Skip their tests
    # there; they run against source builds (and locally per RUNNING_LOCALLY.md).
    if client.request("GET", "/api/requisitions/documentTypes").status_code == 404:
        pytest.skip("Batch 14 requisition/picklist endpoints not present in target build")


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
