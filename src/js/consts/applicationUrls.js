/**
 * Definitions of APPLICATION URLs used for redirecting to pages
 * */
import { stringifyUrl } from 'query-string';

export const CONTEXT_PATH = window.CONTEXT_PATH ?? '/openboxes';

const ADMIN_URL = {
  base: `${CONTEXT_PATH}/admin`,
  index: () => `${ADMIN_URL.base}/index`,
  cache: () => `${ADMIN_URL.base}/cache`,
  controllerActions: () => `${ADMIN_URL.base}/controllerActions`,
  plugins: () => `${ADMIN_URL.base}/plugins`,
  sendMail: () => `${ADMIN_URL.base}/sendMail`,
  showSettings: () => `${ADMIN_URL.base}/showSettings`,
  showDatabaseStatus: () => `${ADMIN_URL.base}/showDatabaseStatus`,
  showDatabaseProcessList: () => `${ADMIN_URL.base}/showDatabaseProcessList`,
  showUpgrade: () => `${ADMIN_URL.base}/showUpgrade`,
  status: () => `${ADMIN_URL.base}/status`,
};

const DASHBOARD_URL = {
  base: `${CONTEXT_PATH}/dashboard`,
  chooseLocation: (id) => `${DASHBOARD_URL.base}/chooseLocation/${id}`,
};

const LOCATION_CONFIGURATION_URL = {
  base: `${CONTEXT_PATH}/locationsConfiguration`,
  create: () => `${LOCATION_CONFIGURATION_URL.base}/create`,
  edit: (id) => `${LOCATION_CONFIGURATION_URL.create()}/${id}`,
  upload: () => `${LOCATION_CONFIGURATION_URL.base}/upload`,
};

const PRODUCT_CONFIGURATION_URL = {
  base: `${CONTEXT_PATH}/productsConfiguration`,
  index: () => `${PRODUCT_CONFIGURATION_URL.base}/index`,
};

const PRODUCT_URL = {
  base: `${CONTEXT_PATH}/product`,
  list: () => `${PRODUCT_URL.base}/list`,
  create: () => `${PRODUCT_URL.base}/create`,
  edit: (id) => `${PRODUCT_URL.base}/edit/${id}`,
  importCSV: () => `${PRODUCT_URL.base}/importAsCsv`,
  addDocument: (id) => `${PRODUCT_URL.base}/addDocument/${id}`,
  batchEdit: () => `${PRODUCT_URL.base}/batchEdit`,
  batchEditProperties: () => `${PRODUCT_URL.base}/batchEditProperties`,
  mergeLogs: () => `${PRODUCT_URL.base}/productMergeLogs`,
  search: () => `${PRODUCT_URL.base}/search`,
  show: (id) => `${PRODUCT_URL.base}/show/${id}`,
  upnDatabase: () => `${PRODUCT_URL.base}/upnDatabase`,
  barcode: (data) => `${PRODUCT_URL.base}/barcode?data=${encodeURIComponent(data)}&width=100&height=10&format=CODE_128`,
};

const PRODUCT_ASSOCIATION_URL = {
  base: `${CONTEXT_PATH}/productAssociation`,
  list: () => `${PRODUCT_ASSOCIATION_URL.base}/list`,
  create: () => `${PRODUCT_ASSOCIATION_URL.base}/create`,
  edit: (id) => `${PRODUCT_ASSOCIATION_URL.base}/edit/${id}`,
  exportXls: () => `${PRODUCT_ASSOCIATION_URL.base}/list?format=xls`,
  show: (id) => `${PRODUCT_ASSOCIATION_URL.base}/show/${id}`,
};

const PRODUCT_CATALOG_URL = {
  base: `${CONTEXT_PATH}/productCatalog`,
  list: () => `${PRODUCT_CATALOG_URL.base}/list`,
  create: () => `${PRODUCT_CATALOG_URL.base}/create`,
  edit: (id) => `${PRODUCT_CATALOG_URL.base}/edit/${id}`,
  show: (id) => `${PRODUCT_CATALOG_URL.base}/show/${id}`,
  export: (id) => `${PRODUCT_CATALOG_URL.base}/exportProductCatalog/${id}`,
};

const PRODUCT_GROUP_URL = {
  base: `${CONTEXT_PATH}/productGroup`,
  list: () => `${PRODUCT_GROUP_URL.base}/list`,
  create: () => `${PRODUCT_GROUP_URL.base}/create`,
  edit: (id) => `${PRODUCT_GROUP_URL.base}/edit/${id}`,
  show: (id) => `${PRODUCT_GROUP_URL.base}/show/${id}`,
};

const LOCATION_URL = {
  base: `${CONTEXT_PATH}/location`,
  list: () => `${LOCATION_URL.base}/list`,
  create: () => `${LOCATION_URL.base}/edit`,
  edit: (id) => `${LOCATION_URL.base}/edit/${id}`,
  showBinLocations: (id) => `${LOCATION_URL.base}/showBinLocations/${id}`,
  showZoneLocations: (id) => `${LOCATION_URL.base}/showZoneLocations/${id}`,
  showContents: (id) => `${LOCATION_URL.base}/showContents/${id}`,
  uploadLogo: (id) => `${LOCATION_URL.base}/uploadLogo/${id}`,
  viewLogo: (id) => `${LOCATION_URL.base}/viewLogo/${id}`,
  exportBinLocations: (id) => `${LOCATION_URL.base}/exportBinLocations/${id}`,
};

