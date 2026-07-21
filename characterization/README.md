# OpenBoxes characterization suite

Playwright golden-path tests that run against the **live legacy app**
(Grails 3.3.16, booted from `docker/docker-compose.yml`). They are the parity
oracle for the modernization program: any rewrite must keep these green.

## Flows covered

| Spec | Flow | Data outcomes asserted |
|------|------|------------------------|
| `tests/login.spec.ts` | Login / logout (+ invalid credentials) | authenticated JSON API session, location choice, session destroyed on logout |
| `tests/receive-stock.spec.ts` | Inbound stock movement → send shipment → partial receiving | stock movement status `DISPATCHED` → `RECEIVED`, quantity on hand +25 for the received lot |
| `tests/create-requisition.spec.ts` | Create requisition (outbound stock movement) with a line item | requisition persisted with identifier + `CREATED` status, line item product/quantity, appears in outbound list |

## Running locally (one command)

From the repo root, with Docker running:

```bash
(cd docker && docker compose up -d && ./wait-for-app.sh && ./load-demo-data.sh) \
  && cd characterization && npm ci && npx playwright install chromium && npm test
```

If the stack is already up with demo data loaded, just:

```bash
cd characterization && npm test
```

Point the suite at another instance with `OPENBOXES_BASE_URL`
(default `http://localhost:8080/openboxes`).

## Seeded-data assumptions

- The instance was booted from `docker/docker-compose.yml` and
  `docker/load-demo-data.sh` was run **once** against the fresh database
  (see `docs/migration/RUNNING_LOCALLY.md`).
- `admin` / `password` exists (install migrations) and can log into the
  **Main Warehouse** depot (location id `1`).
- Demo data provides: supplier **Main Supplier**, depot **Boston Warehouse**,
  and product **Lamivudine 150mg tablet** (lot & expiry controlled).
- Product **codes** are randomly generated at demo-import time, so tests
  reference products by **name**, never by code.

## Determinism

- Tests run serially (`workers: 1`) and create their own records with a
  unique per-run suffix (timestamped lot numbers / descriptions), so they can
  be re-run against the same database without resets.
- Inventory assertions are **deltas** (before/after quantity on hand), not
  absolute totals.

## Screenshots

Each flow captures full-page screenshots at every key step into
`screenshots/output/<flow>/` (gitignored). Reviewed baselines are committed
under `screenshots/baseline/<flow>/`. After an intentional UI change, refresh
baselines by copying `screenshots/output/` over `screenshots/baseline/`.

## Shared fixtures (for future characterization children)

- `fixtures/constants.ts` – seeded-data constants, date helpers.
- `fixtures/auth.ts` – GSP login/logout + location choice.
- `fixtures/react-select.ts` – helpers for the React wizards' comboboxes.
- `fixtures/screenshots.ts` – per-step screenshot capture.

Extend these rather than re-implementing per suite.
