"""Shared helpers for the A-L (Phase 0.3a) snapshot tests.

Extends the obx normalization with masks needed by A-L endpoints:
  - "Month yyyy" / "FY nn" dashboard time-series labels (keys and values)
  - inline NNNLLL sequence codes (identifier template "NNNLLL", generated at
    demo-data load time, e.g. organization code suffixes "MO-099VCA")
  - additional volatile-by-name keys (build/host/environment metadata and
    load-time-relative dates)

See docs/migration/API_SNAPSHOT_COVERAGE_A.md for the masking rationale.
"""

import json
import re
import time

MONTH_LABEL_RE = re.compile(r"^[A-Za-z]{3,9} \d{4}$")
FY_LABEL_RE = re.compile(r"^FY ?\d{2,4}$")
INLINE_SEQ_RE = re.compile(r"\b\d{3}[A-Z]{3}\b")
# per-request values rendered into the Grails HTML error page
ERROR_PAGE_DATE_RE = re.compile(r"[A-Z][a-z]{2} [A-Z][a-z]{2} +\d{1,2} \d{2}:\d{2}:\d{2} \w+ \d{4}")
ERROR_PAGE_ELAPSED_RE = re.compile(r"<b>\d+(\.\d+)?s</b>")
ERROR_PAGE_HOST_RE = re.compile(r"<b>[0-9a-f]{12} \([^)]*\)</b>")

VOLATILE_KEYS = {
    "buildNumber", "buildDate", "branchName", "ipAddress", "hostname",
    "timezone", "minimumExpirationDate", "expirationDate", "dateApproved",
    "dateReceived", "grailsVersion", "appVersion", "environment",
}


def _mask_label(value):
    if isinstance(value, str):
        if MONTH_LABEL_RE.match(value) or FY_LABEL_RE.match(value):
            return "<date>"
        return INLINE_SEQ_RE.sub("<seq>", value)
    return value


def extra_mask(value, key=None):
    """Post-process an obx-normalized document with the A-L masks."""
    if isinstance(value, dict):
        out = {}
        for k in sorted(value.keys()):
            mk = k
            if isinstance(k, str) and (MONTH_LABEL_RE.match(k) or FY_LABEL_RE.match(k)):
                mk = "<datekey:%d>" % sorted(
                    kk for kk in value.keys()
                    if isinstance(kk, str)
                    and (MONTH_LABEL_RE.match(kk) or FY_LABEL_RE.match(kk))
                ).index(k)
            out[mk] = extra_mask(value[k], key=k)
        return out
    if isinstance(value, list):
        masked = [extra_mask(v, key=key) for v in value]
        # re-sort: masking can change the canonical order obx.normalize used
        try:
            return sorted(masked, key=lambda v: json.dumps(v, sort_keys=True, default=str))
        except TypeError:
            return masked
    if key in VOLATILE_KEYS and value is not None:
        return "<masked>"
    return _mask_label(value)


def mask_doc(doc):
    if "body" in doc:
        doc["body"] = extra_mask(doc["body"])
    if "text" in doc:
        text = INLINE_SEQ_RE.sub("<seq>", doc["text"])
        text = ERROR_PAGE_DATE_RE.sub("<date>", text)
        text = ERROR_PAGE_HOST_RE.sub("<b><host></b>", text)
        text = ERROR_PAGE_ELAPSED_RE.sub("<b><elapsed></b>", text)
        # re-sort: obx.normalize_text sorts lines before these masks run,
        # so masked lines may no longer be in canonical order
        lines = text.split("\n")
        if len(lines) > 2:
            lines = [lines[0]] + sorted(lines[1:])
        doc["text"] = "\n".join(lines)
    return doc


def warm_up_product_availability(client, location_id):
    """Trigger the product-availability refresh and wait for it to finish.

    Stock-derived endpoints (dashboard numbers, cycle-count candidates) read
    from the product_availability table, which is populated by a scheduled
    job - on a freshly seeded database (e.g. in CI) it is still empty, so
    those endpoints would differ from the committed snapshots.
    """
    # synchronous full refresh (ReportController.refreshProductAvailability)
    client.request("GET", "/report/refreshProductAvailability")
    deadline = time.time() + 600
    while time.time() < deadline:
        resp = client.request(
            "GET", "/api/dashboard/inventoryByLotAndBin",
            params={"locationId": location_id})
        if resp.status_code == 200 and (resp.json().get("number") or 0) > 0:
            return
        client.request("GET", "/dashboard/flushCache")
        time.sleep(10)
    raise RuntimeError(
        "product availability was not populated within 10 minutes "
        "(triggered via /report/refreshProductAvailability)")
