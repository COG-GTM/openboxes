"""Contract tests for AdminApiController (openapi/specs/admin-api.yaml)."""

from oas import Spec, check

spec = Spec("admin-api.yaml")


def test_status(client, batch41_endpoints):
    resp = check(client, spec, "GET", "/api/admin/status")
    data = resp.json()["data"]
    assert data["controllerCount"] > 0
    assert data["domainCount"] > 0
    assert data["serviceCount"] > 0
    assert data["plugins"], "expected installed plugins"
    assert any(c["logicalName"] == "admin" for c in data["controllers"])


def test_upgrade_deploy_without_download(client, batch41_endpoints):
    # Runs before the download test so the session has no UpgradeCommand yet.
    resp = check(client, spec, "POST", "/api/admin/upgrade/deploy", json={})
    assert resp.status_code == 400


def test_upgrade_initial_state(client, batch41_endpoints):
    resp = check(client, spec, "GET", "/api/admin/upgrade")
    data = resp.json()["data"]
    assert data["downloadDone"] is False
    assert data["progressPercentage"] == 0


def test_upgrade_download_requires_url(client, batch41_endpoints):
    resp = check(client, spec, "POST", "/api/admin/upgrade/download", json={})
    assert resp.status_code == 400


def test_upgrade_download_unreachable_url(client, batch41_endpoints):
    # An unreachable URL initializes the session state; remoteFileSize is -1.
    resp = check(client, spec, "POST", "/api/admin/upgrade/download",
                 json={"remoteWebArchiveUrl": "http://localhost:9/warehouse.war"})
    data = resp.json()["data"]
    assert data["remoteWebArchiveUrl"] == "http://localhost:9/warehouse.war"
    assert data["remoteFileSize"] == -1
    assert data["downloadDone"] is False
