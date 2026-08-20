"""Contract tests for GET /api/shipments/exceptions/overdue."""

from datetime import date, timedelta

import pytest
import requests

from oas import Spec, check

spec = Spec("shipment-exceptions-api.yaml")
TEST_PREFIX = "ZZ Contract Shipment Exception"
pytestmark = pytest.mark.usefixtures("shipment_exception_endpoints")


def _shipment_options(client):
    return client.get_json("/api/shipments/wizardOptions")["data"]


def _event_type_id(client, event_code):
    event_types = client.get_json(
        "/api/eventTypes", params={"max": 100}
    )["data"]
    matches = [event for event in event_types if event.get("eventCode") == event_code]
    if matches:
        return matches[0]["id"]
    response = client.request(
        "POST",
        "/api/eventTypes",
        json={
            "name": event_code,
            "description": f"{TEST_PREFIX} {event_code}",
            "sortOrder": 999,
            "eventCode": event_code,
        },
    )
    assert response.status_code == 201
    return response.json()["data"]["id"]


def _create_shipment(client, name, destination=None, expected_delivery=None,
                     origin=None):
    options = _shipment_options(client)
    destination = destination or client.location_id("Main Warehouse")
    origin = origin or client.location_id("Main Supplier")
    response = client.request("POST", "/api/shipments", json={
        "name": name,
        "shipmentTypeId": options["shipmentTypes"][0]["id"],
        "originId": origin,
        "destinationId": destination,
        "expectedShippingDate": (date.today() - timedelta(days=10)).isoformat(),
    })
    assert response.status_code == 201
    shipment_id = response.json()["data"]["id"]
    if expected_delivery is not None:
        response = client.request(
            "POST", f"/api/shipments/{shipment_id}/details",
            json={"expectedDeliveryDate": expected_delivery},
        )
        assert response.status_code == 200
    return shipment_id


def _add_event(client, shipment_id, event_code, event_date=None):
    response = client.request(
        "POST", f"/api/shipments/{shipment_id}/events",
        json={
            "eventTypeId": _event_type_id(client, event_code),
            "eventDate": event_date or "2020-01-01 10:00",
            "eventLocationId": client.location_id("Main Warehouse"),
        },
    )
    assert response.status_code == 201
    return response.json()["data"]["id"]


def _delete_shipment(client, shipment_id):
    client.request("DELETE", f"/api/generic/shipment/{shipment_id}")


def _rows(client, **params):
    response = check(
        client, spec, "GET", "/api/shipments/exceptions/overdue",
        path="/api/shipments/exceptions/overdue", params=params,
    )
    assert response.status_code == 200
    return response.json()


def _shipment_number(client, shipment_id):
    return client.get_json(f"/api/shipments/{shipment_id}")["data"]["shipmentNumber"]


@pytest.fixture(scope="module")
def exception_shipments(client, shipment_exception_endpoints):
    yesterday = date.today() - timedelta(days=1)
    created = {}
    definitions = {
        "overdue": yesterday - timedelta(days=2),
        "future": date.today() + timedelta(days=3),
        "today": date.today(),
        "received": yesterday - timedelta(days=2),
        "delivered": yesterday - timedelta(days=2),
        "cancelled": yesterday - timedelta(days=2),
        "partial": yesterday - timedelta(days=2),
        "pending": yesterday - timedelta(days=6),
        "three_late": yesterday - timedelta(days=2),
        "seven_late": yesterday - timedelta(days=6),
    }
    for key, expected_delivery in definitions.items():
        shipment_id = _create_shipment(
            client, f"{TEST_PREFIX} {key}", expected_delivery=expected_delivery.isoformat(),
        )
        created[key] = shipment_id

    _add_event(client, created["overdue"], "SHIPPED")
    _add_event(client, created["received"], "RECEIVED")
    _add_event(client, created["delivered"], "PARTIALLY_RECEIVED")
    _add_event(client, created["delivered"], "DELIVERED", "2020-01-02 10:00")
    _add_event(client, created["cancelled"], "SHIPPED")
    _add_event(client, created["cancelled"], "CANCELLED", "2020-01-02 10:00")
    _add_event(client, created["partial"], "PARTIALLY_RECEIVED")

    yield created
    for shipment_id in created.values():
        _delete_shipment(client, shipment_id)


def test_criterion_01_overdue_unreceived_inbound_is_included(client, exception_shipments):
    """Criterion 1: an overdue, unreceived inbound shipment is included."""
    number = _shipment_number(client, exception_shipments["overdue"])
    assert number in {row["shipmentNumber"] for row in _rows(client)["data"]}


def test_criterion_02_future_expected_delivery_is_excluded(client, exception_shipments):
    """Criterion 2: a future expected delivery date is excluded."""
    number = _shipment_number(client, exception_shipments["future"])
    assert number not in {row["shipmentNumber"] for row in _rows(client)["data"]}


