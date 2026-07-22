"""Contract tests for the Batch 40 admin console screen endpoints
(/api/admin/controllers, /api/admin/controllerActions, /api/admin/cache,
/api/admin/cache/evictDomain, /api/admin/cache/evictQueries,
/api/admin/plugins, /api/admin/mail, /api/admin/settings,
/api/admin/stockAlerts/trigger in openapi/specs/admin-api.yaml)."""

import pytest

from oas import Spec, check

admin_spec = Spec("admin-api.yaml")


@pytest.fixture(scope="module", autouse=True)
def require_endpoint(client):
    # The pinned released image predates the Batch 40 admin endpoints; only
    # source builds of this branch expose them.
    if client.request("GET", "/api/admin/plugins").status_code != 200:
        pytest.skip("app build does not expose /api/admin/plugins")


def test_controllers(client):
    resp = check(client, admin_spec, "GET", "/api/admin/controllers")
    data = resp.json()["data"]
    assert data, "app should have controllers"
    full_names = [row["fullName"] for row in data]
    assert full_names == sorted(full_names)
    admin_row = next(
        row for row in data
        if row["fullName"] == "org.pih.warehouse.admin.AdminController")
    assert admin_row["logicalPropertyName"] == "admin"
    assert admin_row["uri"] == "/admin"


def test_controller_actions(client):
    resp = check(client, admin_spec, "GET", "/api/admin/controllerActions")
    data = resp.json()["data"]
    # On Grails 7 controller actions are methods, not closures, so the
    # legacy closure scan typically yields nothing; pin the shape only.
    assert isinstance(data, list)


def test_cache_statistics(client):
    resp = check(client, admin_spec, "GET", "/api/admin/cache")
    data = resp.json()["data"]
    assert data["entities"], "domain classes should be listed"
    entity_names = [row["entityName"] for row in data["entities"]]
    assert "org.pih.warehouse.core.User" in entity_names


def test_evict_domain_cache(client):
    resp = check(client, admin_spec, "POST", "/api/admin/cache/evictDomain",
                 params={"name": "org.pih.warehouse.core.User"})
    assert "was invalidated" in resp.json()["data"]["message"]


def test_evict_domain_cache_unknown(client):
    resp = check(client, admin_spec, "POST", "/api/admin/cache/evictDomain",
                 params={"name": "NoSuchDomain"})
    assert "does not exist" in resp.json()["data"]["message"]


def test_evict_query_cache_all(client):
    resp = check(client, admin_spec, "POST", "/api/admin/cache/evictQueries")
    assert resp.json()["data"]["message"] == "All query caches were invalidated"


def test_plugins(client):
    resp = check(client, admin_spec, "GET", "/api/admin/plugins")
    data = resp.json()["data"]
    assert data, "app should have installed plugins"
    assert all(row["name"] for row in data)


def test_mail_info(client):
    resp = check(client, admin_spec, "GET", "/api/admin/mail")
    data = resp.json()["data"]
    assert "enabled" in data
    assert "from" in data


def test_send_mail(client):
    resp = check(client, admin_spec, "POST", "/api/admin/mail",
                 data={"to": "admin@example.com",
                       "subject": "Contract test email",
                       "message": "Contract test body"})
    message = resp.json()["data"]["message"]
    # Mail is disabled in the docker baseline; either outcome message is
    # acceptable as long as the endpoint reports a status string.
    assert "email" in message.lower()


def test_settings(client):
    resp = check(client, admin_spec, "GET", "/api/admin/settings")
    data = resp.json()["data"]
    assert data["environment"]
    assert data["defaultCharset"]
    assert data["locales"], "supported locales should be configured"
    assert data["configProperties"], "config properties should be present"
    assert data["systemProperties"].get("java.version")
    assert data["quartz"]["schedulerName"]
    # password-like config values must be masked
    for key, value in data["configProperties"].items():
        if "password" in key and value:
            assert set(value) == {"*"}, f"unmasked password property: {key}"


def test_trigger_stock_alerts(client):
    resp = check(client, admin_spec, "POST", "/api/admin/stockAlerts/trigger")
    assert resp.json()["data"]["message"] == (
        "Triggered send stock alerts job in background")
