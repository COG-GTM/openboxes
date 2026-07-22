# Phase 1.5 — Platform Integration Re-verification (Grails 7.2.1 / Java 21)

Re-verification of platform integrations after the Grails 3→7 / Java 8→21
upgrade sequence (PRs #27, #34, #41, #48). All checks were run against a
source-built Java 21 image (`./gradlew prepareDocker -Dgrails.env=prod`,
`docker/docker-compose.yml`) seeded with the demo-data loader, and compared
against the pinned upstream image (`ghcr.io/openboxes/openboxes:latest`)
where relevant.

## Summary matrix

| Integration | Status | Notes |
|---|---|---|
| Quartz scheduler | PASS | Plugin 4.0.1 / Quartz 2.3.2; starts after Liquibase completes (BootStrap) |
| Quartz jobs (12) | PASS | See per-job table below |
| Liquibase — fresh DB | PASS | 982 changesets, 0 pending/failed, all EXECUTED/MARK_RAN |
| Liquibase — upgrade-in-place | PASS | v8→v9 checksum auto-upgrade, 0 validation failures |
| Mail (jakarta.mail, Boot 3.5) | PASS | Plain, HTML and multipart/attachment mail delivered to MailHog sink |
| PDF rendering (rendering plugin) | FIXED | Groovy 4 regression — StackOverflowError; see "Fix" below |
| Report screens | PASS | show*/print* report endpoints render without errors |
| Documents/attachments | PASS | Product document upload/list exercised via characterization suite |
| Characterization suite | PASS | 108 passed, 9 skipped (2 initial failures were load-related flakes; both pass on re-run) |

## 1. Quartz jobs

`quartz.autoStartup=false`; BootStrap starts the scheduler explicitly once
Liquibase migrations finish (`JobUtils.shouldExecute` also postpones any job
that fires mid-migration). Verified in logs: scheduler starts after migration
completion; enabled jobs registered their cron triggers.

| Job | Default | Verified | Result |
|---|---|---|---|
| RefreshProductAvailabilityJob | enabled | scheduled firing + manual (`/dashboard/flushCache`) | PASS — refreshed availability for all locations |
| RefreshOrderSummaryJob | enabled | scheduled firing + manual | PASS |
| RefreshStockoutDataJob | enabled | fired at startup | PASS |
| RefreshDemandDataJob | enabled | fired at startup | PASS |
| RefreshTransactionFactJob | enabled | shortened cron (1/min) | PASS — see note on induced failure below |
| SendStockAlertsJob | enabled | manual (`/admin/triggerStockAlerts`) | PASS — ran; notifications disabled for demo warehouses as configured |
| AssignIdentifierJob | enabled | scheduled firing | PASS — assigned identifier to a product with a deliberately NULLed product_code |
| DataCleaningJob | enabled | scheduled firing | PASS |
| RefreshInventorySnapshotJob | manual | `/inventorySnapshot/triggerRefreshInventorySnapshotJob` | PASS — snapshot refreshed for Main Warehouse |
| DataMigrationJob | manual (`triggers = {}`) | `/migration/migrateAllInventoryTransactions` | PASS |
| CalculateHistoricalQuantityJob | disabled | temporarily enabled via external config | PASS — fired and completed |
| UpdateExchangeRatesJob | disabled | trigger registration only | NOT EXERCISED — requires external exchange-rate API; cron trigger registers correctly when enabled |

Note: one `RefreshTransactionFactJob` run failed with
`SQLIntegrityConstraintViolationException: Column 'product_code' cannot be null`
— this was induced by a deliberate test mutation (a product_code set to NULL to
exercise AssignIdentifierJob). After AssignIdentifierJob repaired the code,
subsequent runs succeeded. Not a platform regression.

## 2. Liquibase 4.27

**Fresh DB**: empty MariaDB 10 → app boot runs the full changelog:
982 changesets in `DATABASECHANGELOG`, zero rows with
`EXECTYPE NOT IN ('EXECUTED','MARK_RAN')`, app healthy.

**Upgrade-in-place**: a DB initialized by the pinned upstream release image
(Liquibase with v8 checksums; the released changelog contains a few changesets
not present on `develop` — expected release drift) was then pointed at the
Java 21 build:

- Liquibase 4.27 auto-upgraded legacy checksums (`Upgrading checksum ... from 8:… to 9:…`) with no `ValidationFailedException`.
- Changesets new on `develop` executed cleanly; `runOnChange`/`runAlways` view changesets re-ran (`EXECTYPE=RERAN`) as designed.
- Final state: 0 pending/failed changesets; app healthy (`/health` UP).

## 3. Mail (Spring Boot 3.5 / jakarta.mail)

Production defaults unchanged (`grails.mail.enabled=false`). Verified with a
test-only MailHog sink using the new compose overlay
(`docker/docker-compose.mail-test.yml` + `docker/mail-test/openboxes-config.properties`):

```
docker compose -f docker-compose.yml -f docker-compose.mail-test.yml up -d
```

- Runtime uses `jakarta.mail-2.0.5` (Angus) via `commons-email2-jakarta`; SMTP transport `org.eclipse.angus.mail.smtp.SMTPTransport`.
- `/admin/sendMail` plain-text mail: delivered to MailHog.
- HTML + attachment (multipart) mail: delivered with 3 MIME parts.

## 4. Reporting / PDF / print rendering

The app uses the Grails `rendering` plugin (2.0.3, javax→jakarta bytecode
transform) with Flying Saucer 9.1.22 (openpdf) — no Jasper.

### Regression found and fixed: StackOverflowError on any PDF containing an image

Every `renderPdf(...)` call whose page referenced an image failed with
`java.lang.StackOverflowError` in
`grails.plugins.rendering.datauri.DataUriAwareITextUserAgent.getImageResource`.
The plugin class was compiled with Groovy 2; on Groovy 4 its
`super.getImageResource(uri)` (compiled to
`ScriptBytecodeAdapter.invokeMethodOnSuperN`) dispatches back to the subclass
override and recurses. Confirmed working on the pinned image (Groovy 2 runtime)
→ genuine platform-upgrade regression.

Fix (parity-preserving, minimal):
- `src/main/groovy/org/pih/warehouse/rendering/SafePdfRenderingService.groovy` — extends the plugin's `PdfRenderingService` but installs Flying Saucer's stock `ITextUserAgent`, which natively supports the embedded base64 data-URI images the plugin's subclass was written for (`ImageUtil.isEmbeddedBase64Image`).
- Registered as the primary `pdfRenderingService` bean in `resources.groovy`.

### Endpoint verification (after fix, all HTTP 200)

| Endpoint | Output |
|---|---|
| `/picklist/renderPdf/<req>` | `%PDF` |
| `/picklist/renderHtml/<req>` | HTML |
| `/deliveryNote/print/<req>` | HTML |
| `/goodsReceiptNote/print/<shipment>` | HTML |
| `/stocklist/renderPdf/<stocklist>` | `%PDF` |
| `/shipment/downloadLabels/<shipment>` (barcode labels) | `%PDF` |
| `/report/downloadShippingReport?format=pdf&url=…&shipment.id=…` | `%PDF` |
| `/report/showTransactionReport`, `showBinLocationReport`, `showOnOrderReport`, `showInventoryReport`, `showRequestDetailReport` | HTML |
| `/report/printShippingReport`, `printPickListReport`, `printPaginatedPackingListReport` (`?shipment.id=…`) | HTML |

### Pre-existing (not fixed)

- `/shipment/downloadLabels` throws `NullPointerException` in
  `BarcodeService.renderImage` (zxing `OneDimensionalCodeWriter.encode`) when a
  shipment item has no lot number. Reproduced on the pinned image (identical
  stack trace on the Java 8 runtime) — pre-existing data-dependent bug, out of
  scope.
- Known drift vs the pinned image (18 API snapshot failures + 1 contract
  failure) is unchanged and remains documented in the characterization README.

## 5. Documents / attachments

Product document upload + listing exercised by the characterization suite
(`product-screens-react.spec.ts › add document screen uploads and edit screen
lists it`) — passing.