const STOCK_MOVEMENT_URL = {
  base: `${CONTEXT_PATH}/stockMovement`,
  list: () => `${STOCK_MOVEMENT_URL.base}/list`,
  listInbound: () => `${STOCK_MOVEMENT_URL.list()}?direction=INBOUND`,
  listOutbound: () => `${STOCK_MOVEMENT_URL.list()}?direction=OUTBOUND`,
  listRequest: () => `${STOCK_MOVEMENT_URL.list()}?direction=OUTBOUND&sourceType=ELECTRONIC`,
  createInbound: () => `${STOCK_MOVEMENT_URL.base}/createInbound`,
  createOutbound: () => `${STOCK_MOVEMENT_URL.base}/createOutbound`,
  createRequest: () => `${STOCK_MOVEMENT_URL.base}/createRequest`,
  createCombinedShipments: () => `${STOCK_MOVEMENT_URL.base}/createCombinedShipments`,
  genericEdit: (id) => `${STOCK_MOVEMENT_URL.base}/edit/${id}`,
  editInbound: (id) => `${STOCK_MOVEMENT_URL.createInbound()}/${id}`,
  editOutbound: (id) => `${STOCK_MOVEMENT_URL.createOutbound()}/${id}`,
  editRequest: (id) => `${STOCK_MOVEMENT_URL.createRequest()}/${id}`,
  editCombinedShipments: (id) => `${STOCK_MOVEMENT_URL.createCombinedShipments()}/${id}`,
  show: (id) => `${STOCK_MOVEMENT_URL.base}/show/${id}`,
  importOutbound: () => `${STOCK_MOVEMENT_URL.base}/importOutboundStockMovement`,
  importCsv: (id) => `${STOCK_MOVEMENT_URL.base}/importCsv/${id}`,
  exportCsv: (id) => `${STOCK_MOVEMENT_URL.base}/exportCsv/${id}`,
  uploadDocuments: (id) => `${STOCK_MOVEMENT_URL.base}/uploadDocuments/${id}`,
  addComment: (id) => `${STOCK_MOVEMENT_URL.base}/addComment/${id}`,
  addDocument: (id) => `${STOCK_MOVEMENT_URL.base}/addDocument/${id}`,
  rollback: (id) => `${STOCK_MOVEMENT_URL.base}/rollback/${id}`,
  remove: (id) => `${STOCK_MOVEMENT_URL.base}/remove/${id}?show=true`,
  updateStatus: (id, status) => `${STOCK_MOVEMENT_URL.base}/updateStatus/${id}?status=${status}`,
};

const STOCK_REQUEST_URL = {
  base: `${CONTEXT_PATH}/stockRequest`,
  remove: (id) => `${STOCK_REQUEST_URL.base}/remove/${id}?show=true`,
  reject: (id) => `${STOCK_REQUEST_URL.base}/reject/${id}`,
  rollbackApproval: (id) => `${STOCK_REQUEST_URL.base}/rollbackApproval/${id}`,
};

const RECEIVING_URL = {
  base: `${CONTEXT_PATH}/partialReceiving`,
  createPartialReceiving: (shipmentId) => `${RECEIVING_URL.base}/create/${shipmentId}`,
  rollbackLastReceipt: (shipmentId) => `${RECEIVING_URL.base}/rollbackLastReceipt/${shipmentId}`,
};

const SHIPMENT_WORKFLOW_URL = {
  base: `${CONTEXT_PATH}/shipmentWorkflow`,
  list: () => `${SHIPMENT_WORKFLOW_URL.base}/list`,
  show: (id) => `${SHIPMENT_WORKFLOW_URL.base}/show/${id}`,
  edit: (id) => `${SHIPMENT_WORKFLOW_URL.base}/edit/${id}`,
  create: () => `${SHIPMENT_WORKFLOW_URL.base}/create`,
};

const INVOICE_URL = {
  base: `${CONTEXT_PATH}/invoice`,
  list: () => `${INVOICE_URL.base}/list`,
  create: () => `${INVOICE_URL.base}/create`,
  edit: (id) => `${INVOICE_URL.create()}/${id}`,
  show: (id) => `${INVOICE_URL.base}/show/${id}`,
  addDocument: (id) => `${INVOICE_URL.base}/addDocument/${id}`,
};

const PUTAWAY_URL = {
  base: `${CONTEXT_PATH}/putAway`,
  create: () => `${PUTAWAY_URL.base}/create`,
  edit: (id) => `${PUTAWAY_URL.create()}/${id}`,
};

const STOCK_TRANSFER_URL = {
  base: `${CONTEXT_PATH}/stockTransfer`,
  list: () => `${STOCK_TRANSFER_URL.base}/list`,
  erase: (id) => `${STOCK_TRANSFER_URL.base}/eraseStockTransfer/${id}`,
  create: () => `${STOCK_TRANSFER_URL.base}/create`,
  createOutbound: () => `${STOCK_TRANSFER_URL.base}/createOutboundReturn`,
  createInbound: () => `${STOCK_TRANSFER_URL.base}/createInboundReturn`,
  genericEdit: (id) => `${STOCK_TRANSFER_URL.base}/edit/${id}`,
  createById: (id) => `${STOCK_TRANSFER_URL.create()}/${id}`,
  edit: (id) => `${STOCK_TRANSFER_URL.base}/edit/${id}`,
  editOutbound: (id) => `${STOCK_TRANSFER_URL.createOutbound()}/${id}`,
  editInbound: (id) => `${STOCK_TRANSFER_URL.createInbound()}/${id}`,
  show: (id) => `${STOCK_TRANSFER_URL.base}/show/${id}`,
  print: (id) => `${STOCK_TRANSFER_URL.base}/print/${id}`,
};

