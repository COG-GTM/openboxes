"""Contract tests for BatchApiController (openapi/specs/batch-api.yaml)."""

import io

import xlwt

from oas import Spec, check

spec = Spec("batch-api.yaml")


def _tag_workbook():
    # Matches the tag import template columns (id, tag). Written as .xls -
    # the same format the legacy screen's downloadable templates use.
    workbook = xlwt.Workbook()
    sheet = workbook.add_sheet("Sheet1")
    sheet.write(0, 0, "Id")
    sheet.write(0, 1, "Tag")
    sheet.write(1, 0, "")
    sheet.write(1, 1, "zz-contract-tag")
    buffer = io.BytesIO()
    workbook.save(buffer)
    return buffer.getvalue()


def test_import_data_requires_file(client, batch41_endpoints):
    # Must run before any upload in this session: an empty upload with no
    # previously uploaded session file is rejected.
    resp = check(client, spec, "POST", "/api/batch/importData",
                 files={"importFile": ("empty.xls", b"", "application/vnd.ms-excel")},
                 data={"importType": "tag"})
    assert resp.status_code == 400


def test_import_data_upload_preview(client, batch41_endpoints):
    # Upload/validate only (importNow=false) - nothing is persisted, so this
    # test is re-runnable.
    resp = check(
        client, spec, "POST", "/api/batch/importData",
        files={"importFile": ("zz-contract-tags.xls", _tag_workbook(),
                              "application/vnd.ms-excel")},
        data={"importType": "tag", "importNow": "false"},
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["data"]["importedSuccessfully"] is False
    assert body["data"]["importType"] == "tag"
    assert body["data"]["rows"], "expected parsed preview rows"
