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