const ORDER_URL = {
  base: `${CONTEXT_PATH}/order`,
  list: () => `${ORDER_URL.base}/list`,
  create: () => `${ORDER_URL.base}/create`,
  show: (id) => `${ORDER_URL.base}/show/${id}`,
  print: (id) => `${ORDER_URL.base}/print/${id}`,
  addComment: (id) => `${ORDER_URL.base}/addComment/${id}`,
  addDocument: (id) => `${ORDER_URL.base}/addDocument/${id}`,
  placeOrder: (id) => `${ORDER_URL.base}/placeOrder/${id}`,
  listOrderItems: () => `${ORDER_URL.base}/listOrderItems`,
  addAdjustment: (id) => `${ORDER_URL.base}/addAdjustment/${id}`,
  editAdjustment: (id) => `${ORDER_URL.base}/editAdjustment/${id}`,
  orderSummaryList: () => `${ORDER_URL.base}/orderSummaryList`,
  orderItemSummary: () => `${ORDER_URL.base}/orderItemSummary`,
  orderItemDetails: () => `${ORDER_URL.base}/orderItemDetails`,
};

const GOODS_RECEIPT_NOTE_URL = {
  base: `${CONTEXT_PATH}/goodsReceiptNote`,
  print: (id) => `${GOODS_RECEIPT_NOTE_URL.base}/print/${id}`,
};

const RECEIVE_ORDER_URL = {
  base: `${CONTEXT_PATH}/receiveOrderWorkflow`,
  receiveOrder: (id) => `${RECEIVE_ORDER_URL.base}/receiveOrder/${id}`,
};

const ORDER_ADJUSTMENT_TYPE_URL = {
  base: `${CONTEXT_PATH}/orderAdjustmentType`,
  list: () => `${ORDER_ADJUSTMENT_TYPE_URL.base}/list`,
  create: () => `${ORDER_ADJUSTMENT_TYPE_URL.base}/create`,
  edit: (id) => `${ORDER_ADJUSTMENT_TYPE_URL.base}/edit/${id}`,
};

const PAYMENT_TERM_URL = {
  base: `${CONTEXT_PATH}/paymentTerm`,
  list: () => `${PAYMENT_TERM_URL.base}/list`,
  create: () => `${PAYMENT_TERM_URL.base}/create`,
  edit: (id) => `${PAYMENT_TERM_URL.base}/edit/${id}`,
};

const PREFERENCE_TYPE_URL = {
  base: `${CONTEXT_PATH}/preferenceType`,
  list: () => `${PREFERENCE_TYPE_URL.base}/list`,
  create: () => `${PREFERENCE_TYPE_URL.base}/create`,
  edit: (id) => `${PREFERENCE_TYPE_URL.base}/edit/${id}`,
};

const PURCHASE_ORDER_URL = {
  base: `${CONTEXT_PATH}/purchaseOrder`,
  create: () => `${PURCHASE_ORDER_URL.base}/create`,
  edit: (id) => `${PURCHASE_ORDER_URL.base}/edit/${id}`,
  addItems: (id) => `${PURCHASE_ORDER_URL.base}/addItems/${id}`,
};

const INVENTORY_ITEM_URL = {
  base: `${CONTEXT_PATH}/inventoryItem`,
  showStockCard: (id, params = {}) => stringifyUrl({
    url: `${INVENTORY_ITEM_URL.base}/showStockCard/${id}`,
    query: { ...params },
  }),
  showLotNumbers: (id) => `${INVENTORY_ITEM_URL.base}/showLotNumbers/${id}`,
  showRecordInventory: (id) => `${INVENTORY_ITEM_URL.base}/showRecordInventory/${id}`,
  showGraph: (id) => `${INVENTORY_ITEM_URL.base}/showGraph/${id}`,
  editInventoryLevel: (id) => `${INVENTORY_ITEM_URL.base}/editInventoryLevel/${id}`,
  showTransactionLog: (id) => stringifyUrl({
    url: `${INVENTORY_ITEM_URL.base}/showTransactionLog`,
    query: { 'product.id': id },
  }),
};

const INVENTORY_BROWSER_URL = {
  base: `${CONTEXT_PATH}/inventoryBrowser`,
  list: () => `${INVENTORY_BROWSER_URL.base}/list`,
};

const INVENTORY_LEVEL_URL = {
  base: `${CONTEXT_PATH}/inventoryLevel`,
  list: () => `${INVENTORY_LEVEL_URL.base}/list`,
  create: () => `${INVENTORY_LEVEL_URL.base}/create`,
  show: (id) => `${INVENTORY_LEVEL_URL.base}/show/${id}`,
  edit: (id) => `${INVENTORY_LEVEL_URL.base}/edit/${id}`,
  exportCsv: () => `${INVENTORY_LEVEL_URL.base}/list?format=csv`,
};

