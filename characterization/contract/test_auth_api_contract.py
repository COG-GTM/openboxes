"""Contract tests for AuthApiController (openapi/specs/auth-api.yaml)."""

import os

from oas import Spec, check

spec = Spec("auth-api.yaml")

USERNAME = os.environ.get("OB_USERNAME", "admin")
PASSWORD = os.environ.get("OB_PASSWORD", "password")


def test_login(client, batch41_endpoints):
    resp = check(client, spec, "POST", "/api/auth/login",
                 json={"username": USERNAME, "password": PASSWORD,
                       "browserTimezone": "UTC"})
    assert resp.json()["data"]["redirectUrl"] == "/dashboard/index"


def test_login_target_uri(client, batch41_endpoints):
    resp = check(client, spec, "POST", "/api/auth/login",
                 json={"username": USERNAME, "password": PASSWORD,
                       "targetUri": "/inventory/browse"})
    assert resp.json()["data"]["redirectUrl"] == "/inventory/browse"


def test_login_bad_password(client, batch41_endpoints):
    resp = check(client, spec, "POST", "/api/auth/login",
                 json={"username": USERNAME, "password": "not-the-password"})
    assert resp.status_code == 401
    assert resp.json()["errorMessage"]


def test_login_unknown_user(client, batch41_endpoints):
    resp = check(client, spec, "POST", "/api/auth/login",
                 json={"username": "zz-contract-no-such-user", "password": "x"})
    assert resp.status_code == 401


def test_signup_config(client, batch41_endpoints):
    resp = check(client, spec, "GET", "/api/auth/signupConfig")
    data = resp.json()["data"]
    assert data["enabled"] is True
    assert data["recaptchaEnabled"] is False
    assert data["supportedLocales"], "expected supported locales"


def test_signup_validation_error(client, batch41_endpoints):
    # Missing required fields fails domain validation; no user is created,
    # so this test is re-runnable.
    resp = check(client, spec, "POST", "/api/auth/signup",
                 json={"firstName": "ZZ Contract", "lastName": "",
                       "email": "", "password": "", "passwordConfirm": ""})
    assert resp.status_code == 400
    assert resp.json()["errorMessages"]
