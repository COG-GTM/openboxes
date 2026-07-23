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
export const STOCK_MOVEMENT_RETURNS_SHOW = (id) => `${STOCK_MOVEMENT_BY_ID(id)}/returnsShow`;

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
export const STOCK_TRANSFER_DETAILS = (id) => `${STOCK_TRANSFER_BY_ID(id)}/details`;
export const STOCK_TRANSFER_PRINT = (id) => `${STOCK_TRANSFER_BY_ID(id)}/print`;

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
export const ORDER_PENDING_ITEMS = `${ORDER_API}/pendingItems`;
export const ORDER_DOCUMENT_TYPES = `${ORDER_API}/documentTypes`;
export const ORDER_DOCUMENTS = (id) => `${ORDER_BY_ID(id)}/documents`;
export const ORDER_ITEM_OPTIONS = (id) => `${ORDER_BY_ID(id)}/orderItemOptions`;
export const ORDER_DETAILS = (id) => `${ORDER_BY_ID(id)}/details`;
export const ORDER_ITEMS = (id) => `${ORDER_BY_ID(id)}/items`;
export const ORDER_SHIPMENTS = (id) => `${ORDER_BY_ID(id)}/shipments`;
export const ORDER_INVOICES = (id) => `${ORDER_BY_ID(id)}/invoices`;
export const ORDER_PRINT = (id) => `${ORDER_BY_ID(id)}/print`;
export const ORDER_RECEIVE = (id) => `${ORDER_BY_ID(id)}/receiveOrder`;
export const ORDER_ADJUSTMENTS = (id) => `${ORDER_BY_ID(id)}/adjustments`;
export const ORDER_ADJUSTMENT_BY_ID = (id, adjustmentId) => `${ORDER_ADJUSTMENTS(id)}/${adjustmentId}`;
export const ORDER_SUMMARIES = `${API}/orderSummaries`;
export const ORDER_ITEM_SUMMARIES = `${API}/orderItemSummaries`;
export const ORDER_ADJUSTMENT_TYPE_OPTIONS = `${API}/orderAdjustmentTypeOptions`;
export const ORDER_ADJUSTMENT_TYPE_API = `${API}/orderAdjustmentTypes`;
export const ORDER_ADJUSTMENT_TYPE_BY_ID = (id) => `${ORDER_ADJUSTMENT_TYPE_API}/${id}`;
export const ORDER_ADJUSTMENT_TYPE_CODE_OPTIONS = `${API}/orderAdjustmentTypeCodeOptions`;
export const BUDGET_CODE_OPTIONS = `${API}/budgetCodeOptions`;
export const ORDER_STATUS_OPTIONS = `${API}/orderStatusOptions`;
export const ORDER_SUMMARY_STATUS_OPTIONS = `${API}/orderSummaryStatusOptions`;

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
export const PRODUCT_SCREEN_SEARCH = `${PRODUCT_API}/productSearch`;
export const PRODUCT_UPN_DATABASE = `${PRODUCT_API}/upnDatabase`;
export const PRODUCT_ASSOCIATION_API = `${API}/productAssociations`;
export const PRODUCT_ASSOCIATION_BY_ID = (id) => `${PRODUCT_ASSOCIATION_API}/${id}`;
export const PRODUCT_ASSOCIATION_TYPE_CODE_OPTIONS = `${API}/productAssociationTypeCodeOptions`;
export const PRODUCT_CATALOG_API = `${API}/productCatalogs`;
export const PRODUCT_CATALOG_BY_ID = (id) => `${PRODUCT_CATALOG_API}/${id}`;
export const PRODUCT_CATALOG_ITEMS = (id) => `${PRODUCT_CATALOG_API}/${id}/items`;
export const PRODUCT_CATALOG_ITEM_BY_ID = (id, itemId) => `${PRODUCT_CATALOG_API}/${id}/items/${itemId}`;
export const PRODUCT_CATALOG_IMPORT_ITEMS = (id) => `${PRODUCT_CATALOG_API}/${id}/importItems`;
export const PRODUCT_IMPORT_CSV = `${PRODUCT_API}/import`;
export const PRODUCT_TYPE_OPTIONS = `${API}/productTypeOptions`;
export const DOCUMENT_TYPE_OPTIONS = `${API}/documentTypeOptions`;