const INVENTORY_URL = {
  base: `${CONTEXT_PATH}/inventory`,
  showTransaction: (id) => `${INVENTORY_URL.base}/showTransaction/${id}`,
  list: () => `${INVENTORY_URL.base}/list`,
  listLowStock: () => `${INVENTORY_URL.base}/listLowStock`,
  listExpiredStock: () => `${INVENTORY_URL.base}/listExpiredStock`,
  listExpiringStock: () => `${INVENTORY_URL.base}/listExpiringStock`,
  listDailyTransactions: () => `${INVENTORY_URL.base}/listDailyTransactions`,
  listTransactions: () => `${INVENTORY_URL.base}/listTransactions`,
  editTransaction: (id) => `${INVENTORY_URL.base}/editTransaction/${id}`,
  browse: () => `${INVENTORY_URL.base}/browse`,
  createTransaction: () => `${INVENTORY_URL.base}/create`,
  listReorderStock: () => `${INVENTORY_URL.base}/listReorderStock`,
  manage: () => `${INVENTORY_URL.base}/manage`,
  showProducts: () => `${INVENTORY_URL.base}/showProducts`,
  upload: () => `${INVENTORY_URL.base}/upload`,
  editBinLocation: (params) => stringifyUrl({
    url: `${INVENTORY_URL.base}/editBinLocation`,
    query: { ...params },
  }),
};

const INVENTORY_SNAPSHOT_URL = {
  base: `${CONTEXT_PATH}/inventorySnapshot`,
  list: () => `${INVENTORY_SNAPSHOT_URL.base}/list`,
  download: () => `${INVENTORY_SNAPSHOT_URL.base}/download`,
};

const TRANSACTION_ENTRY_URL = {
  base: `${CONTEXT_PATH}/transactionEntry`,
  edit: (id) => `${TRANSACTION_ENTRY_URL.base}/edit/${id}`,
};

const CONSUMPTION_URL = {
  base: `${CONTEXT_PATH}/consumption`,
  list: () => `${CONSUMPTION_URL.base}/list`,
  pivot: () => `${CONSUMPTION_URL.base}/pivot`,
};

const REQUISITION_TEMPLATE_URL = {
  base: `${CONTEXT_PATH}/requisitionTemplate`,
  list: () => `${REQUISITION_TEMPLATE_URL.base}/list`,
  create: () => `${REQUISITION_TEMPLATE_URL.base}/create`,
  show: (id) => `${REQUISITION_TEMPLATE_URL.base}/show/${id}`,
  edit: (id) => `${REQUISITION_TEMPLATE_URL.base}/edit/${id}`,
  batch: (id) => `${REQUISITION_TEMPLATE_URL.base}/batch/${id}`,
  editHeader: (id) => `${REQUISITION_TEMPLATE_URL.base}/editHeader/${id}`,
  export: (id) => `${REQUISITION_TEMPLATE_URL.base}/export/${id}`,
  sendMail: (id) => `${REQUISITION_TEMPLATE_URL.base}/sendMail/${id}`,
  clone: (id) => `${REQUISITION_TEMPLATE_URL.base}/clone/${id}`,
  publish: (id) => `${REQUISITION_TEMPLATE_URL.base}/publish/${id}`,
  unpublish: (id) => `${REQUISITION_TEMPLATE_URL.base}/unpublish/${id}`,
};

const STOCKLIST_URL = {
  base: `${CONTEXT_PATH}/stocklist`,
  pdf: (id) => `${STOCKLIST_URL.base}/renderPdf/${id}`,
  csv: (id) => `${STOCKLIST_URL.base}/generateCsv/${id}`,
  html: (id) => `${STOCKLIST_URL.base}/renderHtml/${id}`,
};

const REPLENISHMENT_URL = {
  base: `${CONTEXT_PATH}/replenishment`,
  create: () => `${REPLENISHMENT_URL.base}/create`,
  edit: (id) => `${REPLENISHMENT_URL.create()}/${id}`,
  print: (id) => `${REPLENISHMENT_URL.base}/print/${id}`,
};

const REPORT_URL = {
  base: `${CONTEXT_PATH}/report`,
  showForecastReport: () => `${REPORT_URL.base}/showForecastReport`,
  showOnOrderReport: () => `${REPORT_URL.base}/showOnOrderReport`,
  exportInventoryReport: () => `${REPORT_URL.base}/exportInventoryReport`,
  showInventoryByLocationReport: () => `${REPORT_URL.base}/showInventoryByLocationReport`,
  showPaginatedPackingListReport: () => `${REPORT_URL.base}/showPaginatedPackingListReport`,
  downloadShippingReport: () => `${REPORT_URL.base}/downloadShippingReport`,
  showBinLocationReport: (params = {}) => stringifyUrl({
    url: `${REPORT_URL.base}/showBinLocationReport`,
    query: params,
  }),
  showCycleCountReport: (params = {}) => stringifyUrl({
    url: `${REPORT_URL.base}/showCycleCountReport`,
    query: params,
  }),
};

const BUDGET_CODE_URL = {
  base: `${CONTEXT_PATH}/budgetCode`,
  list: () => `${BUDGET_CODE_URL.base}/list`,
  create: () => `${BUDGET_CODE_URL.base}/create`,
  edit: (id) => `${BUDGET_CODE_URL.base}/edit/${id}`,
};

const GL_ACCOUNT_URL = {
  base: `${CONTEXT_PATH}/glAccount`,
  list: () => `${GL_ACCOUNT_URL.base}/list`,
  create: () => `${GL_ACCOUNT_URL.base}/create`,
  edit: (id) => `${GL_ACCOUNT_URL.base}/edit/${id}`,
};

const GL_ACCOUNT_TYPE_URL = {
  base: `${CONTEXT_PATH}/glAccountType`,
  list: () => `${GL_ACCOUNT_TYPE_URL.base}/list`,
  create: () => `${GL_ACCOUNT_TYPE_URL.base}/create`,
  edit: (id) => `${GL_ACCOUNT_TYPE_URL.base}/edit/${id}`,
};

