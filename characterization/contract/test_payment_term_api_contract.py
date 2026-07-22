"""Contract tests for PaymentTermApiController
(openapi/specs/payment-term-api.yaml)."""

import uuid

import pytest

from oas import Spec, check

spec = Spec("payment-term-api.yaml")


@pytest.fixture(scope="module", autouse=True)
def require_endpoint(client):
    # The pinned released image predates this endpoint; only source builds
    # of this branch expose it. POST with an empty body is a validation
    # error (400) on builds that expose the route, a 404 otherwise.
    if client.request("POST", "/api/paymentTerms", json={}).status_code == 404:
        pytest.skip("app build does not expose /api/paymentTerms")


def test_create_validation_error(client):
    resp = check(client, spec, "POST", "/api/paymentTerms",
                 json={"code": "", "name": ""})
    assert resp.status_code == 400


def test_create(client):
    suffix = uuid.uuid4().hex[:8]
    resp = check(client, spec, "POST", "/api/paymentTerms",
                 json={"code": f"ZZCT-{suffix}",
                       "name": f"ZZ Contract payment term {suffix}",
                       "description": "contract test",
                       "prepaymentPercent": 50,
                       "daysToPayment": 30})
    assert resp.status_code == 201
    data = resp.json()["data"]
    assert data["code"] == f"ZZCT-{suffix}"
    assert data["daysToPayment"] == 30


def test_list(client):
    # Batch 30: the list endpoint (GET) may not exist on builds that only
    # expose the Batch 29 create endpoint.
    if client.request("GET", "/api/paymentTerms").status_code != 200:
        pytest.skip("app build does not expose GET /api/paymentTerms")
    resp = check(client, spec, "GET", "/api/paymentTerms")
    assert resp.status_code == 200
    body = resp.json()
    assert body["totalCount"] >= len(body["data"]) >= 0


def test_read_and_update(client):
    if client.request("GET", "/api/paymentTerms").status_code != 200:
        pytest.skip("app build does not expose GET /api/paymentTerms")
    suffix = uuid.uuid4().hex[:8]
    created = check(client, spec, "POST", "/api/paymentTerms",
                    json={"code": f"ZZRU-{suffix}",
                          "name": f"ZZ Read/update payment term {suffix}"})
    assert created.status_code == 201
    term_id = created.json()["data"]["id"]

    read = check(client, spec, "GET", "/api/paymentTerms/{id}", path=f"/api/paymentTerms/{term_id}")
    assert read.status_code == 200
    assert read.json()["data"]["code"] == f"ZZRU-{suffix}"

    updated = check(client, spec, "PUT", "/api/paymentTerms/{id}", path=f"/api/paymentTerms/{term_id}",
                    json={"code": f"ZZRU-{suffix}",
                          "name": f"ZZ Read/update payment term {suffix} (edited)",
                          "daysToPayment": 60})
    assert updated.status_code == 200
    data = updated.json()["data"]
    assert data["name"].endswith("(edited)")
    assert data["daysToPayment"] == 60
