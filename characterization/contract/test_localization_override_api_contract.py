"""Contract tests for LocalizationOverrideApiController
(openapi/specs/localization-override-api.yaml)."""

import pytest

from oas import Spec, check

spec = Spec("localization-override-api.yaml")

TEST_CODE = "zz.contract.localizationOverride"


@pytest.fixture(scope="module", autouse=True)
def require_endpoint(client):
    # The pinned released image predates the localization override API; only
    # source builds of this branch expose it.
    if client.request("GET", "/api/localizationOverrides",
                      params={"max": "1"}).status_code != 200:
        pytest.skip("app build does not expose /api/localizationOverrides")


@pytest.fixture(scope="module", autouse=True)
def cleanup_leftovers(client, require_endpoint):
    for loc in client.get_json("/api/localizationOverrides",
                               params={"q": TEST_CODE, "locale": "",
                                       "max": "100"})["data"]:
        if str(loc.get("code", "")).startswith(TEST_CODE):
            client.request("DELETE", f"/api/localizationOverrides/{loc['id']}")


def test_list_defaults_to_session_locale(client):
    resp = check(client, spec, "GET", "/api/localizationOverrides")
    body = resp.json()
    assert body["totalCount"] >= len(body["data"])
    # admin's session locale is "en"; every row returned uses it
    assert all(loc["locale"] == "en" for loc in body["data"])


def test_list_paged_and_sorted(client):
    resp = check(client, spec, "GET", "/api/localizationOverrides",
                 params={"max": "5", "offset": "0", "locale": "",
                         "sort": "code", "order": "asc"})
    data = resp.json()["data"]
    assert len(data) <= 5
    codes = [loc["code"] for loc in data]
    assert codes == sorted(codes)


def test_read_unknown(client):
    resp = check(client, spec, "GET", "/api/localizationOverrides/{id}",
                 path="/api/localizationOverrides/doesnotexist0000")
    assert resp.status_code == 404


def test_create_read_update_delete(client):
    resp = check(client, spec, "POST", "/api/localizationOverrides",
                 json={"code": TEST_CODE, "locale": "en",
                       "text": "contract test"})
    assert resp.status_code == 201
    loc_id = resp.json()["data"]["id"]
    try:
        resp = check(client, spec, "GET", "/api/localizationOverrides/{id}",
                     path=f"/api/localizationOverrides/{loc_id}")
        data = resp.json()["data"]
        assert data["code"] == TEST_CODE
        assert data["locale"] == "en"
        assert data["text"] == "contract test"

        resp = check(client, spec, "GET", "/api/localizationOverrides",
                     params={"q": TEST_CODE, "locale": "en", "max": "100"})
        assert any(loc["id"] == loc_id for loc in resp.json()["data"])

        resp = check(client, spec, "PUT", "/api/localizationOverrides/{id}",
                     path=f"/api/localizationOverrides/{loc_id}",
                     json={"text": "contract test (renamed)"})
        data = resp.json()["data"]
        assert data["text"] == "contract test (renamed)"
        assert data["code"] == TEST_CODE
    finally:
        resp = check(client, spec, "DELETE", "/api/localizationOverrides/{id}",
                     path=f"/api/localizationOverrides/{loc_id}")
        assert resp.status_code == 204


def test_create_invalid(client):
    resp = check(client, spec, "POST", "/api/localizationOverrides",
                 json={"locale": "en", "text": "missing code"})
    assert resp.status_code == 400


def test_delete_unknown(client):
    resp = check(client, spec, "DELETE", "/api/localizationOverrides/{id}",
                 path="/api/localizationOverrides/doesnotexist0000")
    assert resp.status_code == 404


def test_import(client):
    properties = f"{TEST_CODE}.imported = imported by contract test\n"
    resp = check(client, spec, "POST", "/api/localizationOverrides/import",
                 data={"locale": "en"},
                 files={"messageProperties":
                        ("messages.properties", properties.encode("utf-8"))})
    assert resp.json()["data"]["importedCount"] == 1
    imported = client.get_json("/api/localizationOverrides",
                               params={"q": f"{TEST_CODE}.imported",
                                       "locale": "en", "max": "10"})["data"]
    assert len(imported) == 1
    assert imported[0]["text"] == "imported by contract test"
    client.request("DELETE", f"/api/localizationOverrides/{imported[0]['id']}")


def test_import_missing_file(client):
    resp = check(client, spec, "POST", "/api/localizationOverrides/import",
                 data={"locale": "en"},
                 files={"messageProperties": ("messages.properties", b"")})
    assert resp.status_code == 400


def test_locale_options(client):
    options_spec = Spec("select-options-api.yaml")
    resp = check(client, options_spec, "GET", "/api/localeOptions")
    ids = [option["id"] for option in resp.json()["data"]]
    assert "en" in ids
