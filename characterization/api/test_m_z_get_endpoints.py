"""Snapshot tests for read-only (GET) endpoints of API controllers M-Z.

Each case issues a request against the seeded app and compares the normalized
response (see obx.normalize) to a committed snapshot under snapshots/.

Path/param placeholders are resolved at runtime against stable natural keys
from the demo dataset:
    {location:<name>}   -> location id looked up by name
    {product:<code>}    -> product id looked up by product code
    {stocklist:<name>}  -> stocklist (requisition template) id looked up by name
"""

import re

import pytest

from obx import check_snapshot, record_response

PLACEHOLDER_RE = re.compile(r"\{(location|product|stocklist):([^}]+)\}")


def resolve(client, value):
    def repl(m):
        kind, key = m.group(1), m.group(2)
        if kind == "location":
            return client.location_id(key)
        if kind == "stocklist":
            return client.stocklist_id(key)
        return client.product_id(key)

    return PLACEHOLDER_RE.sub(repl, value)


# (snapshot name, path, params)
GET_CASES = [
    # PartialReceivingApiController
    ("partial_receiving_list", "/api/partialReceiving", {}),
    # PersonApiController
    ("person_list", "/api/persons", {}),
    ("person_list_filtered", "/api/persons", {"name": "Administrator"}),
    # ProductApiController
    ("product_list", "/api/products", {"max": "10", "offset": "0"}),
    ("product_search", "/api/products/search", {"name": "Adapter"}),
    ("product_demand", "/api/products/{product:AX738}/demand", {}),
    ("product_demand_summary", "/api/products/{product:AX738}/demandSummary", {}),
    ("product_summary", "/api/products/{product:AX738}/productSummary", {}),
    ("product_availability", "/api/products/{product:AX738}/productAvailability", {}),
    ("product_available_bins", "/api/products/{product:AX738}/availableBins", {}),
    ("product_substitutions", "/api/products/{product:AX738}/substitutions", {}),
    (
        "product_associated_products",
        "/api/products/{product:AX738}/associatedProducts",
        {"type": "SUBSTITUTE"},
    ),
    ("product_with_catalogs", "/api/products/{product:AX738}/withCatalogs", {}),
    (
        "product_availability_and_demand",
        "/api/products/{product:AX738}/productAvailabilityAndDemand",
        {"locationId": "{location:Main Warehouse}"},
    ),
    ("product_product_demand", "/api/products/{product:AX738}/productDemand", {}),
    (
        "product_latest_inventory_count_date",
        "/api/products/getLatestInventoryCountDate",
        {"productIds": "{product:AX738}"},
    ),
    (
        "product_available_items",
        "/api/products/availableItems",
        {"location.id": "{location:Main Warehouse}", "product.id": "{product:AX738}"},
    ),
    (
        "product_lot_numbers_with_expiration",
        "/api/products/inventoryItems/lotNumbersWithExpirationDate",
        {"productId": "{product:AX738}"},
    ),
    # ProductClassificationApiController
    (
        "product_classification_list",
        "/api/facilities/{location:Main Warehouse}/products/classifications",
        {},
    ),
    # ProductSupplierApiController (read-only endpoints; CRUD covered in flows)
    ("product_supplier_list", "/api/productSuppliers", {"max": "10"}),
    ("product_supplier_export", "/api/productSuppliers/export", {}),
    # ProductsConfigurationApiController
    ("products_configuration_categories_count", "/api/productsConfiguration/categoriesCount", {}),
    ("products_configuration_category_options", "/api/productsConfiguration/categoryOptions", {}),
    ("products_configuration_product_options", "/api/productsConfiguration/productOptions", {}),
    ("products_configuration_download_categories", "/api/productsConfiguration/downloadCategories", {}),
    (
        "products_configuration_download_category_template",
        "/api/productsConfiguration/downloadCategoryTemplate",
        {},
    ),
    # PurchaseOrderApiController
    ("purchase_order_list", "/api/purchaseOrders", {}),
    ("purchase_order_status_options", "/api/orderSummaryStatus", {}),
    # PutawayApiController
    ("putaway_list", "/api/putaways", {}),
    # ReasonCodeApiController
    ("reason_code_list", "/api/reasonCodes", {}),
    ("reason_code_list_adjust_inventory", "/api/reasonCodes", {"activityCode": "ADJUST_INVENTORY"}),
    ("reason_code_read", "/api/reasonCodes/CORRECTION", {}),
    # ReplenishmentApiController
    ("replenishment_list", "/api/replenishments", {}),
    ("replenishment_status_options", "/api/replenishments/statusOptions", {}),
    ("replenishment_requirements", "/api/requirements", {"location.id": "{location:Main Warehouse}"}),
    # SelectOptionsApiController
    ("select_options_category", "/api/categoryOptions", {}),
    ("select_options_catalog", "/api/catalogOptions", {}),
    ("select_options_product_group", "/api/productGroupOptions", {}),
    ("select_options_tag", "/api/tagOptions", {}),
    ("select_options_gl_account", "/api/glAccountOptions", {}),
    ("select_options_payment_term", "/api/paymentTermOptions", {}),
    ("select_options_users", "/api/users", {}),
    ("select_options_preference_type", "/api/preferenceTypeOptions", {}),
    ("select_options_rating_type_code", "/api/ratingTypeCodeOptions", {}),
    ("select_options_handling_requirements", "/api/handlingRequirementsOptions", {}),
    ("select_options_shipment_status_codes", "/api/stockMovements/shipmentStatusCodes", {}),
    # StockMovementApiController (read-only; create/read/delete covered in flows)
    (
        "stock_movement_list_outbound",
        "/api/stockMovements",
        {"direction": "OUTBOUND", "origin": "{location:Main Warehouse}", "max": "10"},
    ),
    (
        "stock_movement_list_inbound",
        "/api/stockMovements",
        {"direction": "INBOUND", "destination": "{location:Main Warehouse}", "max": "10"},
    ),
    ("stock_movement_requisition_status_codes", "/api/stockMovements/requisitionsStatusCodes", {}),
    (
        "stock_movement_pending_requisition_details",
        "/api/stockMovements/pendingRequisitionDetails",
        {"origin.id": "{location:Main Warehouse}", "product.id": "{product:AX738}"},
    ),
    (
        "stock_movement_shipped_items",
        "/api/stockMovements/shippedItems",
        {"destination": "{location:Boston Warehouse}"},
    ),
    (
        "stock_movement_pending_requisition_items",
        "/api/stockMovements/pendingRequisitionItems",
        {"origin": "{location:Main Warehouse}"},
    ),
    # StockTransferApiController
    (
        "stock_transfer_list",
        "/api/stockTransfers",
        {"location": "{location:Main Warehouse}"},
    ),
    ("stock_transfer_status_options", "/api/stockTransfers/statusOptions", {}),
    (
        "stock_transfer_candidates",
        "/api/stockTransfers/candidates",
        {"location.id": "{location:Main Warehouse}"},
    ),
    # StocklistApiController (read-only; CRUD covered in flows)
    ("stocklist_list", "/api/stocklists", {}),
    ("stocklist_export", "/api/stocklists/{stocklist:Chicago Monthly Replenishment}/export", {}),
    # StocklistItemApiController
    ("stocklist_item_available_stocklists", "/api/stocklistItems/availableStocklists", {}),
    # UnitOfMeasureApiController
    ("unit_of_measure_list", "/api/unitOfMeasures", {}),
    ("unit_of_measure_read", "/api/unitOfMeasures/EA", {}),
    ("unit_of_measure_currencies", "/api/unitOfMeasure/currencies", {}),
    ("unit_of_measure_options", "/api/unitOfMeasures/options", {"type": "QUANTITY"}),
]


@pytest.mark.parametrize("name,path,params", GET_CASES, ids=[c[0] for c in GET_CASES])
def test_get_endpoint(client, name, path, params):
    path = resolve(client, path)
    params = {k: resolve(client, v) for k, v in params.items()}
    resp = client.request("GET", path, params=params)
    doc = record_response(name, "GET", path, resp, params)
    check_snapshot(name, doc)
