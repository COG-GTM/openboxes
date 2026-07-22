/**
 * Definitions of ENDPOINT URLs used for API calls
 * */

const API = '/api';
export const GENERIC_API = `${API}/generic`;
const { CONTEXT_PATH } = window;

// PURCHASE ORDER
export const PURCHASE_ORDER_API = `${API}/purchaseOrders`;
export const PURCHASE_ORDER_DELETE = (id) => `${PURCHASE_ORDER_API}/${id}`;
export const PURCHASE_ORDER_ROLLBACK_ORDER = (id) => `${PURCHASE_ORDER_API}/${id}/rollback`;

// STOCK MOVEMENT
export const STOCK_MOVEMENT_API = `${API}/stockMovements`;
export const STOCK_MOVEMENT_BY_ID = (id) => `${STOCK_MOVEMENT_API}/${id}`;
export const STOCK_MOVEMENT_PENDING_SHIPMENT_ITEMS = `${STOCK_MOVEMENT_API}/pendingRequisitionItems`;
export const STOCK_MOVEMENT_INCOMING_ITEMS = `${STOCK_MOVEMENT_API}/shippedItems`;
export const STOCK_MOVEMENT_UPDATE_STATUS = (id) => `${STOCK_MOVEMENT_API}/${id}/status`;
export const STOCK_MOVEMENT_UPDATE_INVENTORY_ITEMS = (id) => `${STOCK_MOVEMENT_BY_ID(id)}/updateInventoryItems`;
export const STOCK_MOVEMENT_UPDATE_REQUISITION = (id) => `${STOCK_MOVEMENT_API}/${id}/updateRequisition`;
export const STOCK_MOVEMENT_ROLLBACK_APPROVAL = (id) => `${STOCK_MOVEMENT_API}/${id}/rollbackApproval`;
export const STOCK_MOVEMENT_ITEMS = (id) => `${STOCK_MOVEMENT_BY_ID(id)}/stockMovementItems`;
export const STOCK_MOVEMENT_UPDATE_ITEMS = (id) => `${STOCK_MOVEMENT_BY_ID(id)}/updateItems`;
export const STOCK_MOVEMENT_REMOVE_ALL_ITEMS = (id) => `${STOCK_MOVEMENT_BY_ID(id)}/removeAllItems`;
export const STOCK_MOVEMENT_STATUS = (id) => `${STOCK_MOVEMENT_BY_ID(id)}/status`;
export const PICKLIST_ITEMS_EXPORT = (id) => `${STOCK_MOVEMENT_API}/exportPickListItems/${id}`;
export const PICKLIST_TEMPLATE_EXPORT = (id) => `${STOCK_MOVEMENT_API}/picklistTemplate/${id}`;
export const PACKLIST_TEMPLATE_EXPORT = (id) => `${STOCK_MOVEMENT_API}/packlistTemplate/${id}`;
export const PICKLIST_IMPORT = (id) => `${STOCK_MOVEMENT_API}/importPickListItems/${id}`;
export const PACKLIST_IMPORT = (id) => `${STOCK_MOVEMENT_API}/importPackListItems/${id}`;
export const PACKING_LIST_TEMPLATE = `${STOCK_MOVEMENT_API}/packingList/template`;
export const STOCK_MOVEMENT_UPDATE_SHIPMENT = (id) => `${STOCK_MOVEMENT_BY_ID(id)}/updateShipment`;
export const STOCK_MOVEMENT_UPLOAD_DOCUMENTS = (id) => `${STOCK_MOVEMENT_BY_ID(id)}/uploadDocuments`;
export const STOCK_MOVEMENT_DOCUMENTS = (id) => `${STOCK_MOVEMENT_BY_ID(id)}/documents`;

// STOCK MOVEMENT ITEMS
export const STOCK_MOVEMENT_ITEM_API = `${API}/stockMovementItems`;
export const STOCK_MOVEMENT_ITEM_BY_ID = (id) => `${STOCK_MOVEMENT_ITEM_API}/${id}`;
export const STOCK_MOVEMENT_ITEM_DETAILS = (id) => `${STOCK_MOVEMENT_ITEM_BY_ID(id)}/details`;
export const STOCK_MOVEMENT_ITEM_REMOVE = (id) => `${STOCK_MOVEMENT_ITEM_BY_ID(id)}/removeItem`;
export const STOCK_MOVEMENT_UPDATE_PICKLIST = (id) => `${STOCK_MOVEMENT_ITEM_BY_ID(id)}/updatePicklist`;
export const STOCK_MOVEMENT_CREATE_PICKLIST = (id) => `${STOCK_MOVEMENT_ITEM_BY_ID(id)}/createPicklist`;
export const STOCK_MOVEMENT_ITEM_REVERT_PICK = (id) => `${STOCK_MOVEMENT_ITEM_BY_ID(id)}/picklistItems`;

