"""Contract tests for ErrorApiController (openapi/specs/error-api.yaml)."""

import pytest

from oas import Spec, check

spec = Spec("error-api.yaml")

HTML_ACCEPT = {"Accept": "text/html,application/xhtml+xml"}


@pytest.fixture(scope="module", autouse=True)
def require_endpoint(client):
    # The pinned released image predates the error details API; only source
    # builds of this branch expose it.
    if client.request("GET", "/api/errors/details").status_code != 200:
        pytest.skip("app build does not expose /api/errors/details")


def test_details(client):
    resp = check(client, spec, "GET", "/api/errors/details")
    assert "data" in resp.json()


def test_details_after_not_found(client):
    # A browser-style (non-AJAX) request for an unknown page stashes 404
    # details in the session and redirects to the React not-found screen.
    resp = client.request("GET", "/no/such/page/batch48",
                          headers=HTML_ACCEPT, allow_redirects=False)
    assert resp.status_code == 302
    assert "/errors/handleNotFound" in resp.headers["Location"]

    details = check(client, spec, "GET", "/api/errors/details").json()["data"]
    assert details is not None
    assert details["errorCode"] == 404
    assert details["uri"].endswith("/no/such/page/batch48")


def test_ajax_not_found_unchanged(client):
    # AJAX/JSON 404 handling is unchanged: JSON error body, no redirect.
    resp = client.request("GET", "/no/such/page/batch48",
                          allow_redirects=False)
    assert resp.status_code == 404
    body = resp.json()
    assert body["errorCode"] == 404
