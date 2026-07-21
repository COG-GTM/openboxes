# API snapshot coverage — Phase 0.3a (controllers A–L)

Characterization suite: `characterization/api/` (see its README for how to
run and re-baseline). Snapshots recorded against the Docker baseline
environment (`docs/migration/RUNNING_LOCALLY.md`) seeded with the standard
demo dataset.

**Totals: 106 endpoint snapshots covering all 26 controllers; 104
controller actions snapshotted, 46 skipped (reasons below).**

Legend: ✅ snapshotted · ➖ skipped/not directly routable.

| Controller | Endpoints (actions) | Snapshotted | Notes |
|---|---|---|---|
| ApiController | login, logout, status, chooseLocation, chooseLocale, getMenuConfig, getAppContext, getRequestTypes, getSupportLinks, getResettingInstanceCommand | ✅ all 10 | Routed via `/api/$action/$id?` plus explicit `/api/supportLinks`, `/api/resettingInstance/command`. `logout` exercised in the flows module (session re-authenticated after). |
| AttributeApiController | list | ✅ 1 (2 snapshots) | Default list + `entityType=PRODUCT` variant. |
| BaseApiController | — | ➖ | Abstract base class (`extends BaseController`); declares no actions and has no routes. |
| BaseDomainApiController | list, read, create, update, delete | ➖ (covered indirectly) | No direct routes; every action `forward`s to GenericApiController. Behaviour exercised through concrete subclasses (Location, LocationGroup, Organization, LoadData) and the `generic__*` snapshots. |
| BinLocationApiController | list, read | ✅ both | `list` uses the session warehouse (Main Warehouse). |
| CategoryApiController | list, read, save, delete | ✅ all 4 | Write flow uses a dedicated record ("ZZ Characterization Category") created → read → deleted each run. |
| CombineShipmentApiController | read | ✅ 1 | Demo data has no orders; the `{"data": null}` unknown-id behaviour is characterized with a fixed bogus id. |
| CombinedShipmentItemApiController | getProductsInOrders, getOrderOptions, findOrderItems, addItemsToShipment, importTemplate, exportTemplate | ✅ 4 / ➖ 2 | `exportTemplate` snapshotted with `blank=true` (without it the empty-order-list SQL fails — 500). Skipped: `addItemsToShipment`, `importTemplate` (mutating; require existing order + shipment fixtures). |
| CycleCountApiController | getCandidates, getPendingCycleCountRequests, list, getCycleCountDetails, getCycleCountSummary, createRequests, updateRequests, deleteRequests, startCycleCount, startRecount, submitCount, submitRecount, updateCycleCountItem, deleteCycleCountItem, createCycleCountItem, refreshCycleCount, createCycleCountItemBatch, updateCycleCountItemBatch, uploadCycleCountItems, uploadCycleCountRecountItems, getInventoryTransactionsSummary | ✅ 5 / ➖ 16 | All GET/report endpoints snapshotted. Skipped: the POST/PATCH/DELETE count workflow (mutating multi-step state machine needing cycle-count fixtures — deferred to a dedicated workflow-flow suite). `getInventoryTransactionsSummary` is unreachable here: its route maps to InventoryTransactionSummaryApiController. |
| DashboardApiController | config, getSubdashboardKeys, updateConfig, breadcrumbsConfig + 31 GET data/indicator endpoints | ✅ 33 / ➖ 2 | All GET endpoints snapshotted (config, subdashboardKeys, 29 indicator/data endpoints, expirationSummary, fillRateSnapshot). Skipped: `updateConfig` (mutates the instance-wide dashboard config), `breadcrumbsConfig` (no `/api` route). |
| FulfillmentApiController | validate, save | ➖ both | POST-only; payloads are packing lists bound to an existing outbound shipment — no shipment fixtures in demo data. Cover in Phase 0.3b alongside shipment/stock-movement flows. |
| GenericApiController | list, search, read, create, update, delete | ✅ all 6 | Exercised via the small, stable `locationType` domain: list/search/read plus a dedicated create → update → delete record. `delete` also exercised via organization cleanup. |
| HelpScoutApiController | configuration | ✅ 1 | |
| IndicatorApiController | getProductsInventoried, getInventoryAccuracy, getInventoryShrinkage, evaluate | ✅ 3 / ➖ 1 | `evaluate` skipped: dev-only proof-of-concept referencing an undefined `consoleService` bean (always 500) and has no `/api/reports` route. |
| InternalLocationApiController | list, search, listReceiving, read | ✅ all 4 | |
| InventoryApiController | importCsv, getReorderReport, getExpirationHistoryReport | ✅ 2 / ➖ 1 | `importCsv` skipped (mutating multipart CSV import). `expirationHistoryReport` uses a fixed historic date range (required params). |
| InventoryLevelApiController | list | ✅ 1 | JSON variant snapshotted; `.csv`/`.xls` format variants are file-download renditions of the same data (not snapshotted). |
| InventoryTransactionSummaryApiController | getInventoryTransactionsSummary | ✅ 1 | JSON variant; `format=csv` is a file download of the same data. |
| InvoiceApiController | list, read, statusOptions, invoiceTypeCodes, create, update, getInvoiceItems, getInvoiceItemCandidates, getOrderNumbers, getShipmentNumbers, removeItem, updateItems, submitInvoice, postInvoice, getPrepaymentItems, validateInvoiceItem | ✅ 4 / ➖ 12 | Snapshotted: list (empty in demo data), unknown-id read error shape, statusOptions, invoiceTypeCodes. Skipped: the remaining read endpoints need real invoice ids and the write endpoints need purchase-order/vendor-invoice fixtures — demo data has none. Cover with dedicated fixtures in the invoicing-flow suite. |
| LoadDataApiController | listOfDemoData, load (+ inherited BaseDomainApiController actions) | ✅ 1 / ➖ 1 | `load` re-imports the entire demo dataset (non-idempotent; already executed once during environment setup). Inherited generic actions covered via `generic__*`. |
| LocalizationApiController | list, read | ✅ both | |
| LocationApiController | list, read, productSummary, locationTypes, supportedActivities, create, update, delete, downloadTemplate, importCsv, downloadBinLocationTemplate, importBinLocations | ✅ 7 / ➖ 5 | `downloadBinLocationTemplate` is characterized as its current behaviour: 404 (the `templates/binLocations.xls` file is missing from the released image). Skipped: create/update/delete (locations are referenced by inventory/requisitions across the demo dataset; mutation cascades), importCsv/importBinLocations (multipart file imports). |
| LocationGroupApiController | list, read, create, update, delete | ✅ all 5 | Write flow uses a dedicated record ("ZZ Characterization Location Group"). |
| NoopApiController | list, read, create, update, delete | ✅ 2 / ➖ 3 | Every action renders the identical `NotImplementedException` 500; `list` and `read` snapshotted as representatives. |
| OrganizationApiController | list, read, create (+ inherited delete via generic) | ✅ all | Create uses a dedicated record ("ZZ Characterization Organization"), deleted via `/api/generic/organization/{id}`. |
| PackListApiController | exportPackTemplate, importPackListItems | ✅ 1 / ➖ 1 | Demo data has no shipments: `exportPackTemplate` characterized via its unknown-id 404 error shape. `importPackListItems` skipped (mutating multipart import bound to a shipment). Full coverage needs shipment fixtures (Phase 0.3b). |

## Determinism / masking

Demo-data ids are generated at load time and DB result ordering is not
stable, so responses are normalized before comparison (ids, dates,
volatile keys masked; keys and arrays canonically sorted). The shared rules
live in `characterization/api/obx.py`; A–L-specific masks (dashboard
month/FY time-series labels, generated `NNNLLL` sequence codes, build/host
metadata, error-page timestamps) in `characterization/api/a_l.py`. See the
suite README.

Write flows use dedicated `ZZ Characterization *` records that are created
and removed within a run (with pre-run cleanup of leftovers), so re-runs
against the same database stay deterministic.

## Commands

```bash
./characterization/api/run.sh                     # verify (fails on any diff)
UPDATE_SNAPSHOTS=1 ./characterization/api/run.sh   # intentionally re-baseline
./characterization/api/run.sh -k category          # filter (pytest -k)
```

CI: `.github/workflows/characterization-tests.yml` (boots docker compose,
loads demo data, runs the combined A–L + M–Z suite on every PR via
`test-pull-request.yml`).
