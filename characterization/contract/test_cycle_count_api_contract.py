"""Contract tests for CycleCountApiController (openapi/specs/cycle-count-api.yaml).

The workflow test drives a full count -> recount cycle on a seeded product
that has stock but no open cycle count request. Counts are submitted with the
true quantity on hand in the final recount, so inventory ends unchanged.
The seeded dataset has no cycle counts at all, so the module deletes every
cycle count (and the completed-count transactions and the custom-lot
inventory item) via the generic API when it finishes, restoring the pristine
baseline for the snapshot suite; leftovers from aborted runs are swept the
same way before the module starts.

The XLS upload endpoints (items/upload/count and items/upload/recount) are
specified but not exercised: they need a filled-in spreadsheet fixture
matching an in-progress count, which the seeded dataset cannot provide
deterministically.
"""

import pytest

from oas import Spec, check

spec = Spec("cycle-count-api.yaml")

CUSTOM_LOT = "ZZ-CONTRACT-LOT"


@pytest.fixture(scope="module")
def facility(client):
    return client.location_id("Main Warehouse")


def _cleanup_cycle_counts(client, facility):
    # Transactions posted by completed counts reference the cycle count and
    # must go first (newest first; seeded transactions have no cycleCount).
    for txn in client.get_json("/api/generic/transaction",
                               params={"max": 50, "sort": "dateCreated",
                                       "order": "desc"})["data"]:
        if not txn.get("cycleCount"):
            continue
        client.request("DELETE", f"/api/generic/transaction/{txn['id']}")
        if txn.get("transactionSource"):
            client.request(
                "DELETE",
                f"/api/generic/transactionSource/{txn['transactionSource']['id']}")
    # Requests reference their cycle count, so they must go before it.
    for req in client.get_json("/api/generic/cycleCountRequest")["data"]:
        client.request("DELETE", f"/api/generic/cycleCountRequest/{req['id']}")
    for cc in client.get_json(
            f"/api/facilities/{facility}/cycle-counts")["data"]:
        for item in cc["cycleCountItems"]:
            client.request("DELETE", f"/api/generic/cycleCountItem/{item['id']}")
        client.request("DELETE", f"/api/generic/cycleCount/{cc['id']}")
    # The workflow creates an (empty) inventory item for the custom lot.
    resp = client.request(
        "POST", "/api/generic/inventoryItem/search",
        json={"searchAttributes": [{"property": "lotNumber",
                                    "operator": "eq",
                                    "value": CUSTOM_LOT}]})
    for item in resp.json()["data"]:
        client.request("DELETE", f"/api/generic/inventoryItem/{item['id']}")


@pytest.fixture(scope="module", autouse=True)
def cleanup(client, facility):
    _cleanup_cycle_counts(client, facility)
    yield
    _cleanup_cycle_counts(client, facility)


def _pick_candidate(client, facility):
    resp = client.get_json(
        f"/api/facilities/{facility}/cycle-counts/candidates",
        params={"max": 100, "offset": 0})
    return next(c for c in resp["data"]
                if c["quantityAllocated"] == 0
                and not c["cycleCountRequest"]
                and c["quantityOnHand"] and c["quantityOnHand"] > 0)


def test_candidates(client, facility):
    resp = check(client, spec, "GET",
                 "/api/facilities/{facilityId}/cycle-counts/candidates",
                 path=f"/api/facilities/{facility}/cycle-counts/candidates",
                 params={"max": 10, "offset": 0})
    assert resp.json()["data"], "seeded dataset should have candidates"


def test_candidates_csv(client, facility):
    resp = check(client, spec, "GET",
                 "/api/facilities/{facilityId}/cycle-counts/candidates",
                 path=f"/api/facilities/{facility}/cycle-counts/candidates",
                 params={"max": 10, "offset": 0, "format": "csv"})
    assert resp.text.startswith("Code,")


def test_pending_requests(client, facility):
    check(client, spec, "GET",
          "/api/facilities/{facilityId}/cycle-counts/requests/pending",
          path=f"/api/facilities/{facility}/cycle-counts/requests/pending",
          params={"max": 10, "offset": 0})


def test_list_cycle_counts(client, facility):
    check(client, spec, "GET",
          "/api/facilities/{facilityId}/cycle-counts",
          path=f"/api/facilities/{facility}/cycle-counts")


def test_request_create_and_delete(client, facility):
    product_id = _pick_candidate(client, facility)["product"]["id"]
    resp = check(client, spec, "POST",
                 "/api/facilities/{facilityId}/cycle-counts/requests/batch",
                 path=f"/api/facilities/{facility}/cycle-counts/requests/batch",
                 json={"requests": [{"product": product_id,
                                     "blindCount": False}]})
    request_id = resp.json()["data"][0]["id"]
    resp = check(client, spec, "DELETE",
                 "/api/facilities/{facilityId}/cycle-counts/requests/batch",
                 path=f"/api/facilities/{facility}/cycle-counts/requests/batch",
                 params={"id": request_id})
    assert resp.status_code == 204


