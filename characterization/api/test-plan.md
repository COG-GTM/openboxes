# Test Plan — PR #4: API characterization snapshot suite (M–Z)

Environment: OpenBoxes Docker stack already running at http://localhost:8080/openboxes, demo data loaded. Do NOT reload demo data.

## Test 1: Suite passes and is deterministic (shell, no recording)
1. `cd ~/repos/openboxes && ./characterization/api/run.sh` — Run #1.
   - PASS: exit code 0, "85 passed" in pytest summary, 0 failed/errors.
2. Run `./characterization/api/run.sh` again immediately — Run #2.
   - PASS: exit code 0, "85 passed" again (proves write flows clean up and snapshots are stable/re-runnable).
   - FAIL if any snapshot diff, error, or count != 85.

## Test 2: No residue after runs (shell)
Using authenticated requests via the suite's own client (python with requests, JSESSIONID login as admin):
1. GET /api/stocklists — PASS: exactly 2 stocklists returned (seeded ones only), none with names created by the tests.
2. GET /api/productSuppliers — PASS: no entry with code/name containing "CHARTEST-PS".
3. Grep test_m_z_flows.py for other created identifiers (e.g. CHARTEST prefixes) and confirm none remain via corresponding GET endpoints.

## Test 3: UI sanity (browser, recorded)
1. Login at http://localhost:8080/openboxes as admin/password, choose Main Warehouse.
   - PASS: dashboard loads without errors.
2. Navigate to a list touched by the flows (e.g. Stock Lists page) — PASS: page renders, only seeded data visible.

## Not testable locally
- CI workflow (.github/workflows/characterization-tests.yml) triggers only on GitHub Actions; note CI status in report instead.
