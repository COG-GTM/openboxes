"""Shared helpers for the OpenBoxes API characterization (snapshot) suite.

Provides an authenticated HTTP client against a seeded OpenBoxes instance and
response-normalization rules that mask nondeterministic fields (generated ids,
timestamps, auto-generated identifiers) so snapshots are stable across
database rebuilds.
"""

import json
import os
import re
from pathlib import Path

import requests

BASE_URL = os.environ.get("OB_BASE_URL", "http://localhost:8080/openboxes")
USERNAME = os.environ.get("OB_USERNAME", "admin")
PASSWORD = os.environ.get("OB_PASSWORD", "password")
UPDATE_SNAPSHOTS = os.environ.get("UPDATE_SNAPSHOTS", "").lower() not in ("", "0", "false")

SNAPSHOT_DIR = Path(__file__).parent / "snapshots"

# Hibernate-generated hex ids, e.g. 2c9280829f86c6fd019f86c88c3d0010
HEX_ID_RE = re.compile(r"^[0-9a-f]{32}$")
HEX_ID_INLINE_RE = re.compile(r"[0-9a-f]{32}")
UUID_RE = re.compile(r"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$")
UUID_INLINE_RE = re.compile(r"[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}")
# ISO-8601 timestamps and common date formats rendered by the app
TIMESTAMP_RE = re.compile(r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?(\.\d+)?(Z|[+-]\d{2}:?\d{2})?$")
DATE_SLASH_RE = re.compile(r"^\d{2}/\d{2}/\d{4}( \d{2}:\d{2}(:\d{2})?)?$")
DATE_DASH_RE = re.compile(r"^\d{4}-\d{2}-\d{2}( \d{2}:\d{2}(:\d{2})?(\.\d+)?)?$")
MONTH_DAY_YEAR_RE = re.compile(r"^[A-Z][a-z]{2} \d{1,2}, \d{4}( \d{1,2}:\d{2}(:\d{2})? (AM|PM))?$")

# Values under these keys are auto-generated (sequence/identifier services or
# audit fields) and differ across database rebuilds regardless of value shape.
MASKED_KEYS = {
    "id",
    "dateCreated",
    "lastUpdated",
    "dateRequested",
    "dateShipped",
    "dateAdjusted",
    "requestedDeliveryDate",
    "expectedShippingDate",
    "expectedDeliveryDate",
    "identifier",
    "requestNumber",
    "movementNumber",
    "orderNumber",
    "shipmentNumber",
    "requisitionNumber",
    "receiptNumber",
    "invoiceNumber",
    "transactionNumber",
    "sortOrder",
    # organization codes carry a generated suffix (e.g. "MO-275VGG")
    "organizationCode",
    # derived from a timestamp comparison (requisition vs item dateCreated),
    # so it flips depending on whether they land in the same second
    "manuallyAdded",
}


def mask_scalar(value):
    if isinstance(value, str):
        if HEX_ID_RE.match(value) or UUID_RE.match(value):
            return "<id>"
        if TIMESTAMP_RE.match(value) or DATE_SLASH_RE.match(value) or DATE_DASH_RE.match(value) or MONTH_DAY_YEAR_RE.match(value):
            return "<date>"
        if UUID_INLINE_RE.search(value):
            value = UUID_INLINE_RE.sub("<id>", value)
        if HEX_ID_INLINE_RE.search(value):
            value = HEX_ID_INLINE_RE.sub("<id>", value)
    return value


def normalize(value, key=None):
    """Recursively mask nondeterministic values and sort lists of objects."""
    if isinstance(value, dict):
        # Keys themselves can be generated ids (e.g. maps keyed by product id).
        # Masked keys would collide and collapse entries, so id-keyed maps are
        # rendered as a sorted list of entries instead.
        if any(mask_scalar(k) != k for k in value):
            entries = [
                {"key": mask_scalar(k), "value": normalize(v, k)} for k, v in value.items()
            ]
            return sorted(entries, key=lambda e: json.dumps(e, sort_keys=True, default=str))
        return {k: normalize(v, k) for k, v in sorted(value.items())}
    if isinstance(value, list):
        normalized = [normalize(v) for v in value]
        try:
            return sorted(normalized, key=lambda v: json.dumps(v, sort_keys=True, default=str))
        except TypeError:
            return normalized
    if key in MASKED_KEYS and value is not None and not isinstance(value, (dict, list)):
        return "<masked>"
    return mask_scalar(value)


def normalize_text(text):
    """Mask ids/dates inside non-JSON (e.g. CSV) payloads and normalize EOLs."""
    text = text.replace("\r\n", "\n")
    text = UUID_INLINE_RE.sub("<id>", text)
    text = HEX_ID_INLINE_RE.sub("<id>", text)
    text = re.sub(r"\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?(\.\d+)?Z?", "<date>", text)
    text = re.sub(r"\d{2}/\d{2}/\d{4}", "<date>", text)
    lines = text.split("\n")
    if len(lines) > 2:
        lines = [lines[0]] + sorted(lines[1:])
    return "\n".join(lines)


class ApiClient:
    def __init__(self):
        self.session = requests.Session()
        self.base_url = BASE_URL
        self._cache = {}

    def login(self, location_name="Main Warehouse"):
        resp = self.session.post(
            f"{self.base_url}/api/login",
            json={"username": USERNAME, "password": PASSWORD},
        )
        resp.raise_for_status()
        location_id = self.location_id(location_name)
        resp = self.session.post(f"{self.base_url}/api/chooseLocation/{location_id}")
        resp.raise_for_status()

    def request(self, method, path, **kwargs):
        return self.session.request(method, f"{self.base_url}{path}", timeout=120, **kwargs)

    def get_json(self, path, **kwargs):
        resp = self.request("GET", path, **kwargs)
        resp.raise_for_status()
        return resp.json()

    # --- lookups by stable natural keys (names/codes from the demo dataset) ---

    def location_id(self, name):
        key = ("location", name)
        if key not in self._cache:
            data = self.get_json("/api/locations")["data"]
            matches = [loc for loc in data if loc["name"] == name]
            assert matches, f"Location not found in seeded data: {name}"
            self._cache[key] = matches[0]["id"]
        return self._cache[key]

    def product(self, product_code):
        key = ("product", product_code)
        if key not in self._cache:
            data = self.get_json("/api/products/search", params={"name": product_code})["data"]
            matches = [p for p in data if p.get("productCode") == product_code]
            assert matches, f"Product not found in seeded data: {product_code}"
            self._cache[key] = matches[0]
        return self._cache[key]

    def product_id(self, product_code):
        return self.product(product_code)["id"]

    def stocklist_id(self, name):
        key = ("stocklist", name)
        if key not in self._cache:
            data = self.get_json("/api/stocklists")["data"]
            matches = [s for s in data if s["name"] == name]
            assert matches, f"Stocklist not found in seeded data: {name}"
            self._cache[key] = matches[0]["id"]
        return self._cache[key]


def snapshot_path(name):
    return SNAPSHOT_DIR / f"{name}.json"


def record_response(name, method, path, resp, params=None):
    """Build the snapshot document for a response."""
    content_type = resp.headers.get("Content-Type", "").split(";")[0]
    doc = {
        "request": {
            "method": method,
            "path": mask_scalar(path),
            "params": {k: mask_scalar(v) for k, v in (params or {}).items()},
        },
        "status": resp.status_code,
        "contentType": content_type,
    }
    if "json" in content_type:
        doc["body"] = normalize(resp.json())
    else:
        doc["text"] = normalize_text(resp.text)
    return doc


def check_snapshot(name, doc):
    """Compare doc against the committed snapshot; write it when re-baselining."""
    path = snapshot_path(name)
    rendered = json.dumps(doc, indent=2, sort_keys=True, ensure_ascii=False) + "\n"
    if UPDATE_SNAPSHOTS:
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(rendered)
        return
    assert path.exists(), (
        f"Missing snapshot {path.name}; run with UPDATE_SNAPSHOTS=1 to baseline"
    )
    expected = path.read_text()
    assert rendered == expected, (
        f"Snapshot mismatch for {name}.\n--- expected ---\n{expected}\n--- actual ---\n{rendered}"
    )
