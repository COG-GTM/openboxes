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


# --- Batch 45 quartz/list endpoints ---

@pytest.fixture(scope="module")
def batch45_jobs_api(client):
    # These endpoints were added after the jobs/show batch; skip on builds
    # that expose /api/jobs/details but not /api/jobs/list.
    if client.request("GET", "/api/jobs/list").status_code != 200:
        pytest.skip("app build does not expose /api/jobs/list")


def test_list_jobs(client, batch45_jobs_api):
    resp = check(client, spec, "GET", "/api/jobs/list")
    data = resp.json()["data"]
    assert isinstance(data["schedulerInStandbyMode"], bool)
    names = [job["name"] for job in data["jobs"]]
    assert names == sorted(names)
    assert JOB_NAME in names


def test_pause_and_resume_job(client, batch45_jobs_api):
    job = next(j for j in client.get_json("/api/jobs/list")["data"]["jobs"]
               if j["name"] == JOB_NAME)
    if not job["triggers"]:
        pytest.skip(f"{JOB_NAME} has no triggers to pause in this app build")
    resp = check(client, spec, "POST", "/api/jobs/pause",
                 json={"jobName": JOB_NAME})
    assert resp.status_code == 200
    job = next(j for j in client.get_json("/api/jobs/list")["data"]["jobs"]
               if j["name"] == JOB_NAME)
    assert all(t["state"] == "PAUSED" for t in job["triggers"])
    resp = check(client, spec, "POST", "/api/jobs/resume",
                 json={"jobName": JOB_NAME})
    assert resp.status_code == 200
    job = next(j for j in client.get_json("/api/jobs/list")["data"]["jobs"]
               if j["name"] == JOB_NAME)
    assert all(t["state"] != "PAUSED" for t in job["triggers"])


def test_pause_unknown_job(client, batch45_jobs_api):
    resp = check(client, spec, "POST", "/api/jobs/pause",
                 json={"jobName": "org.example.DoesNotExistJob"})
    assert resp.status_code == 404


def test_run_unknown_job(client, batch45_jobs_api):
    resp = check(client, spec, "POST", "/api/jobs/run",
                 json={"jobName": "org.example.DoesNotExistJob"})
    assert resp.status_code == 404


def test_scheduler_standby_and_start(client, batch45_jobs_api):
    initially_standby = client.get_json(
        "/api/jobs/list")["data"]["schedulerInStandbyMode"]
    resp = check(client, spec, "POST", "/api/jobs/scheduler/standby")
    assert resp.json()["data"]["schedulerInStandbyMode"] is True
    resp = check(client, spec, "POST", "/api/jobs/scheduler/start")
    assert resp.json()["data"]["schedulerInStandbyMode"] is False
    # Restore the original state
    if initially_standby:
        client.request("POST", "/api/jobs/scheduler/standby")