// DOCUMENTS
export const DOCUMENT_API = `${API}/documents`;
export const DOCUMENT_BY_ID = (id) => `${DOCUMENT_API}/${id}`;
export const DOCUMENT_CONTENT = (id) => `${DOCUMENT_API}/${id}/content`;

// EVENT TYPES
export const EVENT_TYPE_API = `${API}/eventTypes`;
export const EVENT_TYPE_BY_ID = (id) => `${EVENT_TYPE_API}/${id}`;
export const EVENT_CODE_OPTIONS = `${API}/eventCodeOptions`;
export const INVENTORY_ITEM = (productCode, lotNumber) => `${CONTEXT_PATH}/${PRODUCT_API}/${productCode}/inventoryItems/${lotNumber}`;
export const LOT_NUMBERS_WITH_EXPIRATION_DATE = `${PRODUCT_API}/inventoryItems/lotNumbersWithExpirationDate`;
export const AVAILABLE_ITEMS = `${PRODUCT_API}/availableItems`;

// STOCK LIST
export const STOCKLIST_API = `${API}/stocklists`;
export const STOCKLIST_EXPORT = (id) => `${STOCKLIST_API}/${id}/export`;
export const STOCKLIST_DETAILS = (id) => `${STOCKLIST_API}/${id}/details`;
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
export const PRODUCT_GROUP_API = `${API}/productGroups`;
export const PRODUCT_GROUP_BY_ID = (id) => `${PRODUCT_GROUP_API}/${id}`;
export const PRODUCT_GROUP_PRODUCTS = (id) => `${PRODUCT_GROUP_API}/${id}/products`;
export const PRODUCT_GROUP_PRODUCT_BY_ID = (id, productId) => `${PRODUCT_GROUP_PRODUCTS(id)}/${productId}`;
export const PRODUCT_TYPE_API = `${API}/productTypes`;
export const PRODUCT_TYPE_BY_ID = (id) => `${PRODUCT_TYPE_API}/${id}`;
export const PRODUCT_ACTIVITY_CODE_OPTIONS = `${API}/productActivityCodeOptions`;
export const PRODUCT_FIELD_OPTIONS = `${API}/productFieldOptions`;

// TAGS
export const TAG_API = `${API}/tags`;
export const TAG_BY_ID = (id) => `${TAG_API}/${id}`;
export const TAG_PRODUCTS = (id) => `${TAG_API}/${id}/products`;
export const TAG_PRODUCT_BY_ID = (id, productId) => `${TAG_PRODUCTS(id)}/${productId}`;

// SHIPMENT TYPES
export const SHIPMENT_TYPES = `${GENERIC_API}/shipmentType`;

// PAYMENT TERMS
export const PAYMENT_TERMS_OPTION = `${API}/paymentTermOptions`;
export const PAYMENT_TERM_API = `${API}/paymentTerms`;
export const PAYMENT_TERM_BY_ID = (id) => `${PAYMENT_TERM_API}/${id}`;

// USERS
export const USERS_OPTIONS = `${API}/users`;

// PREFERENCE TYPES
export const PREFERENCE_TYPE_OPTIONS = `${API}/preferenceTypeOptions`;
export const PREFERENCE_TYPE_API = `${API}/preferenceTypes`;
export const PREFERENCE_TYPE_BY_ID = (id) => `${PREFERENCE_TYPE_API}/${id}`;
export const VALIDATION_CODE_OPTIONS = `${API}/validationCodeOptions`;

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

// LOCALIZATION OVERRIDES
export const LOCALIZATION_OVERRIDE_API = `${API}/localizationOverrides`;
export const LOCALIZATION_OVERRIDE_BY_ID = (id) => `${LOCALIZATION_OVERRIDE_API}/${id}`;
export const LOCALIZATION_OVERRIDE_IMPORT = `${LOCALIZATION_OVERRIDE_API}/import`;
export const LOCALE_OPTIONS = `${API}/localeOptions`;

// ERRORS
export const ERROR_DETAILS_API = `${API}/errors/details`;

