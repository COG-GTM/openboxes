import {
  PRODUCT_ACTIVITY_CODE_OPTIONS,
  PRODUCT_FIELD_OPTIONS,
  PRODUCT_TYPE_API,
  PRODUCT_TYPE_BY_ID,
} from 'api/urls';
import apiClient from 'utils/apiClient';

export default {
  getProductTypes: (config = {}) => apiClient.get(PRODUCT_TYPE_API, config),
  getProductType: (id) => apiClient.get(PRODUCT_TYPE_BY_ID(id)),
  createProductType: (payload) => apiClient.post(PRODUCT_TYPE_API, payload),
  updateProductType: (id, payload) => apiClient.put(PRODUCT_TYPE_BY_ID(id), payload),
  deleteProductType: (id) => apiClient.delete(PRODUCT_TYPE_BY_ID(id)),
  getProductActivityCodeOptions: () => apiClient.get(PRODUCT_ACTIVITY_CODE_OPTIONS),
  getProductFieldOptions: () => apiClient.get(PRODUCT_FIELD_OPTIONS),
};
