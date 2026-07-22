"""Contract tests for ReasonCodeApiController (openapi/specs/reason-code-api.yaml)."""

from oas import Spec, check

spec = Spec("reason-code-api.yaml")


def test_list_default(client):
    resp = check(client, spec, "GET", "/api/reasonCodes")
    ids = {rc["id"] for rc in resp.json()["data"]}
    assert "STOCKOUT" in ids


def test_list_adjust_inventory(client):
    resp = check(client, spec, "GET", "/api/reasonCodes",
                 params={"activityCode": "ADJUST_INVENTORY"})
    ids = {rc["id"] for rc in resp.json()["data"]}
    assert "CORRECTION" in ids


def test_list_cycle_count(client):
    resp = check(client, spec, "GET", "/api/reasonCodes",
                 params={"activityCode": "CYCLE_COUNT"})
    assert resp.json()["data"]


def test_list_invalid_activity_code(client):
    resp = check(client, spec, "GET", "/api/reasonCodes",
                 params={"activityCode": "NOT_AN_ACTIVITY"})
    assert resp.status_code == 500


def test_read(client):
    resp = check(client, spec, "GET", "/api/reasonCodes/{id}",
                 path="/api/reasonCodes/CORRECTION")
    assert resp.json()["data"]["id"] == "CORRECTION"


def test_read_unknown(client):
    resp = check(client, spec, "GET", "/api/reasonCodes/{id}",
                 path="/api/reasonCodes/BOGUS_CODE")
    assert resp.status_code == 500