// JOBS
export const JOBS_DETAILS_API = `${API}/jobs/details`;
export const JOBS_TRIGGERS_API = `${API}/jobs/triggers`;
export const JOBS_LIST_API = `${API}/jobs/list`;
export const JOBS_PAUSE_API = `${API}/jobs/pause`;
export const JOBS_RESUME_API = `${API}/jobs/resume`;
export const JOBS_RUN_API = `${API}/jobs/run`;
export const JOBS_SCHEDULER_STANDBY_API = `${API}/jobs/scheduler/standby`;
export const JOBS_SCHEDULER_START_API = `${API}/jobs/scheduler/start`;

// MIGRATION (materialized views)
export const MIGRATION_API = `${API}/migration`;
export const MIGRATION_MATERIALIZED_VIEWS = `${MIGRATION_API}/materializedViews`;
export const MIGRATION_PRODUCT_AVAILABILITY = `${MIGRATION_API}/productAvailability`;
export const MIGRATION_PRODUCT_AVAILABILITY_COUNT = `${MIGRATION_API}/productAvailability/count`;
export const MIGRATION_PRODUCT_AVAILABILITY_CALCULATE = `${MIGRATION_API}/productAvailability/calculate`;
export const MIGRATION_PRODUCT_AVAILABILITY_REFRESH = `${MIGRATION_API}/productAvailability/refresh`;
export const MIGRATION_PRODUCT_DEMAND_REFRESH = `${MIGRATION_API}/productDemand/refresh`;

// ROLE
export const ROLE_BY_ID = (id) => `${API}/roles/${id}`;

// USER
export const USER_CREATE_API = `${API}/users/create`;
export const USER_DETAILS = (id) => `${API}/users/${id}/details`;
export const USER_PHOTO = (id) => `${API}/users/${id}/photo`;

// LOGIN LOCATIONS
export const LOGIN_LOCATIONS_API = `${API}/loginLocations`;

// LAST ERROR (general error screen: error details + report-a-bug mail config)
export const LAST_ERROR_API = `${API}/errors/lastError`;

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
export const ORGANIZATION_BY_ID = (id) => `${ORGANIZATION_API}/${id}`;
export const ORGANIZATION_SEARCH_API = `${ORGANIZATION_API}/search`;
export const ORGANIZATION_DETAILS = (id) => `${ORGANIZATION_API}/${id}/details`;
export const PARTY_TYPE_OPTIONS = `${API}/partyTypeOptions`;
export const PARTY_TYPE_CODE_OPTIONS = `${API}/partyTypeCodeOptions`;
export const ORGANIZATION_ROLE_TYPE_OPTIONS = `${API}/organizationRoleTypeOptions`;

// ADMIN
export const ADMIN_STATUS_API = `${API}/admin/status`;
export const ADMIN_UPGRADE_API = `${API}/admin/upgrade`;
export const ADMIN_UPGRADE_DOWNLOAD_API = `${ADMIN_UPGRADE_API}/download`;
export const ADMIN_UPGRADE_DEPLOY_API = `${ADMIN_UPGRADE_API}/deploy`;

// AUTH
export const AUTH_LOGIN_API = `${API}/auth/login`;
export const AUTH_SIGNUP_API = `${API}/auth/signup`;
export const AUTH_SIGNUP_CONFIG_API = `${API}/auth/signupConfig`;

// BATCH IMPORT
export const BATCH_IMPORT_DATA_API = `${API}/batch/importData`;

// ADMIN CONSOLE (Phase 2 Batch 40)
export const ADMIN_API = `${API}/admin`;
export const ADMIN_CONTROLLERS = `${ADMIN_API}/controllers`;
export const ADMIN_CONTROLLER_ACTIONS = `${ADMIN_API}/controllerActions`;
export const ADMIN_CACHE = `${ADMIN_API}/cache`;
export const ADMIN_CACHE_EVICT_DOMAIN = `${ADMIN_API}/cache/evictDomain`;
export const ADMIN_CACHE_EVICT_QUERIES = `${ADMIN_API}/cache/evictQueries`;
export const ADMIN_PLUGINS = `${ADMIN_API}/plugins`;
export const ADMIN_MAIL = `${ADMIN_API}/mail`;
export const ADMIN_SETTINGS = `${ADMIN_API}/settings`;
export const ADMIN_STOCK_ALERTS_TRIGGER = `${ADMIN_API}/stockAlerts/trigger`;

