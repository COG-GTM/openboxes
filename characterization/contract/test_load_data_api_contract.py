"""Contract tests for LoadDataApiController (openapi/specs/load-data-api.yaml).

GET /api/config/data/demo (load()) is spec'd but not exercised: it is a
mutating GET that re-imports the demo dataset into the seeded baseline,
which would corrupt the parity oracle for the rest of the suite.
"""

from oas import Spec, check

spec = Spec("load-data-api.yaml")


def test_list_of_demo_data(client):
    resp = check(client, spec, "GET", "/api/loadData/listOfDemoData")
    assert resp.json()["data"]["title"]
