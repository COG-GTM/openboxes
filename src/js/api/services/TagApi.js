import {
  TAG_API,
  TAG_BY_ID,
  TAG_PRODUCT_BY_ID,
  TAG_PRODUCTS,
} from 'api/urls';
import apiClient from 'utils/apiClient';

export default {
  getTags: (config = {}) => apiClient.get(TAG_API, config),
  getTag: (id) => apiClient.get(TAG_BY_ID(id)),
  createTag: (payload) => apiClient.post(TAG_API, payload),
  updateTag: (id, payload) => apiClient.put(TAG_BY_ID(id), payload),
  deleteTag: (id) => apiClient.delete(TAG_BY_ID(id)),
  addProducts: (id, payload) => apiClient.post(TAG_PRODUCTS(id), payload),
  removeProduct: (id, productId) => apiClient.delete(TAG_PRODUCT_BY_ID(id, productId)),
};
