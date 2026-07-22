import axios from 'axios';
import queryString from 'query-string';

import {
  AVAILABLE_ITEMS,
  GENERIC_API,
  INVENTORY_ITEM,
  LOT_NUMBERS_WITH_EXPIRATION_DATE,
  PRODUCT_API,
  PRODUCT_BATCH_EDIT,
  PRODUCT_DETAILS,
  PRODUCT_DOCUMENT_BY_ID,
  PRODUCT_DOCUMENTS,
  PRODUCT_IMPORT_CSV,
  PRODUCT_MERGE_LOGS,
  PRODUCT_SCREEN_SEARCH,
  PRODUCT_UPN_DATABASE,
  PRODUCT_VALIDATE_IMPORT,
} from 'api/urls';
import apiClient from 'utils/apiClient';

export default {
  getProducts: (config) => apiClient.get(PRODUCT_API, config),
  getInventoryItem: (productId, lotNumber) => axios.get(INVENTORY_ITEM(productId, lotNumber)),
  // TODO: tech debt: Replace by the product api call instead of generic
  getProduct: (id) => apiClient.get(`${GENERIC_API}/product/${id}`),
  getLatestInventoryCountDate: (productIds) => apiClient.get(`${PRODUCT_API}/getLatestInventoryCountDate`, {
    params: {
      productIds,
    },
    paramsSerializer: (parameters) => queryString.stringify(parameters),
  }),
  getLotNumbersByProductIds: (productIds) =>
    apiClient.get(LOT_NUMBERS_WITH_EXPIRATION_DATE, {
      params: { productIds },
      paramsSerializer: (parameters) => queryString.stringify(parameters),
    }),
  availableItems: ({ locationId, productIds }) => apiClient.get(AVAILABLE_ITEMS, {
    params: {
      'product.id': productIds,
      'location.id': locationId,
    },
    paramsSerializer: (parameters) => queryString.stringify(parameters),

  }),
  getProductDetails: (id) => apiClient.get(PRODUCT_DETAILS(id)),
  updateProductDetails: (id, payload) => apiClient.put(PRODUCT_DETAILS(id), payload),
  getMergeLogs: (config) => apiClient.get(PRODUCT_MERGE_LOGS, config),
  getBatchEditProducts: (config) => apiClient.get(PRODUCT_BATCH_EDIT, config),
  batchSaveProducts: (payload) => apiClient.post(PRODUCT_BATCH_EDIT, payload),
  validateImportCsv: (csvText) => apiClient.post(PRODUCT_VALIDATE_IMPORT, csvText, {
    headers: { 'Content-Type': 'text/csv' },
  }),
  importCsv: (csvText, tags) => apiClient.post(PRODUCT_IMPORT_CSV, csvText, {
    headers: { 'Content-Type': 'text/csv' },
    params: tags ? { tags } : {},
  }),
  uploadDocument: (id, formData) => apiClient.post(PRODUCT_DOCUMENTS(id), formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  deleteDocument: (id, documentId) => apiClient.delete(PRODUCT_DOCUMENT_BY_ID(id, documentId)),
  getUpnDatabase: () => apiClient.get(PRODUCT_UPN_DATABASE),
  productSearch: (config) => apiClient.get(PRODUCT_SCREEN_SEARCH, config),
};