// PERSONS
export const PERSON_API = `${API}/persons`;
export const PERSON_BY_ID = (id) => `${PERSON_API}/${id}`;
export const PERSON_SEARCH_API = `${PERSON_API}/search`;
export const PERSON_DETAILS = (id) => `${PERSON_API}/${id}/details`;

// SUPPLIERS
export const SUPPLIER_API = `${API}/suppliers`;
export const SUPPLIER_SEARCH_API = `${SUPPLIER_API}/search`;
export const SUPPLIER_DETAILS = (id) => `${SUPPLIER_API}/${id}/details`;
export const SUPPLIER_PRICE_HISTORY = (id) => `${SUPPLIER_API}/${id}/priceHistory`;

// PARTIES
export const PARTY_API = `${API}/parties`;
export const PARTY_BY_ID = (id) => `${PARTY_API}/${id}`;
export const PARTY_SEARCH_API = `${PARTY_API}/search`;
export const PARTY_DETAILS = (id) => `${PARTY_API}/${id}/details`;
export const PARTY_ROLE_API = `${API}/partyRoles`;
export const PARTY_ROLE_BY_ID = (id) => `${PARTY_ROLE_API}/${id}`;
export const PARTY_ROLE_DETAILS = (id) => `${PARTY_ROLE_API}/${id}/details`;
export const PARTY_OPTIONS = `${API}/partyOptions`;
export const PARTY_TYPE_API = `${API}/partyTypes`;
export const PARTY_TYPE_BY_ID = (id) => `${PARTY_TYPE_API}/${id}`;
export const ROLE_TYPE_OPTIONS = `${API}/roleTypeOptions`;

// PRODUCT SUPPLIER
export const PRODUCT_SUPPLIER_API = `${API}/productSuppliers`;
export const PRODUCT_SUPPLIER_BY_ID = (id) => `${PRODUCT_SUPPLIER_API}/${id}`;
export const PRODUCT_SUPPLIER_PREFERENCES_API = `${API}/productSupplierPreferences`;
export const PRODUCT_SUPPLIER_PREFERENCES_BY_ID = (id) => `${PRODUCT_SUPPLIER_PREFERENCES_API}/${id}`;
export const PRODUCT_SUPPLIER_EXPORT = `${PRODUCT_SUPPLIER_API}/export`;
export const PRODUCT_SUPPLIER_DETAILS = (id) => `${PRODUCT_SUPPLIER_API}/${id}/details`;

// UNIT OF MEASURE
export const UNIT_OF_MEASURE_API = `${API}/unitOfMeasures`;
export const UNIT_OF_MEASURE_GENERIC_LIST = `${GENERIC_API}/unitOfMeasure/`;
export const UNIT_OF_MEASURE_CONVERSION_API = `${API}/unitOfMeasureConversions`;
export const UNIT_OF_MEASURE_CONVERSION_BY_ID = (id) => `${UNIT_OF_MEASURE_CONVERSION_API}/${id}`;
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
export const REQUISITION_REVIEW = (id) => `${REQUISITION_BY_ID(id)}/review`;
export const REQUISITION_PROCESS = (id) => `${REQUISITION_BY_ID(id)}/process`;
export const REQUISITION_ISSUE = (id) => `${REQUISITION_BY_ID(id)}/issue`;
export const REQUISITION_PRINT_DRAFT = (id) => `${REQUISITION_BY_ID(id)}/printDraft`;
export const PICKLIST_SAVE = `${API}/picklists`;

// REQUISITION ITEM (classic requisition flow)
export const REQUISITION_ITEM_API = `${API}/requisitionItems`;
export const REQUISITION_ITEM_BY_ID = (id) => `${REQUISITION_ITEM_API}/${id}`;
export const REQUISITION_ITEM_CHANGE_QUANTITY = (id) => `${REQUISITION_ITEM_BY_ID(id)}/changeQuantity`;
export const REQUISITION_ITEM_SUBSTITUTE = (id) => `${REQUISITION_ITEM_BY_ID(id)}/substitute`;
export const REQUISITION_ITEM_CANCEL = (id) => `${REQUISITION_ITEM_BY_ID(id)}/cancel`;
export const REQUISITION_ITEM_UNDO_CHANGES = (id) => `${REQUISITION_ITEM_BY_ID(id)}/undoChanges`;
export const REQUISITION_EDIT = (id) => `${REQUISITION_BY_ID(id)}/edit`;
export const REQUISITION_HEADER = (id) => `${REQUISITION_BY_ID(id)}/header`;
export const REQUISITION_ITEMS = (id) => `${REQUISITION_BY_ID(id)}/items`;
export const REQUISITION_PICK = (id) => `${REQUISITION_BY_ID(id)}/pick`;
export const REQUISITION_PICKLIST = (id) => `${REQUISITION_BY_ID(id)}/picklist`;
export const REQUISITION_PICKLIST_ITEMS = (id) => `${REQUISITION_BY_ID(id)}/picklistItems`;