// STOCK TRANSFER
export const STOCK_TRANSFER_API = `${API}/stockTransfers`;
export const STOCK_TRANSFER_BY_ID = (id) => `${STOCK_TRANSFER_API}/${id}`;
export const STOCK_TRANSFER_REMOVE_ALL_ITEMS = (id) => `${STOCK_TRANSFER_BY_ID(id)}/removeAllItems`;
export const STOCK_TRANSFER_CANDIDATES = `${STOCK_TRANSFER_API}/candidates`;

// STOCK TRANSFER ITEMS
export const STOCK_TRANSFER_ITEM_API = `${API}/stockTransferItems`;
export const STOCK_TRANSFER_ITEM_BY_ID = (id) => `${STOCK_TRANSFER_ITEM_API}/${id}`;

// INVOICE
export const INVOICE_API = `${API}/invoices`;
export const INVOICE_BY_ID = (id) => `${INVOICE_API}/${id}`;
export const INVOICE_ITEMS = (id) => `${INVOICE_BY_ID(id)}/items`;
export const INVOICE_ITEM_CANDIDATES = (id) => `${INVOICE_BY_ID(id)}/invoiceItemCandidates`;
export const INVOICE_POST = (id) => `${INVOICE_BY_ID(id)}/post`;
export const INVOICE_SUBMIT = (id) => `${INVOICE_BY_ID(id)}/submit`;
export const INVOICE_ORDERS = (id) => `${INVOICE_BY_ID(id)}/orders`;
export const INVOICE_SHIPMENTS = (id) => `${INVOICE_BY_ID(id)}/shipments`;
export const REMOVE_INVOICE_ITEM = (id) => `${INVOICE_API}/${id}/removeItem`;
export const INVOICE_DETAILS = (id) => `${INVOICE_BY_ID(id)}/details`;
export const INVOICE_DOCUMENT_TYPES = `${INVOICE_API}/documentTypes`;
export const INVOICE_DOCUMENTS = (id) => `${INVOICE_BY_ID(id)}/documents`;
export const INVOICE_DOCUMENT_BY_ID = (id, documentId) => `${INVOICE_DOCUMENTS(id)}/${documentId}`;

// ORDER
export const ORDER_API = `${API}/orders`;
export const ORDER_BY_ID = (id) => `${ORDER_API}/${id}`;
export const ORDER_COMMENTS = (id) => `${ORDER_BY_ID(id)}/comments`;

// INVOICE ITEM
export const INVOICE_ITEM_API = `${API}/invoiceItems`;
export const VALIDATE_INVOICE_ITEM = (id) => `${INVOICE_ITEM_API}/${id}/validation`;

// PREPAYMENT INVOICE
export const PREPAYMENT_INVOICE_API = `${API}/prepaymentInvoices`;
export const PREPAYMENT_INVOICE_BY_ID = (id) => `${PREPAYMENT_INVOICE_API}/${id}`;
export const PREPAYMENT_INVOICE_INVOICE_ITEMS = (id) => `${PREPAYMENT_INVOICE_BY_ID(id)}/invoiceItems`;

// PREPAYMENT INVOICE ITEM
export const PREPAYMENT_INVOICE_ITEM_API = `${API}/prepaymentInvoiceItems`;
export const PREPAYMENT_INVOICE_ITEM_BY_ID = (id) => `${PREPAYMENT_INVOICE_ITEM_API}/${id}`;

