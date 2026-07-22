# Test Plan — PR #41 Grails 6.2.3 / Java 21 upgrade (openboxes)

Environment: Docker stack running image `openboxes/openboxes:java21-local` at http://localhost:8080/openboxes (login admin/password, Main Warehouse). All tests recorded in browser except Test 4 (shell).

## Test 1: It should load the dashboard with Fill Rate widgets (no error tiles)
1. Log in as admin/password, choose "Main Warehouse".
2. Dashboard loads; locate the "Fill rate" indicator widget(s).
- PASS: Dashboard renders widgets; Fill Rate widget shows a chart/number, no red error tile or "error" text; no 500 for /openboxes/api/dashboard/fillRateSnapshot in network (verify via widget rendering data, and cross-check devtools-free by widget content).
- FAIL: Fill Rate widget shows error/reload icon or empty error state; any widget shows 500.

## Test 2: It should render a product stock card with stock data
1. Navigate Inventory > Browse inventory (or search a product, e.g. via list), open a product's stock card.
- PASS: Stock card page renders product details and "Current stock" table with quantity rows; no Grails error page / stack trace.
- FAIL: 500 error page or empty/broken stock section.

## Test 3: It should persist a write (create a Location Group)
1. Go to Configuration/admin > Location groups > Create.
2. Enter name "PR41 Test Group", save.
- PASS: Success flash message; new group appears in the list.
- FAIL: Save error, 500, or group not listed.

## Test 4 (shell, not recorded): It should report health UP on Java 21
1. `curl http://localhost:8080/openboxes/health` → expect {"status":"UP"}.
2. `docker exec openboxes-app java -version` → expect openjdk 21.x.
