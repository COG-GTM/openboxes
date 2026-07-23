"""Contract tests for ErrorsApiController (openapi/specs/errors-api.yaml)."""

import pytest

from oas import Spec, check
from obx import ApiClient

spec = Spec("errors-api.yaml")


@pytest.fixture(scope="module", autouse=True)
def require_endpoint(client):
    # The pinned released image predates the errors API; only source builds
    # of this branch expose it.
    if client.request("GET", "/api/errors/lastError").status_code != 200:
        pytest.skip("app build does not expose /api/errors/lastError")


def test_details(client):
    resp = check(client, spec, "GET", "/api/errors/lastError")
    data = resp.json()["data"]
    assert isinstance(data["mailEnabled"], bool)
    assert isinstance(data["recipients"], list)
    assert data["user"]["username"]


def test_details_unauthenticated():
    # Error screens can be reached without authentication (legacy parity:
    # the error GSPs rendered for anonymous users too).
    anonymous = ApiClient()
    anonymous.session.headers["Accept"] = "application/json"
    resp = check(anonymous, spec, "GET", "/api/errors/lastError")
    data = resp.json()["data"]
    assert data["user"] is None
    assert data["error"] is None