// PRODUCT
export const PRODUCT_API = `${API}/products`;
export const PRODUCT_DETAILS = (id) => `${PRODUCT_API}/${id}/details`;
export const PRODUCT_DOCUMENTS = (id) => `${PRODUCT_API}/${id}/documents`;
export const PRODUCT_DOCUMENT_BY_ID = (id, documentId) => `${PRODUCT_API}/${id}/documents/${documentId}`;
export const PRODUCT_MERGE_LOGS = `${PRODUCT_API}/mergeLogs`;
export const PRODUCT_BATCH_EDIT = `${PRODUCT_API}/batchEdit`;
export const PRODUCT_VALIDATE_IMPORT = `${PRODUCT_API}/validateImport`;
export const PRODUCT_IMPORT_CSV = `${PRODUCT_API}/import`;
export const PRODUCT_TYPE_OPTIONS = `${API}/productTypeOptions`;
export const DOCUMENT_TYPE_OPTIONS = `${API}/documentTypeOptions`;
export const INVENTORY_ITEM = (productCode, lotNumber) => `${CONTEXT_PATH}/${PRODUCT_API}/${productCode}/inventoryItems/${lotNumber}`;
export const LOT_NUMBERS_WITH_EXPIRATION_DATE = `${PRODUCT_API}/inventoryItems/lotNumbersWithExpirationDate`;
export const AVAILABLE_ITEMS = `${PRODUCT_API}/availableItems`;

// STOCK LIST
export const STOCKLIST_API = `${API}/stocklists`;
export const STOCKLIST_EXPORT = (id) => `${STOCKLIST_API}/${id}/export`;
export const STOCKLIST_DELETE = (id) => `${STOCKLIST_API}/${id}`;
export const STOCKLIST_CLEAR = (id) => `${STOCKLIST_API}/${id}/clear`;
export const STOCKLIST_CLONE = (id) => `${STOCKLIST_API}/${id}/clone`;
export const STOCKLIST_PUBLISH = (id) => `${STOCKLIST_API}/${id}/publish`;
export const STOCKLIST_UNPUBLISH = (id) => `${STOCKLIST_API}/${id}/unpublish`;

// GL ACCOUNTS
export const GL_ACCOUNTS_OPTION = `${API}/glAccountOptions`;
export const GL_ACCOUNT_API = `${API}/glAccounts`;
export const GL_ACCOUNT_BY_ID = (id) => `${GL_ACCOUNT_API}/${id}`;
export const GL_ACCOUNT_TYPE_OPTIONS = `${API}/glAccountTypeOptions`;
export const GL_ACCOUNT_TYPE_API = `${API}/glAccountTypes`;
export const GL_ACCOUNT_TYPE_BY_ID = (id) => `${GL_ACCOUNT_TYPE_API}/${id}`;
export const GL_ACCOUNT_TYPE_CODE_OPTIONS = `${API}/glAccountTypeCodeOptions`;

// BUDGET CODES
export const BUDGET_CODE_API = `${API}/budgetCodes`;
export const BUDGET_CODE_BY_ID = (id) => `${BUDGET_CODE_API}/${id}`;

// PRODUCT GROUP
export const PRODUCT_GROUP_OPTION = `${API}/productGroupOptions`;

// SHIPMENT TYPES
export const SHIPMENT_TYPES = `${GENERIC_API}/shipmentType`;

// PAYMENT TERMS
export const PAYMENT_TERMS_OPTION = `${API}/paymentTermOptions`;

// USERS
export const USERS_OPTIONS = `${API}/users`;

// PREFERENCE TYPES
export const PREFERENCE_TYPE_OPTIONS = `${API}/preferenceTypeOptions`;

// RATING TYPES
export const RATING_TYPE_OPTIONS = `${API}/ratingTypeCodeOptions`;

// ATTRIBUTES
export const ATTRIBUTES = `${API}/attributes`;

// LOCATIONS
export const LOCATION_API = `${API}/locations`;
export const LOCATION_TYPES = `${LOCATION_API}/locationTypes`;
export const LOCATION_TEMPLATE = `${CONTEXT_PATH}${LOCATION_API}/template`;
export const LOCATION_IMPORT = `${CONTEXT_PATH}${LOCATION_API}/importCsv`;
export const LOCATION = (id) => `${LOCATION_API}/${id}`;
export const LOCATION_SEARCH_API = `${LOCATION_API}/search`;
export const LOCATION_SUPPORTED_ACTIVITIES = `${LOCATION_API}/supportedActivities`;
export const LOCATION_DETAILS = (id) => `${LOCATION_API}/${id}/details`;
export const LOCATION_BIN_LOCATIONS = (id) => `${LOCATION_API}/${id}/binLocations`;
export const LOCATION_ZONE_LOCATIONS = (id) => `${LOCATION_API}/${id}/zoneLocations`;
export const LOCATION_CONTENTS = (id) => `${LOCATION_API}/${id}/contents`;
export const LOCATION_LOGO = (id) => `${LOCATION_API}/${id}/logo`;
export const LOCATION_GROUPS_API = `${API}/locationGroups`;
export const LOCATION_GROUP_BY_ID = (id) => `${LOCATION_GROUPS_API}/${id}`;
export const LOCATION_GROUP_SEARCH_API = `${LOCATION_GROUPS_API}/search`;
export const LOCATION_GROUP_DETAILS = (id) => `${LOCATION_GROUPS_API}/${id}/details`;

