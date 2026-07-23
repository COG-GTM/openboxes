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
    # The pinned released image predates the user API; only source
    # builds of this branch expose it.
    if client.request("GET", "/api/users/list",
                      params={"max": "1"}).status_code != 200:
        pytest.skip("app build does not expose /api/users/list")


def test_list(client):
    resp = check(client, spec, "GET", "/api/users/list")
    body = resp.json()
    assert body["totalCount"] >= len(body["data"])
    assert body["data"], "seeded dataset should have users"


def test_list_paged_and_sorted(client):
    resp = check(client, spec, "GET", "/api/users/list",
                 params={"max": "5", "offset": "0",
                         "sort": "username", "order": "asc"})
    data = resp.json()["data"]
    assert len(data) <= 5
    usernames = [u["username"] for u in data]
    assert usernames == sorted(usernames)


def test_list_filtered_by_query(client):
    resp = check(client, spec, "GET", "/api/users/list",
                 params={"q": "admin", "max": "100"})
    data = resp.json()["data"]
    assert data
    for user in data:
        haystack = " ".join(
            str(user.get(key) or "")
            for key in ("username", "name", "email"))
        assert "admin" in haystack.lower()


def test_list_filtered_by_status(client):
    resp = check(client, spec, "GET", "/api/users/list",
                 params={"status": "true", "max": "100"})
    data = resp.json()["data"]
    assert data
    assert all(user["active"] for user in data)


def test_read(client):
    listed = check(client, spec, "GET", "/api/users/list",
                   params={"q": "admin", "max": "1"}).json()["data"][0]
    resp = check(client, spec, "GET", "/api/users/{id}",
                 path=f"/api/users/{listed['id']}")
    data = resp.json()["data"]
    assert data["id"] == listed["id"]
    assert data["username"] == listed["username"]
    assert isinstance(data["roles"], list)
    assert isinstance(data["locationRoles"], list)


def test_read_unknown(client):
    resp = check(client, spec, "GET", "/api/users/{id}",
                 path="/api/users/doesnotexist0000")
    assert resp.status_code == 404


def test_read_details_route(client):
    # Batch 45 alternate mapping to the same read action.
    listed = check(client, spec, "GET", "/api/users/list",
                   params={"q": "admin", "max": "1"}).json()["data"][0]
    resp = check(client, spec, "GET", "/api/users/{id}/details",
                 path=f"/api/users/{listed['id']}/details")
    data = resp.json()["data"]
    assert data["id"] == listed["id"]
    assert data["username"]
    assert isinstance(data["active"], bool)
    assert isinstance(data["hasPhoto"], bool)


def test_read_details_unknown(client):
    resp = check(client, spec, "GET", "/api/users/{id}/details",
                 path="/api/users/no-such-user/details")
    assert resp.status_code == 404


def test_update_noop(client):
    listed = check(client, spec, "GET", "/api/users/list",
                   params={"q": "admin", "max": "1"}).json()["data"][0]
    before = check(client, spec, "GET", "/api/users/{id}",
                   path=f"/api/users/{listed['id']}").json()["data"]
    resp = check(client, spec, "PUT", "/api/users/{id}",
                 path=f"/api/users/{listed['id']}",
                 json={"firstName": before["firstName"],
                       "lastName": before["lastName"]})
    data = resp.json()["data"]
    assert data["firstName"] == before["firstName"]
    assert data["lastName"] == before["lastName"]


def test_update_unknown(client):
    resp = check(client, spec, "PUT", "/api/users/{id}",
                 path="/api/users/doesnotexist0000",
                 json={"firstName": "X"})
    assert resp.status_code == 404


def test_delete_unknown(client):
    resp = check(client, spec, "DELETE", "/api/users/{id}",
                 path="/api/users/doesnotexist0000")
    assert resp.status_code == 404


def test_change_password_unknown(client):
    resp = check(client, spec, "PUT", "/api/users/{id}/password",
                 path="/api/users/doesnotexist0000/password",
                 json={"password": "x", "passwordConfirm": "x"})
    assert resp.status_code == 404


def test_location_role_delete_unknown(client):
    listed = check(client, spec, "GET", "/api/users/list",
                   params={"q": "admin", "max": "1"}).json()["data"][0]
    resp = check(client, spec, "DELETE",
                 "/api/users/{id}/locationRoles/{locationRoleId}",
                 path=f"/api/users/{listed['id']}"
                      "/locationRoles/doesnotexist0000")
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
