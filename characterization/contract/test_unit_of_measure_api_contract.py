"""Contract tests for UnitOfMeasureApiController (openapi/specs/unit-of-measure-api.yaml).

The CRUD flow creates a dedicated 'ZZ Contract ...'-named unit of measure and
deletes it afterwards so the suite stays re-runnable.
"""

import pytest

from oas import Spec, check

spec = Spec("unit-of-measure-api.yaml")

TEST_NAME = "ZZ Contract UOM"
TEST_CODE = "ZZCUOM"


@pytest.fixture(scope="module", autouse=True)
def cleanup_leftovers(client):
    for uom in client.get_json("/api/unitOfMeasures")["data"]:
        if uom.get("code") == TEST_CODE:
            client.request("DELETE", f"/api/unitOfMeasures/{uom['id']}")


def test_list(client):
    resp = check(client, spec, "GET", "/api/unitOfMeasures")
    assert resp.json()["data"], "seeded dataset should have units of measure"


def test_read(client):
    each = next(u for u in client.get_json("/api/unitOfMeasures")["data"]
                if u["code"] == "EA")
    check(client, spec, "GET", "/api/unitOfMeasures/{id}",
          path=f"/api/unitOfMeasures/{each['id']}")


def test_read_unknown(client):
    check(client, spec, "GET", "/api/unitOfMeasures/{id}",
          path="/api/unitOfMeasures/doesnotexist0000")


def test_currencies(client):
    resp = check(client, spec, "GET", "/api/unitOfMeasure/currencies")
    assert {u["code"] for u in resp.json()["data"]} >= {"USD"}


def test_options(client):
    resp = check(client, spec, "GET", "/api/unitOfMeasures/options",
                 params={"type": "QUANTITY"})
    assert resp.json()["data"], "QUANTITY uoms should exist in seeded data"


def test_options_missing_type_is_500(client):
    check(client, spec, "GET", "/api/unitOfMeasures/options")


def test_create_update_delete(client):
    resp = check(client, spec, "POST", "/api/unitOfMeasures",
                 json={"name": TEST_NAME, "code": TEST_CODE,
                       "uomClass": {"id": "QUANTITY"}})
    uom_id = resp.json()["data"]["id"]
    try:
        check(client, spec, "GET", "/api/unitOfMeasures/{id}",
              path=f"/api/unitOfMeasures/{uom_id}")
        check(client, spec, "POST", "/api/unitOfMeasures/{id}",
              path=f"/api/unitOfMeasures/{uom_id}",
              json={"description": "updated by contract suite (POST)"})
        check(client, spec, "PUT", "/api/unitOfMeasures/{id}",
              path=f"/api/unitOfMeasures/{uom_id}",
              json={"description": "updated by contract suite (PUT)"})
    finally:
        check(client, spec, "DELETE", "/api/unitOfMeasures/{id}",
              path=f"/api/unitOfMeasures/{uom_id}")
