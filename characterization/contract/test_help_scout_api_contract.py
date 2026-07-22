"""Contract tests for HelpScoutApiController (openapi/specs/help-scout-api.yaml)."""

from oas import Spec, check

spec = Spec("help-scout-api.yaml")


def test_configuration(client):
    resp = check(client, spec, "GET", "/api/helpscout/configuration")
    body = resp.json()
    assert body["enableFabAnimation"] is False
    assert body["labels"] == {"noTimeToWaitAround": None, "responseTime": None}