// SHIPMENT (create shipment wizard, classic shipping flow)
export const SHIPMENT_API = `${API}/shipments`;
export const SHIPMENT_BY_ID = (id) => `${SHIPMENT_API}/${id}`;
export const SHIPMENT_WIZARD_OPTIONS = `${SHIPMENT_API}/wizardOptions`;
export const SHIPMENT_DETAILS = (id) => `${SHIPMENT_BY_ID(id)}/details`;
export const SHIPMENT_TRACKING = (id) => `${SHIPMENT_BY_ID(id)}/tracking`;
export const SHIPMENT_PACKING = (id) => `${SHIPMENT_BY_ID(id)}/packing`;
export const SHIPMENT_CONTAINERS = (id) => `${SHIPMENT_BY_ID(id)}/containers`;
export const SHIPMENT_CONTAINER_BY_ID = (id, containerId) => `${SHIPMENT_CONTAINERS(id)}/${containerId}`;
export const SHIPMENT_ITEMS = (id) => `${SHIPMENT_BY_ID(id)}/items`;
export const SHIPMENT_ITEM_BY_ID = (id, itemId) => `${SHIPMENT_ITEMS(id)}/${itemId}`;
export const SHIPMENT_ITEM_PICK = (id, itemId) => `${SHIPMENT_ITEM_BY_ID(id, itemId)}/pick`;
export const SHIPMENT_ITEM_SPLIT = (id, itemId) => `${SHIPMENT_ITEM_BY_ID(id, itemId)}/split`;
export const SHIPMENT_PICKLIST = (id) => `${SHIPMENT_BY_ID(id)}/picklist`;
export const SHIPMENT_VALIDATE_PICKLIST = (id) => `${SHIPMENT_BY_ID(id)}/validatePicklist`;
export const SHIPMENT_CLEAR_PICKLIST = (id) => `${SHIPMENT_BY_ID(id)}/clearPicklist`;
export const SHIPMENT_SEND = (id) => `${SHIPMENT_BY_ID(id)}/send`;
export const SHIPMENT_COMMENTS = (id) => `${SHIPMENT_BY_ID(id)}/comments`;
export const SHIPMENT_DOCUMENTS = (id) => `${SHIPMENT_BY_ID(id)}/documents`;
export const SHIPMENT_DOCUMENT_TYPES = `${SHIPMENT_API}/documentTypes`;
export const SHIPMENT_EVENTS = (id) => `${SHIPMENT_BY_ID(id)}/events`;
export const SHIPMENT_EVENT_BY_ID = (id, eventId) => `${SHIPMENT_EVENTS(id)}/${eventId}`;
export const SHIPMENT_EVENT_OPTIONS = `${SHIPMENT_API}/eventOptions`;
export const SHIPMENT_ADD_TO_SHIPMENT_CANDIDATES = `${SHIPMENT_API}/addToShipmentCandidates`;
export const SHIPMENT_ADD_TO_SHIPMENT = `${SHIPMENT_API}/addToShipment`;
export const SHIPMENT_LIST_OPTIONS = `${SHIPMENT_API}/listOptions`;
export const SHIPMENT_BULK_ACTION = `${SHIPMENT_API}/bulkAction`;
export const SHIPMENT_SHOW_DETAILS = (id) => `${SHIPMENT_BY_ID(id)}/showDetails`;
export const SHIPMENT_PACKING_LIST = (id) => `${SHIPMENT_BY_ID(id)}/packingList`;
export const SHIPMENT_RECEIPT = (id) => `${SHIPMENT_BY_ID(id)}/receipt`;
export const SHIPMENT_RECEIPT_ITEM = (id, receiptItemId) => `${SHIPMENT_RECEIPT(id)}/items/${receiptItemId}`;
export const SHIPMENT_RECEIPT_ITEM_SPLIT = (id, receiptItemId) => `${SHIPMENT_RECEIPT_ITEM(id, receiptItemId)}/split`;
export const SHIPMENT_RECEIPT_ITEM_PUTAWAY_LOCATIONS = (id, receiptItemId) => `${SHIPMENT_RECEIPT_ITEM(id, receiptItemId)}/putawayLocations`;
export const SHIPMENT_OUTBOUND_RETURN_PRINT = (id) => `${SHIPMENT_BY_ID(id)}/outboundReturnPrint`;
export const SHIPMENT_GOODS_RECEIPT_NOTE_PRINT = (id) => `${SHIPMENT_BY_ID(id)}/goodsReceiptNotePrint`;

