# API Characterization (Snapshot) Tests

JSON snapshot tests that pin the current behavior of the OpenBoxes REST API.
They are the **API parity oracle** for the backend migration: any change in an
endpoint's response (status, content type, or normalized body) fails the
suite.

## Prerequisites

A running, seeded OpenBoxes instance — follow
[docs/migration/RUNNING_LOCALLY.md](../../docs/migration/RUNNING_LOCALLY.md):

```bash
cd docker
docker compose up -d          # wait for {"status":"UP"} on /openboxes/health
./load-demo-data.sh           # seed the demo dataset (run once, on a fresh DB)
```

## Run the suite

```bash
./characterization/api/run.sh
```

This creates a local `.venv`, installs `pytest`/`requests`, and runs every
snapshot test. Extra args are passed to pytest (e.g. `./run.sh -k stocklist`).

Configuration via environment variables: `OB_BASE_URL` (default
`http://localhost:8080/openboxes`), `OB_USERNAME` (`admin`), `OB_PASSWORD`
(`password`).

## Re-baseline snapshots

When an intentional behavior change lands, regenerate the snapshots and commit
the diff:

```bash
UPDATE_SNAPSHOTS=1 ./characterization/api/run.sh
```

## Conventions

- Snapshots live in `snapshots/<case>.json`, committed in-repo. Each records
  the request (method, path, params), status, content type, and the
  **normalized** response body.
- Normalization (`obx.py`) masks nondeterministic values so snapshots are
  stable across database rebuilds: hibernate hex ids and UUIDs -> `<id>`,
  timestamps/dates -> `<date>`, auto-generated identifier fields (e.g.
  `identifier`, `requestNumber`, audit dates) -> `<masked>`. Object keys and
  list elements are sorted; CSV bodies are masked and line-sorted.
- Test records resolve seeded entities by stable natural keys (location
  names, product codes) — never by generated ids.
- Write flows (`test_a_l_flows.py`, `test_m_z_flows.py`) create dedicated
  test records, snapshot every step, and delete what they created so the
  suite is re-runnable.
- A–L-specific masks live in `a_l.py`: dashboard month/FY time-series
  labels, generated `NNNLLL` sequence codes (e.g. organization code
  suffixes), build/host metadata keys, and per-request values in Grails
  HTML error pages. `a_l.py` also warms up the product-availability table
  (synchronous refresh) so stock-derived endpoints are populated on a
  freshly seeded database.
- CI: `.github/workflows/characterization-tests.yml`, called from
  `test-pull-request.yml`.

## Coverage

- Controllers A–L: see [docs/migration/API_SNAPSHOT_COVERAGE_A.md](../../docs/migration/API_SNAPSHOT_COVERAGE_A.md)
- Controllers M–Z: see [docs/migration/API_SNAPSHOT_COVERAGE_B.md](../../docs/migration/API_SNAPSHOT_COVERAGE_B.md)
