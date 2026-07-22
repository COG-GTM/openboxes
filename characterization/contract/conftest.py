import sys
from pathlib import Path

import pytest

# Reuse the snapshot suite's authenticated client and seeded-data lookups.
sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "api"))

from obx import ApiClient  # noqa: E402


@pytest.fixture(scope="session")
def client():
    c = ApiClient()
    # Ask for JSON errors (RequestUtil.isAjax) so error responses match the
    # JSON error shapes declared in openapi/components/common.yaml.
    c.session.headers["Accept"] = "application/json"
    c.login()
    return c