// SHIPMENT ITEM (shipmentItem scaffold screens)
export const SHIPMENT_ITEM_API = `${API}/shipmentItems`;
export const SHIPMENT_ITEM_API_BY_ID = (id) => `${SHIPMENT_ITEM_API}/${id}`;
export const SHIPMENT_ITEM_OPTIONS = `${SHIPMENT_ITEM_API}/options`;
export const SHIPMENT_ITEM_CREATE_OPTIONS = `${SHIPMENT_ITEM_API}/createOptions`;
export const SHIPMENT_ITEM_PICK_CONTEXT = (id) => `${SHIPMENT_ITEM_API_BY_ID(id)}/pick`;
export const SHIPMENT_ITEM_SPLIT_BY_ID = (id) => `${SHIPMENT_ITEM_API_BY_ID(id)}/split`;

export const REQUISITION_DELIVERY_NOTE = (id) => `${REQUISITION_BY_ID(id)}/deliveryNote`;

// SHIPMENT WORKFLOW (migrated shipmentWorkflow list/show/edit screens)
export const SHIPMENT_WORKFLOW_API = `${API}/shipmentWorkflows`;
export const SHIPMENT_WORKFLOW_BY_ID = (id) => `${SHIPMENT_WORKFLOW_API}/${id}`;
export const SHIPMENT_WORKFLOW_OPTIONS = `${SHIPMENT_WORKFLOW_API}/options`;

// STOCK MOVEMENT DETAIL (migrated stockMovement show/addComment/addDocument screens)
export const STOCK_MOVEMENT_DETAILS = (id) => `${STOCK_MOVEMENT_BY_ID(id)}/details`;
export const STOCK_MOVEMENT_PACKING_LIST = (id) => `${STOCK_MOVEMENT_BY_ID(id)}/packingList`;
export const STOCK_MOVEMENT_RECEIPT_ITEMS = (id) => `${STOCK_MOVEMENT_BY_ID(id)}/receiptItems`;
export const STOCK_MOVEMENT_EVENTS = (id) => `${STOCK_MOVEMENT_BY_ID(id)}/events`;
export const STOCK_MOVEMENT_COMMENTS = (id) => `${STOCK_MOVEMENT_BY_ID(id)}/comments`;
export const STOCK_MOVEMENT_UPLOAD_DOCUMENT = (id) => `${STOCK_MOVEMENT_BY_ID(id)}/uploadDocument`;
export const STOCK_MOVEMENT_DOCUMENT_TYPES = `${STOCK_MOVEMENT_API}/documentTypes`;

