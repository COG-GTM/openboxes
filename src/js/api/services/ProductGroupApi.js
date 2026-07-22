import {
  PRODUCT_GROUP_API,
  PRODUCT_GROUP_BY_ID,
  PRODUCT_GROUP_OPTION,
  PRODUCT_GROUP_PRODUCT_BY_ID,
  PRODUCT_GROUP_PRODUCTS,
} from 'api/urls';
import apiClient from 'utils/apiClient';

export default {
  getProductGroupsOptions: () => apiClient.get(PRODUCT_GROUP_OPTION),
  getProductGroups: (config) => apiClient.get(PRODUCT_GROUP_API, config),
  createProductGroup: (payload) => apiClient.post(PRODUCT_GROUP_API, payload),
  getProductGroup: (id) => apiClient.get(PRODUCT_GROUP_BY_ID(id)),
  updateProductGroup: (id, payload) => apiClient.put(PRODUCT_GROUP_BY_ID(id), payload),
  deleteProductGroup: (id) => apiClient.delete(PRODUCT_GROUP_BY_ID(id)),
  addProduct: (id, payload) => apiClient.post(PRODUCT_GROUP_PRODUCTS(id), payload),
  removeProduct: (id, productId, isProductFamily) => apiClient.delete(
    PRODUCT_GROUP_PRODUCT_BY_ID(id, productId),
    { params: { isProductFamily } },
  ),
};
