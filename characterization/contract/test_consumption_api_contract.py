"""Contract tests for ConsumptionApiController (openapi/specs/consumption-api.yaml)."""

import pytest

from oas import Spec, check

spec = Spec("consumption-api.yaml")


@pytest.fixture(autouse=True, scope="module")
def _requires_consumption_api(client):
    # These endpoints ship with the Phase 2 batch 1 migration; skip until the
    # pinned baseline image (OB_VERSION) is bumped to a build that has them.
    if client.request("GET", "/api/consumption/aggregate").status_code == 404:
        pytest.skip("consumption API not deployed in the pinned baseline image")


DATE_RANGE = {"startDate": "01/01/2000", "endDate": "01/01/2030"}


def test_aggregate(client):
    main = client.location_id("Main Warehouse")
    check(client, spec, "GET", "/api/consumption/aggregate",
          params={"locationId": main, **DATE_RANGE})


def test_aggregate_defaults(client):
    check(client, spec, "GET", "/api/consumption/aggregate")


def test_summary(client):
    main = client.location_id("Main Warehouse")
    resp = check(client, spec, "GET", "/api/consumption/summary",
                 params={"locationId": main, **DATE_RANGE})
    body = resp.json()
    assert body["totalCount"] == len(body["data"])


def test_summary_defaults(client):
    check(client, spec, "GET", "/api/consumption/summary")
