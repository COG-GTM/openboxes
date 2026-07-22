"""Contract tests for UnitOfMeasureConversionApiController
(openapi/specs/unit-of-measure-conversion-api.yaml)."""

import pytest

from oas import Spec, check

spec = Spec("unit-of-measure-conversion-api.yaml")

UNKNOWN = "doesnotexist0000"


@pytest.fixture(scope="module", autouse=True)
def require_endpoint(client):
    # The pinned released image predates this endpoint; only source builds
    # of this branch expose it.
    if client.request("GET", "/api/unitOfMeasureConversions").status_code != 200:
        pytest.skip("app build does not expose /api/unitOfMeasureConversions")


@pytest.fixture(scope="module")
def uom_ids(client):
    uoms = client.get_json("/api/generic/unitOfMeasure?max=100")["data"]
    if len(uoms) < 2:
        pytest.skip("not enough units of measure seeded for conversion tests")
    return uoms[0]["id"], uoms[1]["id"]


def test_list(client):
    resp = check(client, spec, "GET", "/api/unitOfMeasureConversions")
    body = resp.json()
    assert "data" in body and "totalCount" in body


def test_list_pagination(client):
    resp = check(client, spec, "GET", "/api/unitOfMeasureConversions",
                 params={"max": "1", "offset": "0"})
    assert len(resp.json()["data"]) <= 1


def test_read_unknown(client):
    resp = check(client, spec, "GET", "/api/unitOfMeasureConversions/{id}",
                 path=f"/api/unitOfMeasureConversions/{UNKNOWN}")
    assert resp.status_code == 404


def test_create_validation_error(client):
    resp = check(client, spec, "POST", "/api/unitOfMeasureConversions",
                 json={"conversionRate": None})
    assert resp.status_code == 400


def test_crud(client, uom_ids):
    from_uom, to_uom = uom_ids
    created = check(client, spec, "POST", "/api/unitOfMeasureConversions",
                    json={"fromUnitOfMeasure": {"id": from_uom},
                          "toUnitOfMeasure": {"id": to_uom},
                          "conversionRate": "2.5",
                          "active": True})
    assert created.status_code == 201
    conversion_id = created.json()["data"]["id"]
    try:
        read = check(client, spec, "GET", "/api/unitOfMeasureConversions/{id}",
                     path=f"/api/unitOfMeasureConversions/{conversion_id}")
        data = read.json()["data"]
        assert data["fromUnitOfMeasure"]["id"] == from_uom
        assert data["toUnitOfMeasure"]["id"] == to_uom
        assert float(data["conversionRate"]) == 2.5

        updated = check(client, spec, "PUT",
                        "/api/unitOfMeasureConversions/{id}",
                        path=f"/api/unitOfMeasureConversions/{conversion_id}",
                        json={"conversionRate": 4, "active": False})
        assert updated.status_code == 200
        assert float(updated.json()["data"]["conversionRate"]) == 4
        assert updated.json()["data"]["active"] is False

        listed = check(client, spec, "GET", "/api/unitOfMeasureConversions",
                       params={"max": "100", "sort": "dateCreated",
                               "order": "desc"})
        assert any(c["id"] == conversion_id for c in listed.json()["data"])
    finally:
        deleted = check(client, spec, "DELETE",
                        "/api/unitOfMeasureConversions/{id}",
                        path=f"/api/unitOfMeasureConversions/{conversion_id}")
        assert deleted.status_code == 204

    gone = check(client, spec, "GET", "/api/unitOfMeasureConversions/{id}",
                 path=f"/api/unitOfMeasureConversions/{conversion_id}")
    assert gone.status_code == 404
