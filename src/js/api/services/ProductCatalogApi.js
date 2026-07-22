import {
  PRODUCT_CATALOG_API,
  PRODUCT_CATALOG_BY_ID,
  PRODUCT_CATALOG_IMPORT_ITEMS,
  PRODUCT_CATALOG_ITEM_BY_ID,
  PRODUCT_CATALOG_ITEMS,
} from 'api/urls';
import apiClient from 'utils/apiClient';

export default {
  getProductCatalogs: (config) => apiClient.get(PRODUCT_CATALOG_API, config),
  getProductCatalog: (id) => apiClient.get(PRODUCT_CATALOG_BY_ID(id)),
  createProductCatalog: (payload) => apiClient.post(PRODUCT_CATALOG_API, payload),
  updateProductCatalog: (id, payload) => apiClient.put(PRODUCT_CATALOG_BY_ID(id), payload),
  deleteProductCatalog: (id) => apiClient.delete(PRODUCT_CATALOG_BY_ID(id)),
  addProductCatalogItem: (id, payload) => apiClient.post(PRODUCT_CATALOG_ITEMS(id), payload),
  removeProductCatalogItem: (id, itemId) =>
    apiClient.delete(PRODUCT_CATALOG_ITEM_BY_ID(id, itemId)),
  importProductCatalogItems: (id, formData) =>
    apiClient.post(PRODUCT_CATALOG_IMPORT_ITEMS(id), formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
};