def test_criterion_03_today_expected_delivery_is_excluded(client, exception_shipments):
    """Criterion 3: an expected delivery date of today is excluded."""
    number = _shipment_number(client, exception_shipments["today"])
    assert number not in {row["shipmentNumber"] for row in _rows(client)["data"]}


def test_criterion_04_received_shipments_are_excluded(client, exception_shipments):
    """Criterion 4: received shipments are excluded."""
    body = _rows(client)
    number = _shipment_number(client, exception_shipments["received"])
    assert number not in {row["shipmentNumber"] for row in body["data"]}
    assert all(row["status"] != "RECEIVED" for row in body["data"])


def test_criterion_05_received_or_delivered_shipments_are_excluded(client, exception_shipments):
    """Criterion 5: received or delivered shipments are excluded."""
    number = _shipment_number(client, exception_shipments["delivered"])
    assert number not in {row["shipmentNumber"] for row in _rows(client)["data"]}


def test_criterion_06_null_expected_delivery_is_excluded(client):
    """Criterion 6: a null expected delivery date is excluded."""
    shipment_id = _create_shipment(client, f"{TEST_PREFIX} null")
    try:
        body = _rows(client)
        number = _shipment_number(client, shipment_id)
        assert number not in {row["shipmentNumber"] for row in body["data"]}
        assert all(row["expectedDeliveryDate"] is not None for row in body["data"])
    finally:
        _delete_shipment(client, shipment_id)


def test_criterion_07_latest_cancelled_event_is_excluded(client, exception_shipments):
    """Criterion 7: a shipment whose latest event is CANCELLED is excluded."""
    number = _shipment_number(client, exception_shipments["cancelled"])
    assert number not in {row["shipmentNumber"] for row in _rows(client)["data"]}


def test_criterion_08_only_inbound_shipments_are_included(client, exception_shipments):
    """Criterion 8: only inbound shipments are included."""
    warehouse = client.location_id("Main Warehouse")
    outbound = _create_shipment(
        client, f"{TEST_PREFIX} outbound",
        destination=client.location_id("Main Supplier"),
        origin=warehouse,
        expected_delivery=(date.today() - timedelta(days=3)).isoformat(),
    )
    try:
        body = _rows(client)
        assert all(row["destination"]["id"] == warehouse for row in body["data"])
        assert _shipment_number(client, outbound) not in {
            row["shipmentNumber"] for row in body["data"]
        }
    finally:
        _delete_shipment(client, outbound)


def test_criterion_09_inbound_is_relative_to_session_warehouse(client, exception_shipments):
    """Criterion 9: inbound results are relative to the selected warehouse."""
    number = _shipment_number(client, exception_shipments["overdue"])
    default_rows = {row["shipmentNumber"] for row in _rows(client)["data"]}
    assert number in default_rows
    other_client = type(client)()
    other_client.login("Boston Warehouse")
    assert number not in {
        row["shipmentNumber"] for row in _rows(other_client)["data"]
    }


def test_criterion_10_partially_received_without_delivery_is_included(client, exception_shipments):
    """Criterion 10: partially received shipments without delivery are included."""
    number = _shipment_number(client, exception_shipments["partial"])
    assert number in {row["shipmentNumber"] for row in _rows(client)["data"]}


def test_criterion_11_days_late_is_calendar_days(client, exception_shipments):
    """Criterion 11: daysLate is a calendar-day difference."""
    shipment_id = exception_shipments["overdue"]
    number = _shipment_number(client, shipment_id)
    row = next(row for row in _rows(client)["data"] if row["shipmentNumber"] == number)
    expected_delivery = date.fromisoformat(
        client.get_json(f"/api/shipments/{shipment_id}")["data"]["expectedDeliveryDate"][:10]
    )
    assert row["daysLate"] == (date.today() - expected_delivery).days


def test_criterion_12_days_late_meets_threshold(client):
    """Criterion 12: every row meets the effective threshold."""
    body = _rows(client, minDaysLate=3)
    assert all(row["daysLate"] >= 3 for row in body["data"])


def test_criterion_13_days_late_is_positive_integer(client):
    """Criterion 13: every daysLate value is an integer at least one."""
    assert all(isinstance(row["daysLate"], int) and row["daysLate"] >= 1
               for row in _rows(client)["data"])


def test_criterion_14_default_threshold_is_one_day(client, exception_shipments):
    """Criterion 14: the default threshold is one day."""
    body = _rows(client)
    numbers = {row["shipmentNumber"] for row in body["data"]}
    assert _shipment_number(client, exception_shipments["today"]) not in numbers
    assert _shipment_number(client, exception_shipments["overdue"]) in numbers


def test_criterion_15_min_days_late_filters(client, exception_shipments):
    """Criterion 15: minDaysLate filters returned rows."""
    body = _rows(client, minDaysLate=5)
    numbers = {row["shipmentNumber"] for row in body["data"]}
    assert _shipment_number(client, exception_shipments["three_late"]) not in numbers
    assert _shipment_number(client, exception_shipments["seven_late"]) in numbers
    assert all(row["daysLate"] >= 5 for row in body["data"])


