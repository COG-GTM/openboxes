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
   `destination` = the session warehouse, `expectedDeliveryDate` 3 days in the
   past and status `SHIPPED` appears in `data`, keyed by its `shipmentNumber`.
2. **Future expected delivery date is excluded.** A shipment with
   `expectedDeliveryDate` 3 days in the future does not appear in `data` for
   any page of the result set.
3. **Expected delivery date of today is excluded.** A shipment whose
   `expectedDeliveryDate` is today does not appear, because its floored
   `daysLate` is 0, which is below the default threshold of 1.
4. **Received shipments are excluded.** A shipment with
   `expectedDeliveryDate` in the past and status `RECEIVED` does not appear,
   and no row in `data` has `status` = `RECEIVED`.
5. **Delivered-but-not-received shipments are excluded.** A shipment with a
   past `expectedDeliveryDate` that has an actual delivery recorded
   (`actualDeliveryDate` / `dateDelivered()` non-null) does not appear, even
   when its status is still `SHIPPED`.
6. **Null expected delivery date is excluded.** A shipment with
   `expectedDeliveryDate` null and an `expectedShippingDate` well in the past
   does not appear, and every row in `data` has a non-null
   `expectedDeliveryDate`.
7. **Cancelled shipments are excluded.** A shipment with a past
   `expectedDeliveryDate` that carries a shipment event with
   `EventCode.CANCELLED` does not appear. (There is no `CANCELLED`
   `ShipmentStatusCode`; cancellation is event-based — see open question 1.)
8. **Only inbound shipments are included.** A shipment whose `origin` is the
   session warehouse and whose `destination` is another location does not
   appear; every row in `data` has `destination.id` equal to the session
   warehouse id (or one of its child locations).
9. **Inbound is relative to the session warehouse.** The same overdue shipment
   appears when the session is bound to its destination warehouse and does not
   appear when the session is bound to a different warehouse.
10. **Partially received shipments are included.** A shipment with a past
    `expectedDeliveryDate` and status `PARTIALLY_RECEIVED` appears, because
    part of the goods is still outstanding (see open question 2).

## daysLate

11. **daysLate is whole days, floored.** For a shipment whose
    `expectedDeliveryDate` is 2 days and 18 hours in the past, `daysLate` is
    exactly 2.
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
21. **totalCount ignores pagination.** With at least 3 qualifying shipments,
    `max=1` returns `count` 1 while `totalCount` stays equal to the number of
    qualifying shipments.
22. **offset pages.** With `max=1`, the row at `offset=1` differs from the row
    at `offset=0`, and `offset` is echoed back unchanged.
23. **Default sort is daysLate descending.** Called without `sort`/`order`,
    `daysLate` values across `data` are in non-increasing order (most overdue
    first).
24. **sort is honoured.** With `sort=expectedDeliveryDate&order=asc`, the
    `expectedDeliveryDate` values across `data` are in non-decreasing order.
25. **Unsupported sort values are rejected.** `sort=carrier` responds `400`
    (the parameter is a closed enum in the contract).

## Auth

26. **A session is required.** Called without the `JSESSIONID` cookie, the
    endpoint responds `401` with the shared error body.

## Open questions for the human

1. **Cancellation semantics.** `ShipmentStatusCode` has no `CANCELLED` value;
   the only cancellation signal is a shipment event with
   `EventCode.CANCELLED`. Criterion 7 assumes "cancelled" means "has a
   CANCELLED event, and that event is the latest one". Confirm, or name the
   signal you actually want.
2. **Partially received shipments.** Criterion 10 reports them as still
   overdue. Confirm — the alternative is to exclude anything with any receipt.
3. **Inbound definition.** The contract defines inbound as
   `destination` = session warehouse (or a child location of it). Confirm that
   is the right notion of "relative to the requesting location", rather than,
   say, any location the user has access to.
4. **Time zone / clock.** `daysLate` is floored using the server time zone.
   Confirm that is acceptable, or specify a client-supplied `asOfDate`.
5. **Overdue vs. never shipped.** A shipment still in status `CREATED` or
   `PENDING` past its expected delivery date is reported (it is late). Confirm
   you want those, or restrict to shipments that have actually shipped.
