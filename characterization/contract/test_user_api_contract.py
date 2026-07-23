"""Contract tests for UserApiController (openapi/specs/user-api.yaml)."""

import base64
import uuid

import pytest

from oas import Spec, check

spec = Spec("user-api.yaml")

# Demo data seeds the admin user with id "1"
ADMIN_USER_ID = "1"

# 1x1 transparent PNG
TINY_PNG = base64.b64decode(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk"
    "YPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==")


@pytest.fixture(scope="module", autouse=True)
def require_endpoint(client):
    # The pinned released image predates the Batch 45 user endpoints;
    # only source builds of this branch expose them. Probe with an invalid
    # create payload: the new endpoint answers 400, an unmapped URL 404.
    if client.request("POST", "/api/users/create", json={}).status_code == 404:
        pytest.skip("app build does not expose /api/users/create")


def test_read_user(client):
    resp = check(client, spec, "GET", "/api/users/{id}/details",
                 path=f"/api/users/{ADMIN_USER_ID}/details")
    if resp.status_code == 404:
        pytest.skip("admin user not seeded with id 1 in this database")
    data = resp.json()["data"]
    assert data["id"] == ADMIN_USER_ID
    assert data["username"]
    assert isinstance(data["active"], bool)
    assert isinstance(data["hasPhoto"], bool)


def test_read_unknown_user(client):
    resp = check(client, spec, "GET", "/api/users/{id}/details",
                 path="/api/users/no-such-user/details")
    assert resp.status_code == 404


def test_create_user_and_upload_photo(client):
    username = f"contract-{uuid.uuid4().hex[:12]}"
    resp = check(client, spec, "POST", "/api/users/create",
                 json={"username": username,
                       "firstName": "Contract",
                       "lastName": "Test",
                       "password": "password123",
                       "email": f"{username}@example.com",
                       "locale": "en"})
    assert resp.status_code == 201
    data = resp.json()["data"]
    assert data["username"] == username
    assert data["active"] is False, "new users must start inactive"
    assert data["locale"] == "en"
    assert data["hasPhoto"] is False
    user_id = data["id"]

    resp = check(client, spec, "POST", "/api/users/{id}/photo",
                 path=f"/api/users/{user_id}/photo",
                 files={"photo": ("photo.png", TINY_PNG, "image/png")})
    assert resp.status_code == 200
    assert resp.json()["data"]["hasPhoto"] is True


def test_create_user_validation_error(client):
    resp = check(client, spec, "POST", "/api/users/create",
                 json={"username": "", "password": ""})
    assert resp.status_code == 400
    assert resp.json()["errorMessages"]


def test_upload_photo_wrong_type(client):
    resp = check(client, spec, "POST", "/api/users/{id}/photo",
                 path=f"/api/users/{ADMIN_USER_ID}/photo",
                 files={"photo": ("photo.txt", b"not an image", "text/plain")})
    if resp.status_code == 404:
        pytest.skip("admin user not seeded with id 1 in this database")
    assert resp.status_code == 400


def test_upload_photo_unknown_user(client):
    resp = check(client, spec, "POST", "/api/users/{id}/photo",
                 path="/api/users/no-such-user/photo",
                 files={"photo": ("photo.png", TINY_PNG, "image/png")})
    assert resp.status_code == 404