const DOCUMENT_URL = {
  base: `${CONTEXT_PATH}/document`,
  download: (id) => `${DOCUMENT_URL.base}/download/${id}`,
  list: () => `${DOCUMENT_URL.base}/list`,
  create: () => `${DOCUMENT_URL.base}/create`,
  edit: (id) => `${DOCUMENT_URL.base}/edit/${id}`,
  show: (id) => `${DOCUMENT_URL.base}/show/${id}`,
};

const AUTH_URL = {
  base: `${CONTEXT_PATH}/auth`,
  login: () => `${AUTH_URL.base}/login`,
  signup: () => `${AUTH_URL.base}/signup`,
  logout: () => `${AUTH_URL.base}/logout`,
};

const BATCH_URL = {
  base: `${CONTEXT_PATH}/batch`,
  importData: () => `${BATCH_URL.base}/importData`,
  downloadExcel: (type) => `${BATCH_URL.base}/downloadExcel?type=${type}`,
  downloadTemplate: (template) => `${BATCH_URL.base}/downloadTemplate?template=${template}`,
};

const LOCATION_GROUP_URL = {
  base: `${CONTEXT_PATH}/locationGroup`,
  list: () => `${LOCATION_GROUP_URL.base}/list`,
  create: () => `${LOCATION_GROUP_URL.base}/create`,
  edit: (id) => `${LOCATION_GROUP_URL.base}/edit/${id}`,
  show: (id) => `${LOCATION_GROUP_URL.base}/show/${id}`,
};

const EVENT_TYPE_URL = {
  base: `${CONTEXT_PATH}/eventType`,
  list: () => `${EVENT_TYPE_URL.base}/list`,
  create: () => `${EVENT_TYPE_URL.base}/create`,
  edit: (id) => `${EVENT_TYPE_URL.base}/edit/${id}`,
  show: (id) => `${EVENT_TYPE_URL.base}/show/${id}`,
};

const LOCALIZATION_URL = {
  base: `${CONTEXT_PATH}/localization`,
  list: () => `${LOCALIZATION_URL.base}/list`,
  create: () => `${LOCALIZATION_URL.base}/create`,
  edit: (id) => `${LOCALIZATION_URL.base}/edit/${id}`,
  show: (id) => `${LOCALIZATION_URL.base}/show/${id}`,
  export: (locale) => `${LOCALIZATION_URL.base}/export?locale=${locale}`,
};

const JOB_URL = {
  base: `${CONTEXT_PATH}/jobs`,
  show: (name) => `${JOB_URL.base}/show/${name}`,
  quartzList: () => `${CONTEXT_PATH}/quartz/list`,
  backgroundJobSettings: () => `${CONTEXT_PATH}/admin/showSettings#tab-5`,
};

const LOCATION_TYPE_URL = {
  base: `${CONTEXT_PATH}/locationType`,
  list: () => `${LOCATION_TYPE_URL.base}/list`,
  create: () => `${LOCATION_TYPE_URL.base}/create`,
  edit: (id) => `${LOCATION_TYPE_URL.base}/edit/${id}`,
  show: (id) => `${LOCATION_TYPE_URL.base}/show/${id}`,
};

const ORGANIZATION_URL = {
  base: `${CONTEXT_PATH}/organization`,
  list: () => `${ORGANIZATION_URL.base}/list`,
  create: () => `${ORGANIZATION_URL.base}/create`,
  edit: (id) => `${ORGANIZATION_URL.base}/edit/${id}`,
  show: (id) => `${ORGANIZATION_URL.base}/show/${id}`,
  download: (params) => stringifyUrl({
    url: `${ORGANIZATION_URL.base}/download`,
    query: params ?? {},
  }),
};

const PERSON_URL = {
  base: `${CONTEXT_PATH}/person`,
  list: () => `${PERSON_URL.base}/list`,
  create: () => `${PERSON_URL.base}/create`,
  edit: (id) => `${PERSON_URL.base}/edit/${id}`,
  show: (id) => `${PERSON_URL.base}/show/${id}`,
  convertPersonToUser: (id) => `${PERSON_URL.base}/convertPersonToUser/${id}`,
  convertUserToPerson: (id) => `${PERSON_URL.base}/convertUserToPerson/${id}`,
};

const SUPPLIER_URL = {
  base: `${CONTEXT_PATH}/supplier`,
  list: () => `${SUPPLIER_URL.base}/list`,
  show: (id) => `${SUPPLIER_URL.base}/show/${id}`,
  downloadPriceHistory: (params) => stringifyUrl({
    url: `${SUPPLIER_URL.base}/getPriceHistory`,
    query: { ...(params ?? {}), format: 'text/csv' },
  }),
};

const PARTY_URL = {
  base: `${CONTEXT_PATH}/party`,
  list: () => `${PARTY_URL.base}/list`,
  create: () => `${PARTY_URL.base}/create`,
  edit: (id) => `${PARTY_URL.base}/edit/${id}`,
  show: (id) => `${PARTY_URL.base}/show/${id}`,
};

const PARTY_ROLE_URL = {
  base: `${CONTEXT_PATH}/partyRole`,
  list: () => `${PARTY_ROLE_URL.base}/list`,
  create: (partyId) => stringifyUrl({
    url: `${PARTY_ROLE_URL.base}/create`,
    query: partyId ? { partyId } : {},
  }),
  edit: (id) => `${PARTY_ROLE_URL.base}/edit/${id}`,
  show: (id) => `${PARTY_ROLE_URL.base}/show/${id}`,
};

