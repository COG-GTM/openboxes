# Acceptance criteria — overdue inbound shipments

Contract under review: `openapi/specs/shipment-exceptions-api.yaml`,
`GET /api/shipments/exceptions/overdue`.

Business intent: a warehouse manager wants the list of inbound shipments whose
expected delivery date has passed and that have not been received yet, with how
many days late each one is, so carriers can be chased before a stockout.

Each statement below is written so a single API contract test can prove it
(seed or pick the described shipment, call the endpoint, assert on the
response). "The endpoint" always means the operation above, called with a
session bound to a warehouse via `POST /api/chooseLocation/{locationId}`.

## Inclusion / exclusion

1. **Overdue, unreceived, inbound shipment is included.** A shipment with
   `destination` = the session warehouse or one of its child locations,
   `expectedDeliveryDate` 3 days in the past and derived status `SHIPPED`
   appears in `data`, identified by matching `shipmentNumber`.
2. **Future expected delivery date is excluded.** A shipment with
   `expectedDeliveryDate` 3 days in the future does not appear in `data` for
   any page of the result set.
3. **Expected delivery date of today is excluded.** A shipment whose
   `expectedDeliveryDate` is today does not appear, because its calendar-day
   `daysLate` is 0, which is below the default threshold of 1.
4. **Received shipments are excluded.** A shipment with
   `expectedDeliveryDate` in the past and derived status `RECEIVED` does not
   appear, and no row in `data` has `status` = `RECEIVED`.
5. **Received-or-delivered shipments are excluded.** A shipment with a past
   `expectedDeliveryDate` that has either a `RECEIVED` or `DELIVERED` shipment
   event (`dateDelivered()` non-null; its `actualDeliveryDate` fallback is
   transient and derives from the `RECEIVED` event, so `RECEIVED`/`DELIVERED`
   events are the only signals) does not appear, even when its derived status
   is `PARTIALLY_RECEIVED`.
6. **Null expected delivery date is excluded.** A shipment with
   `expectedDeliveryDate` null and an `expectedShippingDate` well in the past
   does not appear, and every row in `data` has a non-null
   `expectedDeliveryDate`.
7. **Cancelled shipments are excluded.** A shipment with a past
   `expectedDeliveryDate` that carries a shipment event with
   `EventCode.CANCELLED` as its latest event does not appear. (There is no
   `CANCELLED` `ShipmentStatusCode`; cancellation is event-based — see
   decision 1.)
8. **Only inbound shipments are included.** A shipment whose `origin` is the
   session warehouse and whose `destination` is another location does not
   appear; every row in `data` has `destination.id` equal to the session
   warehouse id (or one of its child locations).
9. **Inbound is relative to the session warehouse.** The same overdue shipment
   appears when the session is bound to its destination warehouse or its parent
   warehouse when the destination is a child location, and does not appear
   when the session is bound to a different warehouse.
10. **Partially received shipments are included.** A shipment with a past
    `expectedDeliveryDate`, derived status `PARTIALLY_RECEIVED`, and neither a
    `RECEIVED` nor a `DELIVERED` event appears, because part of the goods is
    still outstanding (the `actualDeliveryDate` fallback is transient and
    derives from `RECEIVED`, so `RECEIVED`/`DELIVERED` events are the only
    signals). The received/delivered exclusion takes precedence when either
    event exists (see decision 2).

## daysLate

11. **daysLate is a calendar-day difference.** For a shipment whose
    `expectedDeliveryDate` is at 23:00 two calendar days ago, `daysLate` is
    exactly 2 regardless of the time of day when the request runs.
12. **daysLate is never below the threshold.** Every row in `data` has
    `daysLate` >= the effective `minDaysLate` (1 when the parameter is
    omitted).
13. **daysLate is an integer >= 1 on every row.** No row carries a null,
    fractional, zero or negative `daysLate`.

## Filtering

14. **Default threshold is 1 day.** Called without `minDaysLate`, the response
    includes a shipment 1 day late and excludes a shipment 0 days late (due
    today).
15. **minDaysLate filters.** With `minDaysLate=5`, a shipment 3 days late is
    absent and a shipment 7 days late is present; every returned row has
    `daysLate >= 5`.
16. **minDaysLate below 1 is rejected.** `minDaysLate=0` responds `400` with
    the shared validation error body (`errorCode` 400).
17. **origin filters.** With `origin=<location id of A>`, every row has
    `origin.id` = A, and an otherwise-qualifying shipment from a different
    origin is absent.
18. **destination filters.** With `destination=<session warehouse id>`, the
    qualifying shipment is present; with the id of an unrelated location, the
    response is an empty `data` array with `totalCount` 0 (no error).
19. **Unknown filter ids are not errors.** With `origin=<non-existent id>`, the
    response is `200` with `data` empty and `totalCount` 0.

## Pagination and sorting

20. **Response envelope.** The body always carries `data`, `count`, `max`,
    `offset` and `totalCount`; `count` equals `data.length`.
21. **Default max is 50.** Called without `max`, the response echoes
    `max` = 50.
22. **max above 500 is rejected.** Called with `max=501`, the endpoint
    responds `400` with the shared validation error body (`errorCode` 400).
23. **totalCount ignores pagination.** With at least 3 qualifying shipments,
    `max=1` returns `count` 1 while `totalCount` stays equal to the number of
    qualifying shipments.
24. **offset pages.** With `max=1`, the row at `offset=1` differs from the row
    at `offset=0`, and `offset` is echoed back unchanged.
25. **Default sort is daysLate descending.** Called without `sort`/`order`,
    `daysLate` values across `data` are in non-increasing order (most overdue
    first).
26. **sort is honoured.** With `sort=expectedDeliveryDate&order=asc`, the
    `expectedDeliveryDate` values across `data` are in non-decreasing order.
27. **Location-name sorting is case-insensitive.** With
    `sort=origin&order=asc`, the `origin.name` values across `data` are in
    case-insensitive non-decreasing order.
28. **Unsupported sort values are rejected.** `sort=carrier` responds `400`
    (the parameter is a closed enum in the contract).

## Auth

29. **A session is required.** Called without the `JSESSIONID` cookie, the
    endpoint responds `401` with the shared error body.
30. **A warehouse is required.** Called with an authenticated session that has
    no warehouse selected, the endpoint responds `400` with the shared
    validation error body (`errorCode` 400).

## Decisions

1. **Cancellation semantics — decided.** `ShipmentStatusCode` has no
   `CANCELLED` value. A shipment is cancelled when its **latest** event has
   `EventCode.CANCELLED`; those shipments are excluded.
2. **Partially received shipments — decided.** Partially received shipments
   stay in the list. They are excluded only when a `RECEIVED` or `DELIVERED`
   event exists, meaning `dateDelivered()` is non-null.
3. **Inbound definition — decided.** Inbound means the shipment destination
   is the session warehouse or one of its child locations.
4. **Time zone / clock — decided.** `daysLate` is floored whole calendar
   days using the server clock and time zone; both dates are truncated to
   midnight. There is no client-supplied `asOfDate`.
5. **Overdue vs. never shipped — decided.** Shipments in derived status
   `PENDING` that are past due are included.