// LOCATION TYPES
export const LOCATION_TYPE_API = `${API}/locationTypes`;
export const LOCATION_TYPE_BY_ID = (id) => `${LOCATION_TYPE_API}/${id}`;
export const LOCATION_TYPE_CODE_OPTIONS = `${API}/locationTypeCodeOptions`;

// PUTAWAY
export const PUTAWAY_GENERATE_PDF = (id) => `/putAway/generatePdf/${id}`;

// SUPPORT LINKS
export const SUPPORT_LINKS = `${CONTEXT_PATH}${API}/supportLinks`;

// COMBINED SHIPMENT ITEMS
export const COMBINED_SHIPMENT_ITEMS_API = `${API}/combinedShipmentItems`;
export const COMBINED_SHIPMENT_ITEMS_IMPORT_TEMPLATE = (id) => `${COMBINED_SHIPMENT_ITEMS_API}/importTemplate/${id}`;
export const COMBINED_SHIPMENT_ITEMS_EXPORT_TEMPLATE = `${COMBINED_SHIPMENT_ITEMS_API}/exportTemplate`;

export const HELPSCOUT_CONFIGURATION = `${CONTEXT_PATH}${API}/helpscout/configuration/`;

export const ENABLE_LOCALIZATION = `${CONTEXT_PATH}/user/enableLocalizationMode`;
export const DISABLE_LOCALIZATION = (languageCode) => {
  if (languageCode) {
    return `${CONTEXT_PATH}/user/disableLocalizationMode?locale=${languageCode}`;
  }
  return `${CONTEXT_PATH}/user/disableLocalizationMode`;
};

export const GLOBAL_SEARCH = (term) => `${CONTEXT_PATH}/dashboard/globalSearch?searchTerms=${term}`;

// ORGANIZATIONS
export const ORGANIZATION_API = `${API}/organizations`;

// PRODUCT SUPPLIER
export const PRODUCT_SUPPLIER_API = `${API}/productSuppliers`;
export const PRODUCT_SUPPLIER_BY_ID = (id) => `${PRODUCT_SUPPLIER_API}/${id}`;
export const PRODUCT_SUPPLIER_PREFERENCES_API = `${API}/productSupplierPreferences`;
export const PRODUCT_SUPPLIER_PREFERENCES_BY_ID = (id) => `${PRODUCT_SUPPLIER_PREFERENCES_API}/${id}`;
export const PRODUCT_SUPPLIER_EXPORT = `${PRODUCT_SUPPLIER_API}/export`;

// UNIT OF MEASURE
export const UNIT_OF_MEASURE_API = `${API}/unitOfMeasures`;
export const UNIT_OF_MEASURE_OPTIONS = `${UNIT_OF_MEASURE_API}/options`;
// Currencies don't use url in plural form, do not change it to UNIT_OF_MEASURE_API!
export const CURRENCIES_OPTIONS = `${API}/unitOfMeasure/currencies`;

// PRODUCT PACKAGE
export const PRODUCT_PACKAGE_API = `${API}/productPackages`;

// PRODUCT SUPPLIER PREFERENCE
export const PRODUCT_SUPPLIER_PREFERENCE_API = `${API}/productSupplierPreferences`;
export const PRODUCT_SUPPLIER_PREFERENCE_BATCH = `${PRODUCT_SUPPLIER_PREFERENCE_API}/batch`;

// PRODUCT SUPPLIER ATTRIBUTE
export const PRODUCT_SUPPLIER_ATTRIBUTE_API = `${API}/productSupplierAttributes`;
export const PRODUCT_SUPPLIER_ATTRIBUTE_BATCH = `${PRODUCT_SUPPLIER_ATTRIBUTE_API}/batch`;

