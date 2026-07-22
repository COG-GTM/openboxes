"""Contract tests for ApiController (openapi/specs/api.yaml)."""

from obx import PASSWORD, USERNAME
from oas import Spec, check

spec = Spec("api.yaml")


def test_status(client):
    check(client, spec, "GET", "/api/status")


def test_choose_location(client):
    main = client.location_id("Main Warehouse")
    check(client, spec, "POST", "/api/chooseLocation/{locationId}",
          path=f"/api/chooseLocation/{main}")


def test_choose_location_unknown(client):
    check(client, spec, "POST", "/api/chooseLocation/{locationId}",
          path="/api/chooseLocation/doesnotexist0000")
    # restore the session warehouse
    client.login()


def test_choose_locale(client):
    check(client, spec, "GET", "/api/chooseLocale/{localeCode}",
          path="/api/chooseLocale/en")


def test_choose_locale_unknown(client):
    check(client, spec, "GET", "/api/chooseLocale/{localeCode}",
          path="/api/chooseLocale/zz-INVALID")


def test_get_menu_config(client):
    check(client, spec, "GET", "/api/getMenuConfig")


def test_get_app_context(client):
    check(client, spec, "GET", "/api/getAppContext")


def test_get_request_types(client):
    check(client, spec, "GET", "/api/getRequestTypes")


def test_support_links(client):
    check(client, spec, "GET", "/api/supportLinks")


def test_resetting_instance_command(client):
    check(client, spec, "GET", "/api/resettingInstance/command")


def test_login_logout(client):
    check(client, spec, "POST", "/api/login",
          json={"username": USERNAME, "password": PASSWORD})
    check(client, spec, "GET", "/api/logout")
    client.login()


def test_login_bad_credentials(client):
    check(client, spec, "POST", "/api/login",
          json={"username": USERNAME, "password": "wrong-password"})
    client.login()
