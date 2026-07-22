# Known issue: some contract-test modules leave database mutations behind

The CI characterization job runs the snapshot suite **before** the contract
suite on a freshly seeded database, so CI stays green. But on a long-lived
local baseline, re-running the snapshot suite *after* a full contract-suite
run fails, because a few contract modules permanently mutate the seeded data.

Measured on a fresh Docker baseline (reset + `./load-demo-data.sh`), running
each contract module followed by the full snapshot suite. The modules below
introduce the listed snapshot diffs; all other modules are re-run safe.

| Contract module | Snapshot tests broken after it runs |
| --- | --- |
| `test_cycle_count_api_contract.py` | `cycleCount__pendingRequests`, `cycleCount__list`, `cycleCount__report_details`, `cycleCount__report_summary`, `indicator__inventoryAccuracy` |
| `test_fulfillment_api_contract.py` | `cycleCount__candidates`, `dashboard__requisitionsByYear`, `dashboard__sentStockMovements`, `stock_movement_list_outbound`, `stock_movement_shipped_items` |
| `test_purchase_order_api_contract.py` | `api__getAppContext`, `binLocation__list`, `binLocation__read`, `internalLocation__search`, `internalLocation__read`, `location__list`, `location__read`, `organization__list`, `product_demand`, `product_available_bins`, `product_available_items` |

Follow-up: make these three modules re-run safe (clean up the records they
create, or make their writes net-zero), per the convention in
`openapi/README.md` ("Write flows must create dedicated `ZZ Contract ...`
records and delete them (with leftover cleanup), so the suite is
re-runnable"). Until then, reset the local database
(`docker compose down && rm -rf docker/mysql && docker compose up -d && ./load-demo-data.sh`)
before re-running the snapshot suite after a contract run.