const MIGRATION_URL = {
  base: `${CONTEXT_PATH}/migration`,
  index: () => `${MIGRATION_URL.base}/index`,
  dataQuality: () => `${MIGRATION_URL.base}/dataQuality`,
  dataMigration: () => `${MIGRATION_URL.base}/dataMigration`,
  dimensionTables: () => `${MIGRATION_URL.base}/dimensionTables`,
  factTables: () => `${MIGRATION_URL.base}/factTables`,
  legacy: () => `${MIGRATION_URL.base}/legacy`,
  materializedViews: () => `${MIGRATION_URL.base}/materializedViews`,
  productAvailability: () => `${MIGRATION_URL.base}/productAvailability`,
  compareProductAvailability: (locationId, showAll) => stringifyUrl({
    url: `${MIGRATION_URL.base}/compareProductAvailability`,
    query: { 'location.id': locationId, ...(showAll ? { showAll: true } : {}) },
  }),
};

const PARTY_TYPE_URL = {
  base: `${CONTEXT_PATH}/partyType`,
  list: () => `${PARTY_TYPE_URL.base}/list`,
  create: () => `${PARTY_TYPE_URL.base}/create`,
  edit: (id) => `${PARTY_TYPE_URL.base}/edit/${id}`,
  show: (id) => `${PARTY_TYPE_URL.base}/show/${id}`,
};

const CATEGORY_URL = {
  base: `${CONTEXT_PATH}/category`,
  tree: (id) => (id ? `${CATEGORY_URL.base}/tree?id=${id}` : `${CATEGORY_URL.base}/tree`),
  create: () => `${CATEGORY_URL.base}/create`,
  edit: (id) => `${CATEGORY_URL.base}/edit/${id}`,
};

const ATTRIBUTE_URL = {
  base: `${CONTEXT_PATH}/attribute`,
  list: () => `${ATTRIBUTE_URL.base}/list`,
  create: () => `${ATTRIBUTE_URL.base}/create`,
  edit: (id) => `${ATTRIBUTE_URL.base}/edit/${id}`,
  show: (id) => `${ATTRIBUTE_URL.base}/show/${id}`,
};

const PRODUCT_SUPPLIER_URL = {
  base: `${CONTEXT_PATH}/productSupplier`,
  list: () => `${PRODUCT_SUPPLIER_URL.base}/list`,
  create: () => `${PRODUCT_SUPPLIER_URL.base}/create`,
  edit: (id) => `${PRODUCT_SUPPLIER_URL.base}/create/${id}`,
  show: (id) => `${PRODUCT_SUPPLIER_URL.base}/show/${id}`,
  export: () => `${PRODUCT_SUPPLIER_URL.base}/export?format=xls`,
};

const PRODUCT_TYPE_URL = {
  base: `${CONTEXT_PATH}/productType`,
  list: () => `${PRODUCT_TYPE_URL.base}/list`,
  create: () => `${PRODUCT_TYPE_URL.base}/create`,
  edit: (id) => `${PRODUCT_TYPE_URL.base}/edit/${id}`,
  show: (id) => `${PRODUCT_TYPE_URL.base}/show/${id}`,
};

const TAG_URL = {
  base: `${CONTEXT_PATH}/tag`,
  list: () => `${TAG_URL.base}/list`,
  create: () => `${TAG_URL.base}/create`,
  edit: (id) => `${TAG_URL.base}/edit/${id}`,
  show: (id) => `${TAG_URL.base}/show/${id}`,
};

const UNIT_OF_MEASURE_CONVERSION_URL = {
  base: `${CONTEXT_PATH}/unitOfMeasureConversion`,
  list: () => `${UNIT_OF_MEASURE_CONVERSION_URL.base}/list`,
  create: () => `${UNIT_OF_MEASURE_CONVERSION_URL.base}/create`,
  edit: (id) => `${UNIT_OF_MEASURE_CONVERSION_URL.base}/edit/${id}`,
};

const USER_URL = {
  base: `${CONTEXT_PATH}/user`,
  list: () => `${USER_URL.base}/list`,
  create: () => `${USER_URL.base}/create`,
  show: (id) => `${USER_URL.base}/show/${id}`,
  edit: (id) => `${USER_URL.base}/edit/${id}`,
  changePhoto: (id) => `${USER_URL.base}/changePhoto/${id}`,
  cropPhoto: (id) => `${USER_URL.base}/cropPhoto/${id}`,
  viewPhoto: (id) => `${USER_URL.base}/viewPhoto/${id}`,
  viewThumb: (id) => `${USER_URL.base}/viewThumb/${id}`,
  impersonate: (id) => `${USER_URL.base}/impersonate/${id}`,
  toggleActivation: (id) => `${USER_URL.base}/toggleActivation/${id}`,
  sendTestEmail: (id) => `${USER_URL.base}/sendTestEmail/${id}`,
};

const ROLE_URL = {
  base: `${CONTEXT_PATH}/role`,
  list: () => `${ROLE_URL.base}/index`,
  create: () => `${ROLE_URL.base}/create`,
  show: (id) => `${ROLE_URL.base}/show/${id}`,
  edit: (id) => `${ROLE_URL.base}/edit/${id}`,
};

