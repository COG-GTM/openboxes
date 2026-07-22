"""Contract tests for ProductsConfigurationApiController
(openapi/specs/products-configuration-api.yaml).

importCategories and importProducts import whole predefined datasets fetched
from upstream GitHub URLs, which would permanently alter the seeded database;
they are spec'd but only their non-mutating branches are exercised here
(importProducts without a productOption is a no-op). importCategoryCsv is
exercised with a dedicated ZZ Contract category that is deleted afterwards.
"""

import pytest

from oas import Spec, check

spec = Spec("products-configuration-api.yaml")

TEST_CATEGORY = "ZZ Contract Imported Category"


@pytest.fixture(scope="module", autouse=True)
def cleanup_leftovers(client):
    for cat in client.get_json("/api/categories")["data"]:
        if cat.get("name") == TEST_CATEGORY:
            client.request("DELETE", f"/api/categories/{cat['id']}")


def test_categories_count(client):
    resp = check(client, spec, "GET", "/api/productsConfiguration/categoriesCount")
    assert resp.json()["data"] > 0


def test_category_options(client):
    resp = check(client, spec, "GET", "/api/productsConfiguration/categoryOptions")
    assert "defaultCategories" in resp.json()["data"]


def test_product_options(client):
    resp = check(client, spec, "GET", "/api/productsConfiguration/productOptions")
    assert "whoProducts" in resp.json()["data"]


def test_download_category_template(client):
    resp = check(client, spec, "GET",
                 "/api/productsConfiguration/downloadCategoryTemplate")
    assert resp.text.strip() == "Category Name,Parent Category Name"


def test_download_categories(client):
    resp = check(client, spec, "GET",
                 "/api/productsConfiguration/downloadCategories")
    assert "ROOT" in resp.text


def test_import_category_csv(client):
    csv = f"Category Name,Parent Category Name\n{TEST_CATEGORY},ROOT\n"
    resp = check(client, spec, "POST",
                 "/api/productsConfiguration/importCategoryCsv",
                 files={"importFile": ("categories.csv", csv.encode(), "text/csv")})
    assert resp.status_code == 200
    created = [c for c in client.get_json("/api/categories")["data"]
               if c.get("name") == TEST_CATEGORY]
    assert created, "imported category should exist"
    for cat in created:
        client.request("DELETE", f"/api/categories/{cat['id']}")


def test_import_category_csv_empty_file(client):
    resp = check(client, spec, "POST",
                 "/api/productsConfiguration/importCategoryCsv",
                 files={"importFile": ("empty.csv", b"", "text/csv")})
    assert resp.status_code == 500
    assert resp.json()["errorMessage"] == "File cannot be empty"


def test_import_category_csv_wrong_content_type(client):
    resp = check(client, spec, "POST",
                 "/api/productsConfiguration/importCategoryCsv",
                 files={"importFile": ("categories.txt", b"a,b", "text/plain")})
    assert resp.status_code == 500


def test_import_products_without_option_is_noop(client):
    # admin is a superuser in the seeded dataset; without a productOption the
    # import is a no-op but still responds 200.
    resp = check(client, spec, "POST",
                 "/api/productsConfiguration/importProducts", json={})
    assert resp.status_code == 200
