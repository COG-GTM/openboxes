import pytest

from obx import ApiClient


@pytest.fixture(scope="session")
def client():
    c = ApiClient()
    c.login()
    return c
