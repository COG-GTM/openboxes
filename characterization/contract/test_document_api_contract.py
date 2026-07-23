"""Contract tests for DocumentApiController
(openapi/specs/document-api.yaml) and the documentTypeOptions
includeTemplates parameter (openapi/specs/select-options-api.yaml)."""

import pytest

from oas import Spec, check

spec = Spec("document-api.yaml")
options_spec = Spec("select-options-api.yaml")

TEST_NAME = "zzcontractdocument.txt"


@pytest.fixture(scope="module", autouse=True)
def require_endpoint(client):
    # The pinned released image predates the document API; only source
    # builds of this branch expose it.
    if client.request("GET", "/api/documents", params={"max": "1"}).status_code != 200:
        pytest.skip("app build does not expose /api/documents")


@pytest.fixture(scope="module", autouse=True)
def cleanup_leftovers(client, require_endpoint):
    for doc in client.get_json(f"/api/documents?max=100&q={TEST_NAME}")["data"]:
        client.request("DELETE", f"/api/documents/{doc['id']}")


@pytest.fixture(scope="module")
def document_id(client, require_endpoint):
    """Documents are created through the legacy DocumentController.save
    multipart action (creation was intentionally left on the legacy
    controller); use it to seed a document for the API tests."""
    resp = client.request(
        "POST", "/document/save",
        files={"fileContents": (TEST_NAME, b"contract test contents", "text/plain")},
        data={"name": TEST_NAME},
        allow_redirects=False,
    )
    assert resp.status_code in (200, 302)
    docs = client.get_json(f"/api/documents?q={TEST_NAME}")["data"]
    assert len(docs) == 1
    doc_id = docs[0]["id"]
    yield doc_id
    client.request("DELETE", f"/api/documents/{doc_id}")


def test_document_type_options_include_templates(client):
    resp = check(client, options_spec, "GET", "/api/documentTypeOptions")
    non_template = resp.json()["data"]
    resp = check(client, options_spec, "GET", "/api/documentTypeOptions",
                 params={"includeTemplates": "true"})
    all_types = resp.json()["data"]
    assert len(all_types) >= len(non_template)
    labels = [o["label"] for o in all_types]
    assert labels == sorted(labels)


def test_list(client):
    resp = check(client, spec, "GET", "/api/documents")
    body = resp.json()
    assert body["totalCount"] >= len(body["data"])


def test_list_filtered_and_sorted(client, document_id):
    resp = check(client, spec, "GET", "/api/documents",
                 params={"q": TEST_NAME, "max": "5", "offset": "0",
                         "sort": "name", "order": "asc"})
    data = resp.json()["data"]
    assert len(data) == 1
    assert data[0]["id"] == document_id


def test_read_unknown(client):
    resp = check(client, spec, "GET", "/api/documents/{id}",
                 path="/api/documents/doesnotexist0000")
    assert resp.status_code == 404


def test_read_update(client, document_id):
    resp = check(client, spec, "GET", "/api/documents/{id}",
                 path=f"/api/documents/{document_id}")
    body = resp.json()["data"]
    assert body["name"] == TEST_NAME
    assert body["filename"] == TEST_NAME
    assert body["contentType"] == "text/plain"
    assert body["extension"] == "txt"
    assert body["size"] == len(b"contract test contents")
    assert body["image"] is False

    resp = check(client, spec, "PUT", "/api/documents/{id}",
                 path=f"/api/documents/{document_id}",
                 json={"documentNumber": "ZZCONTRACT-42"})
    assert resp.json()["data"]["documentNumber"] == "ZZCONTRACT-42"
    # Partial update: untouched fields keep their values
    assert resp.json()["data"]["name"] == TEST_NAME


def test_upload_content(client, document_id):
    resp = client.request(
        "POST", f"/api/documents/{document_id}/content",
        files={"fileContents": (TEST_NAME, b"replaced contents!", "text/plain")},
    )
    assert resp.status_code == 200
    body = resp.json()["data"]
    assert body["size"] == len(b"replaced contents!")
    assert body["filename"] == TEST_NAME


def test_upload_content_disallowed_extension(client, document_id):
    resp = client.request(
        "POST", f"/api/documents/{document_id}/content",
        files={"fileContents": ("evil.exe", b"MZ...", "application/octet-stream")},
    )
    assert resp.status_code == 400
    assert "errorMessage" in resp.json()


def test_delete(client):
    resp = client.request(
        "POST", "/document/save",
        files={"fileContents": ("zzcontractdelete.txt", b"x", "text/plain")},
        allow_redirects=False,
    )
    assert resp.status_code in (200, 302)
    docs = client.get_json("/api/documents?q=zzcontractdelete")["data"]
    assert len(docs) == 1
    resp = check(client, spec, "DELETE", "/api/documents/{id}",
                 path=f"/api/documents/{docs[0]['id']}")
    assert resp.status_code == 204
    assert client.get_json("/api/documents?q=zzcontractdelete")["totalCount"] == 0


def test_create_document(client):
    resp = check(
        client, spec, "POST", "/api/documents",
        files={"fileContents": ("zz-contract-document.txt", b"contract test file",
                                "text/plain")},
    )
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert data["name"] == "zz-contract-document.txt"
    assert data["filename"] == "zz-contract-document.txt"
    assert data["extension"] == "txt"
    client.request("DELETE", f"/api/documents/{data['id']}")


def test_create_document_requires_file(client):
    resp = check(client, spec, "POST", "/api/documents", files={
        "fileContents": ("empty.txt", b"", "text/plain"),
    })
    assert resp.status_code == 400