const REQUISITION_URL = {
  base: `${CONTEXT_PATH}/requisition`,
  list: () => `${REQUISITION_URL.base}/list`,
  create: (type) => stringifyUrl({
    url: `${REQUISITION_URL.base}/create`,
    query: type ? { type } : {},
  }),
  chooseTemplate: () => `${REQUISITION_URL.base}/chooseTemplate`,
  createStockFromTemplate: (id) => stringifyUrl({
    url: `${REQUISITION_URL.base}/createStockFromTemplate`,
    query: { id },
  }),
  show: (id) => `${REQUISITION_URL.base}/show/${id}`,
  edit: (id) => `${REQUISITION_URL.base}/edit/${id}`,
  editHeader: (id) => `${REQUISITION_URL.base}/editHeader/${id}`,
  review: (id) => `${REQUISITION_URL.base}/review/${id}`,
  picked: (id) => `${REQUISITION_URL.base}/picked/${id}`,
  createStock: (templateId) => stringifyUrl({
    url: `${REQUISITION_URL.base}/createStock`,
    query: templateId ? { templateId } : {},
  }),
  createNonStock: () => `${REQUISITION_URL.base}/createNonStock`,
  exportRequisitions: (params = {}) => stringifyUrl({
    url: `${REQUISITION_URL.base}/exportRequisitions`,
    query: { ...params },
  }),
  exportRequisitionItems: (params = {}) => stringifyUrl({
    url: `${REQUISITION_URL.base}/exportRequisitionItems`,
    query: { ...params },
  }),
  pick: (id) => `${REQUISITION_URL.base}/pick/${id}`,
  process: (id) => `${REQUISITION_URL.base}/process/${id}`,
  confirm: (id) => `${REQUISITION_URL.base}/confirm/${id}`,
  transfer: (id) => `${REQUISITION_URL.base}/transfer/${id}`,
  printDraft: (id) => `${REQUISITION_URL.base}/printDraft/${id}`,
  addDocument: (id) => `${REQUISITION_URL.base}/addDocument/${id}`,
};

const REQUISITION_ITEM_URL = {
  base: `${CONTEXT_PATH}/requisitionItem`,
  change: (id) => `${REQUISITION_ITEM_URL.base}/change/${id}`,
  list: () => `${REQUISITION_ITEM_URL.base}/list`,
  export: (params = {}) => stringifyUrl({
    url: `${REQUISITION_ITEM_URL.base}/export`,
    query: { ...params },
  }),
};

const CREATE_SHIPMENT_URL = {
  base: `${CONTEXT_PATH}/createShipmentWorkflow`,
  details: (id, type) => stringifyUrl({
    url: id ? `${CREATE_SHIPMENT_URL.base}/details/${id}` : `${CREATE_SHIPMENT_URL.base}/details`,
    query: type ? { type } : {},
  }),
  tracking: (id) => `${CREATE_SHIPMENT_URL.base}/tracking/${id}`,
  packing: (id) => `${CREATE_SHIPMENT_URL.base}/packing/${id}`,
  picking: (id) => `${CREATE_SHIPMENT_URL.base}/picking/${id}`,
  sending: (id) => `${CREATE_SHIPMENT_URL.base}/sending/${id}`,
};

const SHIPMENT_SHOW_URL = {
  base: `${CONTEXT_PATH}/shipment`,
  show: (id) => `${SHIPMENT_SHOW_URL.base}/showDetails/${id}`,
  list: () => `${SHIPMENT_SHOW_URL.base}/list`,
  addComment: (id) => `${SHIPMENT_SHOW_URL.base}/addComment/${id}`,
  addDocument: (id) => `${SHIPMENT_SHOW_URL.base}/addDocument/${id}`,
  deleteShipment: (id) => `${SHIPMENT_SHOW_URL.base}/deleteShipment/${id}`,
  addEvent: (id) => `${SHIPMENT_SHOW_URL.base}/addEvent/${id}`,
  editEvent: (eventId, shipmentId) => `${SHIPMENT_SHOW_URL.base}/editEvent/${eventId}?shipmentId=${shipmentId}`,
  addToShipment: () => `${SHIPMENT_SHOW_URL.base}/addToShipment`,
  packingList: (id) => `${SHIPMENT_SHOW_URL.base}/showPackingList/${id}`,
  receive: (id) => `${SHIPMENT_SHOW_URL.base}/receiveShipment/${id}`,
  send: (id) => `${SHIPMENT_SHOW_URL.base}/sendShipment/${id}`,
};

const SHIPMENT_ITEM_URL = {
  base: `${CONTEXT_PATH}/shipmentItem`,
  list: () => `${SHIPMENT_ITEM_URL.base}/list`,
  create: () => `${SHIPMENT_ITEM_URL.base}/create`,
  show: (id) => `${SHIPMENT_ITEM_URL.base}/show/${id}`,
  edit: (id) => `${SHIPMENT_ITEM_URL.base}/edit/${id}`,
  pick: (id) => `${SHIPMENT_ITEM_URL.base}/pick/${id}`,
  split: (id) => `${SHIPMENT_ITEM_URL.base}/split/${id}`,
};

const DELIVERY_NOTE_URL = {
  base: `${CONTEXT_PATH}/deliveryNote`,
  print: (id) => `${DELIVERY_NOTE_URL.base}/print/${id}`,
  printOutboundReturn: (id) => `${DELIVERY_NOTE_URL.base}/printOutboundReturn/${id}`,
};