// PRODUCT CLASSIFICATION
export const PRODUCT_CLASSIFICATIONS_API = (facilityId) => `${API}/facilities/${facilityId}/products/classifications`;

export const PICKLIST_API = `${API}/picklists`;
export const PICKLIST_CLEAR = (id) => `${PICKLIST_API}/${id}/items`;
export const PICKLIST_PRINT = (id) => `${PICKLIST_API}/print/${id}`;
export const PICKLIST_RETURN_PRINT = (id) => `${PICKLIST_API}/returnPrint/${id}`;

// REQUISITION (classic requisition flow)
export const REQUISITION_API = `${API}/requisitions`;
export const REQUISITION_BY_ID = (id) => `${REQUISITION_API}/${id}`;
export const REQUISITION_TEMPLATES = `${REQUISITION_API}/templates`;
export const REQUISITION_CONFIRM = (id) => `${REQUISITION_BY_ID(id)}/confirm`;
export const REQUISITION_DETAILS = (id) => `${REQUISITION_BY_ID(id)}/details`;
export const REQUISITION_DOCUMENTS = (id) => `${REQUISITION_BY_ID(id)}/documents`;
export const REQUISITION_DOCUMENT_TYPES = `${REQUISITION_API}/documentTypes`;

// FULL OUTBOUND IMPORT FEATURE
export const FULFILLMENT_API = `${API}/fulfillments`;
export const PACKING_LIST = `${CONTEXT_PATH}/packingList`;
export const IMPORT_PACKING_LIST = `${PACKING_LIST}/upload`;
export const FULFILLMENT_VALIDATION = `${FULFILLMENT_API}/validate`;

// SELECT OPTIONS
export const HANDLING_REQUIREMENTS_OPTIONS = `${API}/handlingRequirementsOptions`;

// INTERNAL LOCATIONS
export const INTERNAL_LOCATIONS = `${API}/internalLocations`;

// CYCLE COUNT
export const CYCLE_COUNT = (locationId) => `${API}/facilities/${locationId}/cycle-counts`;
export const CYCLE_COUNT_CANDIDATES = (locationId) => `${CYCLE_COUNT(locationId)}/candidates`;
export const CYCLE_COUNT_PENDING_REQUESTS = (locationId) => `${CYCLE_COUNT(locationId)}/requests/pending`;
export const CYCLE_COUNT_REQUESTS = (locationId) => `${CYCLE_COUNT(locationId)}/requests/batch`;
export const CYCLE_COUNT_START = (locationId, format) => `${CYCLE_COUNT(locationId)}/start/batch${format ? `?format=${format}` : ''}`;
export const CYCLE_COUNT_RECOUNT_START = (locationId, format) => `${CYCLE_COUNT(locationId)}/recount/start/batch${format ? `?format=${format}` : ''}`;
export const CYCLE_COUNT_ITEM = (locationId, itemId) => `${CYCLE_COUNT(locationId)}/items/${itemId}`;
export const CYCLE_COUNT_ITEMS = (locationId, cycleCountId) => `${CYCLE_COUNT(locationId)}/${cycleCountId}/items`;
export const CYCLE_COUNT_ITEMS_BATCH = (locationId, cycleCountId) => `${CYCLE_COUNT(locationId)}/${cycleCountId}/items/batch`;
// Root endpoint doesn't require the cycleCountId - we can send items from multiple cycle counts
export const CYCLE_COUNT_ITEMS_BATCH_ROOT = (locationId) => `${CYCLE_COUNT(locationId)}/items/batch`;
export const CYCLE_COUNT_SUBMIT_COUNT = (locationId, cycleCountId) => `${CYCLE_COUNT(locationId)}/${cycleCountId}/count`;
export const CYCLE_COUNT_SUBMIT_RECOUNT = (locationId, cycleCountId) => `${CYCLE_COUNT(locationId)}/${cycleCountId}/recount`;
export const CYCLE_COUNT_REFRESH_ITEMS = (locationId, cycleCountId, removeOutOfStockItemsImplicitly) => `${CYCLE_COUNT(locationId)}/${cycleCountId}/refresh${removeOutOfStockItemsImplicitly ? '?removeOutOfStockItemsImplicitly=true' : ''}`;
export const CYCLE_COUNT_ITEMS_IMPORT = (locationId) => `${CYCLE_COUNT(locationId)}/items/upload/count`;
export const CYCLE_COUNT_ITEMS_IMPORT_RECOUNT = (locationId) => `${CYCLE_COUNT(locationId)}/items/upload/recount`;
export const CYCLE_COUNT_REQUESTS_BATCH = (locationId) => `${CYCLE_COUNT(locationId)}/requests/batch`;

