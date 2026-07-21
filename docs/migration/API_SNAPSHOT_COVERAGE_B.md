# API Snapshot Coverage — Phase 0.3b (Controllers M–Z)

Snapshot tests live in `characterization/api/` (see its README for run and
re-baseline commands). This table covers the 26 API controllers M–Z.

Run: `./characterization/api/run.sh` — Re-baseline: `UPDATE_SNAPSHOTS=1 ./characterization/api/run.sh`

"Endpoints" counts controller actions reachable through `UrlMappings.groovy`
(including the generic `/api/${resource}s` REST mappings). "Snapshotted"
counts actions exercised by at least one snapshot case.

| Controller | Endpoints | Snapshotted | Notes |
|---|---|---|---|
| PartialReceivingApiController | 5 | 1 | `list` snapshotted (hardcoded empty list). `read`/`update`/`exportCsv`/`importCsv` need a shipped inbound shipment — none in seed data; receiving flows are mutating. |
| PersonApiController | 1 | 1 | `list` snapshotted unfiltered and name-filtered. |
| PicklistApiController | 1 | 0 | Only `clearPicklist` (DELETE) — destructive on pick state; no safe deterministic flow. |
| PrepaymentInvoiceApiController | 1 | 0 | Only `updateItems` (POST) — requires a seeded prepayment invoice (none in demo data). |
| PrepaymentInvoiceItemApiController | 2 | 0 | `update`/`delete` require prepayment invoice items (none in demo data). |
| ProductApiController | 18 | 15 | All GET actions snapshotted. Skipped: `getInventoryItem` (needs a lot number — demo product has none), `save` and `importCsv` (mutate the product catalog). |
| ProductClassificationApiController | 1 | 1 | `list` snapshotted. |
| ProductPackageApiController | 1 | 0 | Only `create` (POST) — permanently mutates product packaging config; no delete endpoint to clean up. |
| ProductSupplierApiController | 6 | 6 | `list`/`export` snapshotted directly; `create`/`read`/`update`/`delete` via dedicated-record flow. |
| ProductSupplierAttributeApiController | 1 | 0 | Only `updateAttributes` (batch POST) — requires product-supplier attribute types not present in demo data. |
| ProductSupplierPreferenceApiController | 4 | 0 | CRUD requires seeded preference types (none in demo data); batch endpoint mutates without cleanup path. |
| ProductsConfigurationApiController | 8 | 5 | All GET actions snapshotted (incl. CSV downloads). Skipped: `importCategories`/`importCategoryCsv`/`importProducts` (mutating config-wizard imports). |
| PurchaseOrderApiController | 5 | 2 | `list`, `statusOptions` snapshotted. `read`/`delete`/`rollback` need a seeded purchase order (none in demo data). |
| PutawayApiController | 3 | 1 | `list` snapshotted. `read` needs a putaway order (none seeded); `create` mutates inventory. |
| PutawayItemApiController | 1 | 0 | Only `removingItem` (DELETE) — needs an existing putaway item. |
| ReasonCodeApiController | 2 | 2 | `list` (default + ADJUST_INVENTORY activity) and `read` snapshotted. |
| RecordStockApiController | 1 | 0 | Only `saveRecordStock` (POST) — rewrites a product's inventory baseline; would break determinism of other inventory snapshots. |
| ReplenishmentApiController | 12 | 3 | `list`, `statusOptions`, `requirements` snapshotted. `read`/`update`/picklist endpoints need a replenishment order (none seeded); `create` mutates inventory allocation. |
| SelectOptionsApiController | 11 | 11 | All option endpoints snapshotted. |
| StockAdjustmentApiController | 1 | 0 | Only `create` (POST) — posts inventory adjustment transactions; not safely reversible. |
| StockMovementApiController | 24 | 11 | List (both directions), status-code options, pending/shipped item reports snapshotted; `create`/`read`/`status`/`updateItems`/`getDocuments`/`delete` via dedicated draft-movement flow. Skipped: workflow RPCs past draft state (`updateRequisition`, `updateShipment`, `reviseItems`, `updateInventoryItems`, `updateShipmentItems`, `updateAdjustedItems`, `createPickList`, `validatePicklist`, `updateStatus`, `deleteStatus`, `removeAllItems`, `rollbackApproval`, `createCombinedShipments`) — require shipped/received state and mutate inventory. `downloadPackingListTemplate` 404s (template asset missing from released image). |
| StockMovementItemApiController | 13 | 4 | `list`, `read`, `details`, `getStockMovementItems` snapshotted via the draft-movement flow. Pick-stage RPCs (`updatePicklist`, `createPicklist`, `clearPicklist`, `revertPick`, `substituteItem`, `revertItem`, `cancelItem`, `eraseItem`, `getSubstitutionItems`) need an allocated picklist on a submitted movement. |
| StockTransferApiController | 12 | 3 | `list`, `statusOptions`, `stockTransferCandidates` snapshotted. CRUD/`sendShipment`/`rollback` mutate inventory via transfer orders; `returnCandidates` needs a complex return payload. |
| StocklistApiController | 11 | 6 | `list`, `export` snapshotted directly; `create`/`read`/`update`/`delete` via dedicated-record flow. Skipped: `sendMail` (sends email), `clone`/`publish`/`unpublish`/`clear` (mutate the shared seeded stocklists). |
| StocklistItemApiController | 6 | 6 | `availableStocklists` snapshotted directly; `list`/`create`/`read`/`update`/`remove` via dedicated-record flow. |
| UnitOfMeasureApiController | 4 | 4 | `currencies`, `uomOptions`, and generic `list`/`read` snapshotted. |
| **Total** | **155** | **82** | 85 snapshot cases (some actions have multiple parameterizations). |

## Skip-reason summary

- **No seeded data for the entity** (purchase orders, shipments, replenishments,
  prepayment invoices, supplier attributes/preferences, putaway orders): the
  endpoint cannot be exercised without first driving a full mutating workflow.
  These should be revisited once characterization fixtures for those workflows
  exist (candidate for a Phase 0.3 follow-up).
- **Mutating without a safe cleanup path** (inventory adjustments, record
  stock, imports, putaway/pick/transfer state transitions, email): running them
  would make the suite non-deterministic or alter the shared seed data that
  other snapshots depend on.