def test_criterion_16_min_days_late_below_one_is_rejected(client):
    """Criterion 16: minDaysLate below one returns a validation error."""
    response = check(
        client, spec, "GET", "/api/shipments/exceptions/overdue",
        path="/api/shipments/exceptions/overdue", params={"minDaysLate": 0},
    )
    assert response.status_code == 400
    assert response.json()["errorCode"] == 400


def test_criterion_17_origin_filter(client, exception_shipments):
    """Criterion 17: origin filters qualifying shipments."""
    origin = client.location_id("Main Supplier")
    body = _rows(client, origin=origin)
    assert all(row["origin"]["id"] == origin for row in body["data"])


def test_criterion_18_destination_filter(client, exception_shipments):
    """Criterion 18: destination filters qualifying shipments."""
    warehouse = client.location_id("Main Warehouse")
    body = _rows(client, destination=warehouse)
    assert body["data"]
    unrelated = client.location_id("Main Supplier")
    body = _rows(client, destination=unrelated)
    assert body["data"] == [] and body["totalCount"] == 0


def test_criterion_19_unknown_filter_ids_are_not_errors(client):
    """Criterion 19: unknown filter ids return an empty successful page."""
    body = _rows(client, origin="does-not-exist")
    assert body["data"] == [] and body["totalCount"] == 0


def test_criterion_20_response_envelope(client):
    """Criterion 20: the response includes the complete pagination envelope."""
    body = _rows(client)
    assert {"data", "count", "max", "offset", "totalCount"} <= body.keys()
    assert body["count"] == len(body["data"])


def test_criterion_21_default_max_is_fifty(client):
    """Criterion 21: max defaults to fifty."""
    assert _rows(client)["max"] == 50


def test_criterion_22_max_above_five_hundred_is_rejected(client):
    """Criterion 22: max above five hundred returns a validation error."""
    response = check(
        client, spec, "GET", "/api/shipments/exceptions/overdue",
        path="/api/shipments/exceptions/overdue", params={"max": 501},
    )
    assert response.status_code == 400
    assert response.json()["errorCode"] == 400


def test_criterion_23_total_count_ignores_pagination(client, exception_shipments):
    """Criterion 23: totalCount ignores pagination."""
    body = _rows(client, max=1)
    assert body["count"] == 1
    assert body["totalCount"] >= 3


def test_criterion_24_offset_pages(client, exception_shipments):
    """Criterion 24: offset returns a different page."""
    first = _rows(client, max=1, offset=0)
    second = _rows(client, max=1, offset=1)
    assert first["offset"] == 0
    assert second["offset"] == 1
    assert first["data"][0]["id"] != second["data"][0]["id"]


def test_criterion_25_default_sort_is_days_late_descending(client):
    """Criterion 25: default sorting is daysLate descending."""
    values = [row["daysLate"] for row in _rows(client)["data"]]
    assert values == sorted(values, reverse=True)


def test_criterion_26_expected_delivery_date_sort_is_honoured(client):
    """Criterion 26: expectedDeliveryDate sorting is honoured."""
    values = [row["expectedDeliveryDate"] for row in _rows(
        client, sort="expectedDeliveryDate", order="asc",
    )["data"]]
    assert values == sorted(values)


def test_criterion_27_location_name_sort_is_case_insensitive(client):
    """Criterion 27: location-name sorting is case-insensitive."""
    values = [row["origin"]["name"].lower() for row in _rows(
        client, sort="origin", order="asc",
    )["data"]]
    assert values == sorted(values)


def test_criterion_28_unsupported_sort_is_rejected(client):
    """Criterion 28: unsupported sort values return a validation error."""
    response = check(
        client, spec, "GET", "/api/shipments/exceptions/overdue",
        path="/api/shipments/exceptions/overdue", params={"sort": "carrier"},
    )
    assert response.status_code == 400
    assert response.json()["errorCode"] == 400


def test_criterion_29_session_is_required():
    """Criterion 29: an unauthenticated session returns 401."""
    from obx import BASE_URL

    anonymous = requests.Session()
    response = anonymous.get(
        f"{BASE_URL}/api/shipments/exceptions/overdue",
        headers={"Accept": "application/json"},
        timeout=120,
    )
    assert response.status_code == 401
    assert response.json()["errorCode"] == 401


def test_criterion_30_warehouse_is_required(client):
    """Criterion 30: an authenticated session without a warehouse returns 400."""
    from obx import PASSWORD, USERNAME, ApiClient

    no_location = ApiClient()
    no_location.session.headers["Accept"] = "application/json"
    no_location.session.post(
        f"{no_location.base_url}/api/login",
        json={"username": USERNAME, "password": PASSWORD},
    ).raise_for_status()
    response = no_location.request("GET", "/api/shipments/exceptions/overdue")
    assert response.status_code == 400
    assert response.json()["errorCode"] == 400
