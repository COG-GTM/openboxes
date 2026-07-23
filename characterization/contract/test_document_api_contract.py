"""Contract tests for DocumentApiController (openapi/specs/document-api.yaml)."""

from oas import Spec, check

spec = Spec("document-api.yaml")


def test_create_document(client, batch41_endpoints):
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
    # Clean up so the suite is re-runnable (legacy delete action).
    client.request("POST", f"/document/delete/{data['id']}")


def test_create_document_requires_file(client, batch41_endpoints):
    resp = check(client, spec, "POST", "/api/documents", files={
        "fileContents": ("empty.txt", b"", "text/plain"),
    })
    assert resp.status_code == 400
