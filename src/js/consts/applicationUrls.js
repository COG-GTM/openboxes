/**
 * Definitions of APPLICATION URLs used for redirecting to pages
 * */
import { stringifyUrl } from 'query-string';

export const CONTEXT_PATH = window.CONTEXT_PATH ?? '/openboxes';

const DASHBOARD_URL = {
  base: `${CONTEXT_PATH}/dashboard`,
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
  create: () => `${REQUISITION_TEMPLATE_URL.base}/create`,
  show: (id) => `${REQUISITION_TEMPLATE_URL.base}/show/${id}`,
  edit: (id) => `${REQUISITION_TEMPLATE_URL.base}/edit/${id}`,
  batch: (id) => `${REQUISITION_TEMPLATE_URL.base}/batch/${id}`,
  editHeader: (id) => `${REQUISITION_TEMPLATE_URL.base}/editHeader/${id}`,
};

const STOCKLIST_URL = {
  base: `${CONTEXT_PATH}/stocklist`,
  pdf: (id) => `${STOCKLIST_URL.base}/renderPdf/${id}`,
  csv: (id) => `${STOCKLIST_URL.base}/generateCsv/${id}`,
};

const REPLENISHMENT_URL = {
  base: `${CONTEXT_PATH}/replenishment`,
  create: () => `${REPLENISHMENT_URL.base}/create`,
  edit: (id) => `${REPLENISHMENT_URL.create()}/${id}`,
  print: (id) => `${REPLENISHMENT_URL.base}/print/${id}`,
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
};

const LOCATION_GROUP_URL = {
  base: `${CONTEXT_PATH}/locationGroup`,
  list: () => `${LOCATION_GROUP_URL.base}/list`,
  create: () => `${LOCATION_GROUP_URL.base}/create`,
  edit: (id) => `${LOCATION_GROUP_URL.base}/edit/${id}`,
  show: (id) => `${LOCATION_GROUP_URL.base}/show/${id}`,
};

const LOCATION_TYPE_URL = {
  base: `${CONTEXT_PATH}/locationType`,
  list: () => `${LOCATION_TYPE_URL.base}/list`,
  create: () => `${LOCATION_TYPE_URL.base}/create`,
  edit: (id) => `${LOCATION_TYPE_URL.base}/edit/${id}`,
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
  export: () => `${PRODUCT_SUPPLIER_URL.base}/export?format=xls`,
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

const CYCLE_COUNT = {
  base: `${CONTEXT_PATH}/inventory/cycleCount`,
  list: (tab) => `${CYCLE_COUNT.base}?tab=${tab}`,
  countStep: () => `${CYCLE_COUNT.base}/count`,
  resolveStep: () => `${CYCLE_COUNT.base}/resolve`,
};

export {
  ATTRIBUTE_URL,
  BARCODE_URL,
  BUDGET_CODE_URL,
  CATEGORY_URL,
  CONSUMPTION_URL,
  CYCLE_COUNT,
  DASHBOARD_URL,
  DOCUMENT_URL,
  GL_ACCOUNT_TYPE_URL,
  GL_ACCOUNT_URL,
  INVENTORY_BROWSER_URL,
  INVENTORY_ITEM_URL,
  INVENTORY_SNAPSHOT_URL,
  INVENTORY_URL,
  INVOICE_URL,
  LOCATION_CONFIGURATION_URL,
  LOCATION_GROUP_URL,
  LOCATION_TYPE_URL,
  LOCATION_URL,
  ORDER_URL,
  PICKLIST_URL,
  PRODUCT_ASSOCIATION_URL,
  PRODUCT_CONFIGURATION_URL,
  PRODUCT_SUPPLIER_URL,
  PRODUCT_URL,
  PURCHASE_ORDER_URL,
  PUTAWAY_URL,
  REPLENISHMENT_URL,
  REQUISITION_ITEM_URL,
  REQUISITION_TEMPLATE_URL,
  REQUISITION_URL,
  STOCK_MOVEMENT_URL,
  STOCK_TRANSFER_URL,
  STOCKLIST_URL,
  TRANSACTION_ENTRY_URL,
};