// REQUISITION TEMPLATE (stock list template screens)
export const REQUISITION_TEMPLATE_API = `${API}/requisitionTemplates`;
export const REQUISITION_TEMPLATE_BY_ID = (id) => `${REQUISITION_TEMPLATE_API}/${id}`;
export const REQUISITION_TEMPLATE_HEADER = (id) => `${REQUISITION_TEMPLATE_BY_ID(id)}/header`;
export const REQUISITION_TEMPLATE_ITEMS = (id) => `${REQUISITION_TEMPLATE_BY_ID(id)}/items`;
export const REQUISITION_TEMPLATE_ITEM = (id, itemId) => `${REQUISITION_TEMPLATE_BY_ID(id)}/items/${itemId}`;
export const REQUISITION_TEMPLATE_UPDATE_ITEMS = (id) => `${REQUISITION_TEMPLATE_BY_ID(id)}/updateItems`;
export const REQUISITION_TEMPLATE_IMPORT_DATA = (id) => `${REQUISITION_TEMPLATE_BY_ID(id)}/importData`;
export const REQUISITION_TEMPLATE_IMPORT = (id) => `${REQUISITION_TEMPLATE_BY_ID(id)}/import`;
export const REQUISITION_TEMPLATE_ADD_PRODUCT_CODES = (id) => `${REQUISITION_TEMPLATE_BY_ID(id)}/addProductCodes`;
export const STOCKLIST_SEND_MAIL = (id) => `${STOCKLIST_API}/sendMail/${id}`;

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
export const REPORT_ON_ORDER_SUMMARY = `${REPORTS}/on-order-summary`;
export const REPORT_ON_ORDER_DETAILS = `${REPORTS}/on-order-details`;
export const REPORT_REQUEST_DETAILS = `${REPORTS}/request-details`;
export const REPORT_REQUEST_REASON_CODES = `${REPORTS}/request-reason-codes`;
export const REPORT_INVENTORY_BY_LOCATION = `${REPORTS}/inventory-by-location`;
export const REPORT_PACKING_LIST = `${REPORTS}/packing-list`;
export const REPORT_PACKING_LIST_SHIPMENTS = `${REPORTS}/packing-list-shipments`;
export const REPORT_TRANSACTION_REPORT = `${REPORTS}/transaction-report`;
export const REPORT_TRANSACTION_REPORT_METADATA = `${REPORTS}/transaction-report-metadata`;
export const REPORT_TRANSACTION_REPORT_DETAILS = `${REPORTS}/transaction-report-details`;
export const JSON_QOH_BY_PRODUCT_GROUP = '/json/getQuantityOnHandByProductGroup';
export const JSON_SUMMARY_BY_PRODUCT_GROUP = '/json/getSummaryByProductGroup';
export const JSON_REQUEST_DETAIL_REPORT = '/json/getRequestDetailReport';

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
export const INVENTORY_BIN_LOCATIONS = (id) => `${INVENTORY_API(id)}/binLocations`;
export const INVENTORY_UPLOAD = (id) => `${INVENTORY_API(id)}/upload`;
export const PRODUCTS_WITHOUT_DEFAULT_INVENTORY_ITEM = `${API}/inventories/productsWithoutDefaultInventoryItem`;
export const CREATE_DEFAULT_INVENTORY_ITEMS = `${API}/inventories/createDefaultInventoryItems`;
export const PRODUCT_GROUP_SUMMARY = (id) => `${INVENTORY_API(id)}/productGroupSummary`;

// STOCK CARD
export const STOCK_CARD_API = (id) => `${API}/stockCard/${id}`;
export const STOCK_CARD_SUMMARY = (id) => `${STOCK_CARD_API(id)}/summary`;
export const STOCK_CARD_STOCK_HISTORY = (id) => `${STOCK_CARD_API(id)}/stockHistory`;
export const STOCK_CARD_ALL_LOCATIONS = (id) => `${STOCK_CARD_API(id)}/allLocations`;
export const STOCK_CARD_PENDING_INBOUND = (id) => `${STOCK_CARD_API(id)}/pendingInbound`;
export const STOCK_CARD_PENDING_OUTBOUND = (id) => `${STOCK_CARD_API(id)}/pendingOutbound`;
export const STOCK_CARD_DEMAND = (id) => `${STOCK_CARD_API(id)}/demand`;
export const STOCK_CARD_SNAPSHOTS = (id) => `${STOCK_CARD_API(id)}/snapshots`;
export const STOCK_CARD_SUPPLIERS = (id) => `${STOCK_CARD_API(id)}/suppliers`;
export const STOCK_CARD_DOCUMENTS = (id) => `${STOCK_CARD_API(id)}/documents`;
export const STOCK_CARD_ASSOCIATIONS = (id) => `${STOCK_CARD_API(id)}/associations`;
export const STOCK_CARD_TRANSACTION_LOG = (id) => `${STOCK_CARD_API(id)}/transactionLog`;

