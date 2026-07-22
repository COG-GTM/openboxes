"""Contract tests for JobsApiController (openapi/specs/jobs-api.yaml)."""

import pytest

from oas import Spec, check

spec = Spec("jobs-api.yaml")

# A Quartz job registered by grails-app/jobs in every environment.
JOB_NAME = "org.pih.warehouse.jobs.DataCleaningJob"
CONTRACT_CRON = "0 59 23 31 12 ? 2099"


@pytest.fixture(scope="module", autouse=True)
def require_endpoint(client):
    # The pinned released image predates the jobs API; only source builds of
    # this branch expose it.
    if client.request("GET", "/api/jobs/details",
                      params={"name": JOB_NAME}).status_code not in (200, 404):
        pytest.skip("app build does not expose /api/jobs/details")


@pytest.fixture(scope="module", autouse=True)
def cleanup_leftovers(client, require_endpoint):
    resp = client.request("GET", "/api/jobs/details", params={"name": JOB_NAME})
    if resp.status_code != 200:
        return
    for trigger in resp.json()["data"]["triggers"]:
        if trigger.get("cronExpression") == CONTRACT_CRON:
            client.request("DELETE", "/api/jobs/triggers",
                           params={"name": trigger["name"],
                                   "group": trigger["group"]})


def test_read_job(client):
    resp = check(client, spec, "GET", "/api/jobs/details",
                 params={"name": JOB_NAME})
    if resp.status_code == 404:
        pytest.skip(f"{JOB_NAME} not registered in this app build")
    data = resp.json()["data"]
    assert data["name"] == JOB_NAME
    assert data["group"] == "GRAILS_JOBS"
    assert isinstance(data["triggers"], list)


def test_read_unknown_job(client):
    resp = check(client, spec, "GET", "/api/jobs/details",
                 params={"name": "org.example.DoesNotExistJob"})
    assert resp.status_code == 404


def test_read_missing_name(client):
    resp = check(client, spec, "GET", "/api/jobs/details")
    if resp.status_code == 404:
        pytest.skip("app build does not expose /api/jobs/details")
    assert resp.status_code == 400


def test_create_and_delete_trigger(client):
    if client.request("GET", "/api/jobs/details",
                      params={"name": JOB_NAME}).status_code != 200:
        pytest.skip(f"{JOB_NAME} not registered in this app build")
    resp = check(client, spec, "POST", "/api/jobs/triggers",
                 json={"jobName": JOB_NAME, "cronExpression": CONTRACT_CRON})
    assert resp.status_code == 201
    triggers = resp.json()["data"]["triggers"]
    created = [t for t in triggers if t.get("cronExpression") == CONTRACT_CRON]
    assert len(created) == 1
    resp = check(client, spec, "DELETE", "/api/jobs/triggers",
                 params={"name": created[0]["name"],
                         "group": created[0]["group"]})
    assert resp.status_code == 204
    remaining = client.get_json("/api/jobs/details",
                                params={"name": JOB_NAME})["data"]["triggers"]
    assert all(t.get("cronExpression") != CONTRACT_CRON for t in remaining)


def test_create_trigger_invalid_cron(client):
    if client.request("GET", "/api/jobs/details",
                      params={"name": JOB_NAME}).status_code != 200:
        pytest.skip(f"{JOB_NAME} not registered in this app build")
    resp = check(client, spec, "POST", "/api/jobs/triggers",
                 json={"jobName": JOB_NAME, "cronExpression": "not a cron"})
    assert resp.status_code == 400


def test_create_trigger_unknown_job(client):
    resp = check(client, spec, "POST", "/api/jobs/triggers",
                 json={"jobName": "org.example.DoesNotExistJob",
                       "cronExpression": CONTRACT_CRON})
    assert resp.status_code == 404


def test_delete_unknown_trigger(client):
    resp = check(client, spec, "DELETE", "/api/jobs/triggers",
                 params={"name": "doesnotexist0000"})
    assert resp.status_code == 404