def test_count_recount_workflow(client, facility):
    base = f"/api/facilities/{facility}/cycle-counts"
    base_tpl = "/api/facilities/{facilityId}/cycle-counts"
    product_id = _pick_candidate(client, facility)["product"]["id"]

    # create + update the request
    resp = check(client, spec, "POST", f"{base_tpl}/requests/batch",
                 path=f"{base}/requests/batch",
                 json={"requests": [{"product": product_id,
                                     "blindCount": False}]})
    request_id = resp.json()["data"][0]["id"]
    check(client, spec, "PATCH", f"{base_tpl}/requests/batch",
          path=f"{base}/requests/batch",
          json={"commands": [{"cycleCountRequest": request_id,
                              "assignments": {}}]})

    # start the count
    resp = check(client, spec, "POST", f"{base_tpl}/start/batch",
                 path=f"{base}/start/batch",
                 json={"requests": [{"cycleCountRequest": request_id}]})
    cycle_count = resp.json()["data"][0]
    cycle_count_id = cycle_count["id"]

    # list by id (JSON, XLS and PDF forms) + refresh
    check(client, spec, "GET", base_tpl, path=base,
          params={"id": cycle_count_id})
    check(client, spec, "GET", base_tpl, path=base,
          params={"id": cycle_count_id, "format": "xls"})
    check(client, spec, "GET", base_tpl, path=base,
          params={"id": cycle_count_id, "format": "pdf"})
    resp = check(client, spec, "POST",
                 f"{base_tpl}/{{cycleCountId}}/refresh",
                 path=f"{base}/{cycle_count_id}/refresh",
                 params={"countIndex": 0})
    items = resp.json()["data"]["cycleCountItems"]

    # add (and remove) a custom item for a new lot
    resp = check(client, spec, "POST", f"{base_tpl}/{{cycleCountId}}/items",
                 path=f"{base}/{cycle_count_id}/items",
                 json={"inventoryItem": {"product": product_id,
                                         "lotNumber": CUSTOM_LOT},
                       "quantityCounted": 0, "recount": False,
                       "countIndex": 0})
    custom_item_id = resp.json()["data"]["id"]
    resp = check(client, spec, "DELETE",
                 f"{base_tpl}/items/{{cycleCountItemId}}",
                 path=f"{base}/items/{custom_item_id}")
    assert resp.status_code == 204

    # batch-create variants (cycleCountId path and facility-only path)
    for suffix, tpl in ((f"/{cycle_count_id}/items/batch",
                         f"{base_tpl}/{{cycleCountId}}/items/batch"),
                        ("/items/batch", f"{base_tpl}/items/batch")):
        resp = check(client, spec, "POST", tpl, path=f"{base}{suffix}",
                     json={"itemsToCreate": [
                         {"cycleCount": cycle_count_id,
                          "inventoryItem": {"product": product_id,
                                            "lotNumber": CUSTOM_LOT},
                          "quantityCounted": 0, "recount": False,
                          "countIndex": 0}]})
        for item in resp.json()["data"]:
            client.request("DELETE", f"{base}/items/{item['id']}")

    # record counts: single-item PATCH with a deliberate -1 discrepancy on
    # the first item, batch PATCH for the rest with the true quantity
    first, rest = items[0], items[1:]
    check(client, spec, "PATCH", f"{base_tpl}/items/{{cycleCountItemId}}",
          path=f"{base}/items/{first['id']}",
          json={"id": first["id"],
                "quantityCounted": first["quantityOnHand"] - 1,
                "recount": False, "countIndex": 0})
    if rest:
        check(client, spec, "PATCH", f"{base_tpl}/items/batch",
              path=f"{base}/items/batch",
              json={"itemsToUpdate": [
                  {"id": item["id"],
                   "quantityCounted": item["quantityOnHand"],
                   "recount": False, "countIndex": 0}
                  for item in rest]})

    # submit the count; the discrepancy forces a recount
    check(client, spec, "POST", f"{base_tpl}/{{cycleCountId}}/count",
          path=f"{base}/{cycle_count_id}/count",
          json={"refreshQuantityOnHand": False,
                "failOnOutdatedQuantity": False,
                "requireRecountOnDiscrepancy": True})

    # start the recount and record the true quantities
    check(client, spec, "POST", f"{base_tpl}/recount/start/batch",
          path=f"{base}/recount/start/batch",
          json={"requests": [{"cycleCountRequest": request_id,
                              "countIndex": 1}]})
    resp = client.get_json(base, params={"id": cycle_count_id})
    recount_items = [item for item in resp["data"][0]["cycleCountItems"]
                     if item["countIndex"] == 1]
    assert recount_items
    check(client, spec, "PATCH", f"{base_tpl}/{{cycleCountId}}/items/batch",
          path=f"{base}/{cycle_count_id}/items/batch",
          json={"itemsToUpdate": [
              {"id": item["id"],
               "quantityCounted": item["quantityOnHand"],
               "recount": True, "countIndex": 1}
              for item in recount_items]})

    # submit the recount; quantities match QoH so inventory is unchanged
    resp = check(client, spec, "POST", f"{base_tpl}/{{cycleCountId}}/recount",
                 path=f"{base}/{cycle_count_id}/recount",
                 json={"refreshQuantityOnHand": False,
                       "failOnOutdatedQuantity": False})
    assert resp.json()["data"]["id"] == cycle_count_id

    # submitting a recount again is invalid -> common 400 shape
    resp = check(client, spec, "POST", f"{base_tpl}/{{cycleCountId}}/recount",
                 path=f"{base}/{cycle_count_id}/recount",
                 json={"refreshQuantityOnHand": False,
                       "failOnOutdatedQuantity": False})
    assert resp.status_code == 400


def test_update_item_requires_body_id(client, facility):
    resp = check(client, spec, "PATCH",
                 "/api/facilities/{facilityId}/cycle-counts/items/{cycleCountItemId}",
                 path=f"/api/facilities/{facility}/cycle-counts/items/doesnotexist0000",
                 json={"quantityCounted": 1, "recount": False,
                       "countIndex": 0})
    assert resp.status_code == 400


def test_reports(client, facility):
    for report in ("cycle-count-details", "cycle-count-summary"):
        for method in ("GET", "POST"):
            check(client, spec, method, f"/api/reports/{report}",
                  path=f"/api/reports/{report}",
                  params={"facility": facility, "max": 5, "offset": 0})