// INVENTORY ITEMS (LOT NUMBERS)
export const INVENTORY_ITEMS_API = `${API}/inventoryItems`;
export const INVENTORY_ITEM_BY_ID = (id) => `${INVENTORY_ITEMS_API}/${id}`;
export const INVENTORY_ITEM_RECALL = (id) => `${INVENTORY_ITEMS_API}/${id}/recall`;
export const INVENTORY_ITEM_REVERT_RECALL = (id) => `${INVENTORY_ITEMS_API}/${id}/revertRecall`;
export const PRODUCT_INVENTORY_ITEMS = (productId) => `${API}/products/${productId}/allInventoryItems`;

// INVENTORY LEVEL
export const PRODUCT_INVENTORY_LEVEL = (facilityId, productId) => `${API}/facilities/${facilityId}/products/${productId}/inventoryLevel`;
export const INVENTORY_LEVELS_API = `${API}/inventoryLevels`;
export const INVENTORY_LEVEL_BY_ID = (id) => `${INVENTORY_LEVELS_API}/${id}`;

// RECORD STOCK
export const RECORD_STOCK = (facilityId) => `${API}/facilities/${facilityId}/inventory/record-stock`;
export const RECORD_STOCK_SAVE = (facilityId) => `${RECORD_STOCK(facilityId)}/save`;

// TRANSACTIONS
export const TRANSACTION_API = `${API}/transactions`;
export const DAILY_TRANSACTIONS = `${TRANSACTION_API}/daily`;
export const TRANSACTION_TYPE_OPTIONS = `${TRANSACTION_API}/types`;
export const TRANSACTION_LOCATION_OPTIONS = `${TRANSACTION_API}/locationOptions`;
export const TRANSACTION_BY_ID = (id) => `${TRANSACTION_API}/${id}`;
export const TRANSACTION_ENTRY_BY_ID = (id, entryId) => `${TRANSACTION_API}/${id}/entries/${entryId}`;
export const TRANSACTION_ENTRY_API_BY_ID = (id) => `${API}/transactionEntries/${id}`;

// INVENTORY SNAPSHOT
export const INVENTORY_SNAPSHOT_API = `${API}/inventorySnapshots`;

// REPLENISHMENT
export const REPLENISHMENT_PRINT = (id) => `${API}/replenishments/${id}/print`;
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

// LOCALIZATION RECORDS (Localization domain CRUD, not message lookup)
export const LOCALIZATION_RECORD_API = `${API}/localizations`;
export const LOCALIZATION_RECORD_BY_ID = (id) => `${LOCALIZATION_RECORD_API}/${id}`;
export const LOCALIZATION_RECORD_DETAILS = (id) => `${LOCALIZATION_RECORD_API}/${id}/details`;

// MIGRATION ADMIN DASHBOARD
export const MIGRATION_DATA_MIGRATION = `${MIGRATION_API}/dataMigration`;
export const MIGRATION_DATA_QUALITY = `${MIGRATION_API}/dataQuality`;
export const MIGRATION_RECEIPTS_WITHOUT_TRANSACTION = `${MIGRATION_API}/receiptsWithoutTransaction`;
export const MIGRATION_SHIPMENTS_WITHOUT_TRANSACTIONS = `${MIGRATION_API}/shipmentsWithoutTransactions`;
export const MIGRATION_STOCK_MOVEMENTS_WITHOUT_SHIPMENT_ITEMS = `${MIGRATION_API}/stockMovementsWithoutShipmentItems`;
export const MIGRATION_DIMENSION_TABLES = `${MIGRATION_API}/dimensionTables`;
export const MIGRATION_FACT_TABLES = `${MIGRATION_API}/factTables`;

// BATCH 37 REPORTS
export const REPORT_BIN_LOCATION = `${API}/reports/binLocationReport`;
export const REPORT_CYCLE_COUNT = `${API}/reports/cycleCountReport`;
export const REPORT_SHIPPING = (id) => `${API}/reports/shippingReport/${id}`;

// DATA EXPORT
export const DATA_EXPORT_API = `${API}/dataExports`;

// MOBILE
export const MOBILE_DASHBOARD = `${API}/mobile/dashboard`;
export const MOBILE_PRODUCT_SUMMARIES = `${API}/mobile/productSummaries`;
export const MOBILE_PRODUCT_SUMMARY_BY_ID = (id) => `${MOBILE_PRODUCT_SUMMARIES}/${id}`;
export const MOBILE_OUTBOUND_ITEMS = `${API}/mobile/outboundItems`;
