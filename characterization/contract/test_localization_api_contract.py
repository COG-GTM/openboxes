"""Contract tests for LocalizationApiController (openapi/specs/localization-api.yaml)."""

from oas import Spec, check

spec = Spec("localization-api.yaml")


def test_list(client):
    resp = check(client, spec, "GET", "/api/localizations")
    assert resp.json()["messages"], "message bundle should not be empty"


def test_list_with_prefix_and_language(client):
    resp = check(client, spec, "GET", "/api/localizations",
                 params={"languageCode": "en", "prefix": "default.button."})
    messages = resp.json()["messages"]
    assert messages
    assert all(code.startswith("default.button.") for code in messages)


def test_read(client):
    resp = check(client, spec, "GET", "/api/localizations/{id}",
                 path="/api/localizations/default.button.save.label",
                 params={"lang": "en"})
    assert resp.json()["message"] == "Save"


def test_read_with_args(client):
    check(client, spec, "GET", "/api/localizations/{id}",
          path="/api/localizations/default.button.backTo.label",
          params={"lang": "en", "args": "Dashboard"})


def test_read_unknown_code(client):
    # Unknown codes still respond 200 (message falls back to the code).
    check(client, spec, "GET", "/api/localizations/{id}",
          path="/api/localizations/zz.contract.unknown.code")