// REPORTING
export const REPORTS = `${API}/reports`;
export const CYCLE_COUNT_SUMMARY_REPORT = `${REPORTS}/cycle-count-summary`;
export const INVENTORY_AUDIT_SUMMARY_REPORT = `${REPORTS}/inventory-audit-summary`;
export const INVENTORY_AUDIT_SUMMARY_REPORT_CSV = `${INVENTORY_AUDIT_SUMMARY_REPORT}.csv`;
export const INVENTORY_TRANSACTIONS_SUMMARY = `${REPORTS}/inventory-transactions-summary`;
export const INVENTORY_TRANSACTIONS_SUMMARY_CSV = `${INVENTORY_TRANSACTIONS_SUMMARY}.csv`;

// INDICATORS
export const INDICATORS_REPORT = `${API}/reports/indicators`;

export const INDICATORS_PRODUCTS_INVENTORIED = `${INDICATORS_REPORT}/productsInventoried`;
export const INDICATORS_INVENTORY_SHRINKAGE = `${INDICATORS_REPORT}/inventoryShrinkage`;
export const INDICATORS_INVENTORY_ACCURACY = `${INDICATORS_REPORT}/inventoryAccuracy`;

// INVENTORY
export const INVENTORY_API = (id) => `${API}/facilities/${id}/inventories`;
export const REORDER_REPORT = (id) => `${INVENTORY_API(id)}/reorderReport`;
export const INVENTORY_SUMMARY = (id) => `${INVENTORY_API(id)}/summary`;
export const EXPIRED_STOCK = (id) => `${INVENTORY_API(id)}/expiredStock`;
export const EXPIRING_STOCK = (id) => `${INVENTORY_API(id)}/expiringStock`;

// TRANSACTIONS
export const TRANSACTION_API = `${API}/transactions`;
export const DAILY_TRANSACTIONS = `${TRANSACTION_API}/daily`;
export const TRANSACTION_TYPE_OPTIONS = `${TRANSACTION_API}/types`;
export const TRANSACTION_LOCATION_OPTIONS = `${TRANSACTION_API}/locationOptions`;
export const TRANSACTION_BY_ID = (id) => `${TRANSACTION_API}/${id}`;
export const TRANSACTION_ENTRY_BY_ID = (id, entryId) => `${TRANSACTION_API}/${id}/entries/${entryId}`;
export const EXPIRATION_HISTORY_REPORT = `${API}/inventories/expirationHistoryReport`;
export const INVENTORY_BROWSE = `${API}/inventories/browse`;
export const INVENTORY_TRANSACTION_CANDIDATES = `${API}/inventories/transactionCandidates`;
export const INVENTORY_BIN_LOCATION_DETAILS = `${API}/inventories/binLocationDetails`;
export const INVENTORY_ADJUST_STOCK = `${API}/inventories/adjustStock`;

// CONSUMPTION
export const CONSUMPTION_AGGREGATE = `${API}/consumption/aggregate`;
export const CONSUMPTION_SUMMARY = `${API}/consumption/summary`;

// STOCK ADJUSTMENTS
export const STOCK_ADJUSTMENTS_API = `${API}/stockAdjustments`;

// ATTRIBUTES
export const ATTRIBUTE_BY_ID = (id) => `${ATTRIBUTES}/${id}`;

// CATEGORIES
export const CATEGORY_API = `${API}/categories`;
export const CATEGORY_BY_ID = (id) => `${CATEGORY_API}/${id}`;
export const CATEGORY_TREE = `${CATEGORY_API}/tree`;
export const CATEGORY_OPTIONS = `${API}/categoryOptions`;
export const CATEGORY_DETAILS = (id) => `${CATEGORY_API}/${id}/details`;
export const CATEGORY_ASSIGNING_PARENT_TO_PRODUCT = `${CATEGORY_API}/assigningParentToProduct`;
export const UNIT_OF_MEASURE_CLASS_OPTIONS = `${GENERIC_API}/unitOfMeasureClass/`;
