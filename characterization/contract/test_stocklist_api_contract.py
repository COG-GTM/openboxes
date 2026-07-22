"""Contract tests for StocklistApiController (openapi/specs/stocklist-api.yaml).

The write flow creates a dedicated 'ZZ Contract ...'-named stock list
(requisition template) and deletes it afterwards - including any clone the
clone() test produced - so the suite stays re-runnable.
"""

import pytest

from oas import Spec, check

spec = Spec("stocklist-api.yaml")

TEST_NAME = "ZZ Contract Stocklist"


def _delete_test_stocklists(client):
    for published in ("true", "false"):
        data = client.get_json(
            "/api/stocklists", params={"isPublished": published})["data"]
        for sl in data:
            # Match anywhere in the name: clone() prefixes "Copy of ", so
            # clones are named e.g. "Copy of ZZ Contract Stocklist v3".
            if TEST_NAME in (sl.get("name") or ""):
                client.request("DELETE", f"/api/stocklists/{sl['id']}")


@pytest.fixture(scope="module", autouse=True)
def cleanup_leftovers(client):
    _delete_test_stocklists(client)


def _seeded_stocklist_id(client):
    return client.stocklist_id("Boston Monthly Replenishment")


def test_list(client):
    resp = check(client, spec, "GET", "/api/stocklists")
    assert resp.json()["data"], "seeded dataset should have stock lists"


def test_list_csv(client):
    resp = check(client, spec, "GET", "/api/stocklists",
                 params={"format": "csv"})
    assert resp.text.startswith("Product Code")


def test_read(client):
    sid = _seeded_stocklist_id(client)
    check(client, spec, "GET", "/api/stocklists/{id}",
          path=f"/api/stocklists/{sid}")


def test_read_unknown(client):
    check(client, spec, "GET", "/api/stocklists/{id}",
          path="/api/stocklists/doesnotexist0000")


def test_delete_unknown(client):
    check(client, spec, "DELETE", "/api/stocklists/{id}",
          path="/api/stocklists/doesnotexist0000")


def test_export(client):
    sid = _seeded_stocklist_id(client)
    resp = check(client, spec, "GET", "/api/stocklists/{id}/export",
                 path=f"/api/stocklists/{sid}/export")
    assert resp.text.startswith('"Product Code"')


def test_export_unknown_is_empty_200(client):
    # Checked outside the spec harness: the empty 200 carries no
    # Content-Type header at all, which OpenAPI content maps cannot express
    # (the quirk is documented in the operation description instead).
    resp = client.request("GET", "/api/stocklists/doesnotexist0000/export")
    assert resp.status_code == 200
    assert resp.content == b""


def test_publish_unknown_is_empty_200(client):
    check(client, spec, "POST", "/api/stocklists/{id}/publish",
          path="/api/stocklists/doesnotexist0000/publish", json={})


def test_send_mail(client):
    sid = _seeded_stocklist_id(client)
    check(client, spec, "POST", "/api/stocklists/sendMail/{id}",
          path=f"/api/stocklists/sendMail/{sid}",
          json={"subject": "ZZ Contract mail", "text": "contract suite",
                "recipients": ["contract@example.com"],
                "includePdf": False, "includeXls": False})


def test_create_update_lifecycle_delete(client):
    main = client.location_id("Main Warehouse")
    boston = client.location_id("Boston Warehouse")
    body = {"name": TEST_NAME, "origin": {"id": main},
            "destination": {"id": boston}, "requestedBy": {"id": "1"}}

    resp = check(client, spec, "POST", "/api/stocklists", json=body)
    sid = resp.json()["data"]["requisition.id"]
    try:
        check(client, spec, "POST", "/api/stocklists/{id}",
              path=f"/api/stocklists/{sid}",
              json={**body, "name": TEST_NAME + " v2"})
        check(client, spec, "PUT", "/api/stocklists/{id}",
              path=f"/api/stocklists/{sid}",
              json={**body, "name": TEST_NAME + " v3"})
        check(client, spec, "POST", "/api/stocklists/{id}/publish",
              path=f"/api/stocklists/{sid}/publish", json={})
        check(client, spec, "POST", "/api/stocklists/{id}/unpublish",
              path=f"/api/stocklists/{sid}/unpublish", json={})
        check(client, spec, "POST", "/api/stocklists/{id}/clone",
              path=f"/api/stocklists/{sid}/clone", json={})
        check(client, spec, "POST", "/api/stocklists/{id}/clear",
              path=f"/api/stocklists/{sid}/clear", json={})
    finally:
        check(client, spec, "DELETE", "/api/stocklists/{id}",
              path=f"/api/stocklists/{sid}")
        # clone() creates an unpublished copy; sweep it (and any stragglers).
        _delete_test_stocklists(client)