const PICKLIST_URL = {
  base: `${CONTEXT_PATH}/picklist`,
  print: (id) => `${PICKLIST_URL.base}/print/${id}`,
  returnPrint: (id) => `${PICKLIST_URL.base}/returnPrint/${id}`,
  pdf: (id) => `${PICKLIST_URL.base}/renderPdf/${id}`,
  returnPdf: (id) => `${PICKLIST_URL.base}/renderReturnPdf/${id}`,
};

const BARCODE_URL = {
  render: (data) => stringifyUrl({
    url: `${CONTEXT_PATH}/product/barcode`,
    query: {
      data, width: 100, height: 30, format: 'CODE_128',
    },
  }),
};

const DATA_EXPORT_URL = {
  base: `${CONTEXT_PATH}/dataExport`,
  render: (id, format) => stringifyUrl({
    url: `${DATA_EXPORT_URL.base}/render/${id}`,
    query: { format },
  }),
};

const CHOOSE_LOCATION_URL = {
  base: `${CONTEXT_PATH}/dashboard/chooseLocation`,
  list: () => CHOOSE_LOCATION_URL.base,
  select: (id, targetUri) => stringifyUrl({
    url: `${CHOOSE_LOCATION_URL.base}/${id}`,
    query: targetUri ? { targetUri } : {},
  }),
};

const ERROR_URL = {
  base: `${CONTEXT_PATH}/errors`,
  showError: () => `${ERROR_URL.base}/showError`,
  accessDenied: () => `${ERROR_URL.base}/handleForbidden`,
  dataAccess: () => `${ERROR_URL.base}/handleInvalidDataAccess`,
  methodNotAllowed: () => `${ERROR_URL.base}/handleMethodNotAllowed`,
  processError: () => `${CONTEXT_PATH}/errors/processError`,
};

const MOBILE_URL = {
  base: `${CONTEXT_PATH}/mobile`,
  index: () => `${MOBILE_URL.base}/index`,
  login: () => `${MOBILE_URL.base}/login`,
  productList: () => `${MOBILE_URL.base}/productList`,
  productDetails: (id) => `${MOBILE_URL.base}/productDetails/${id}`,
  outboundList: () => `${MOBILE_URL.base}/outboundList`,
  productImage: (imageId) => `${CONTEXT_PATH}/product/renderImage/${imageId}`,
  defaultProductImage: () => `${CONTEXT_PATH}/static/images/default-product.png`,
  defaultLogo: () => `${CONTEXT_PATH}/static/images/logo/logo_100.png`,
};

const CYCLE_COUNT = {
  base: `${CONTEXT_PATH}/inventory/cycleCount`,
  list: (tab) => `${CYCLE_COUNT.base}?tab=${tab}`,
  countStep: () => `${CYCLE_COUNT.base}/count`,
  resolveStep: () => `${CYCLE_COUNT.base}/resolve`,
};

export {
  ADMIN_URL,
  ATTRIBUTE_URL,
  AUTH_URL,
  BARCODE_URL,
  BATCH_URL,
  BUDGET_CODE_URL,
  CATEGORY_URL,
  CHOOSE_LOCATION_URL,
  CONSUMPTION_URL,
  CREATE_SHIPMENT_URL,
  CYCLE_COUNT,
  DASHBOARD_URL,
  DATA_EXPORT_URL,
  DELIVERY_NOTE_URL,
  DOCUMENT_URL,
  ERROR_URL,
  EVENT_TYPE_URL,
  GL_ACCOUNT_TYPE_URL,
  GL_ACCOUNT_URL,
  GOODS_RECEIPT_NOTE_URL,
  INVENTORY_BROWSER_URL,
  INVENTORY_ITEM_URL,
  INVENTORY_LEVEL_URL,
  INVENTORY_SNAPSHOT_URL,
  INVENTORY_URL,
  INVOICE_URL,
  JOB_URL,
  LOCALIZATION_URL,
  LOCATION_CONFIGURATION_URL,
  LOCATION_GROUP_URL,
  LOCATION_TYPE_URL,
  LOCATION_URL,
  MIGRATION_URL,
  MOBILE_URL,
  ORDER_ADJUSTMENT_TYPE_URL,
  ORDER_URL,
  ORGANIZATION_URL,
  PARTY_ROLE_URL,
  PARTY_TYPE_URL,
  PARTY_URL,
  PAYMENT_TERM_URL,
  PERSON_URL,
  PICKLIST_URL,
  PREFERENCE_TYPE_URL,
  PRODUCT_ASSOCIATION_URL,
  PRODUCT_CATALOG_URL,
  PRODUCT_CONFIGURATION_URL,
  PRODUCT_GROUP_URL,
  PRODUCT_SUPPLIER_URL,
  PRODUCT_TYPE_URL,
  PRODUCT_URL,
  PURCHASE_ORDER_URL,
  PUTAWAY_URL,
  RECEIVE_ORDER_URL,
  RECEIVING_URL,
  REPLENISHMENT_URL,
  REPORT_URL,
  REQUISITION_ITEM_URL,
  REQUISITION_TEMPLATE_URL,
  REQUISITION_URL,
  ROLE_URL,
  SHIPMENT_ITEM_URL,
  SHIPMENT_SHOW_URL,
  SHIPMENT_WORKFLOW_URL,
  STOCK_MOVEMENT_URL,
  STOCK_REQUEST_URL,
  STOCK_TRANSFER_URL,
  STOCKLIST_URL,
  SUPPLIER_URL,
  TAG_URL,
  TRANSACTION_ENTRY_URL,
  UNIT_OF_MEASURE_CONVERSION_URL,
  USER_URL,
};
