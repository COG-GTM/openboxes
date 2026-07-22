import {
  CATEGORY_API,
  CATEGORY_ASSIGNING_PARENT_TO_PRODUCT,
  CATEGORY_BY_ID,
  CATEGORY_DETAILS,
  CATEGORY_OPTIONS,
  CATEGORY_TREE,
} from 'api/urls';
import apiClient from 'utils/apiClient';

export default {
  getCategoryTree: () => apiClient.get(CATEGORY_TREE),
  getCategoryOptions: () => apiClient.get(CATEGORY_OPTIONS),
  getCategoryDetails: (id) => apiClient.get(CATEGORY_DETAILS(id)),
  createCategory: (payload) => apiClient.post(CATEGORY_API, payload),
  updateCategory: (id, payload) => apiClient.put(CATEGORY_BY_ID(id), payload),
  deleteCategory: (id) => apiClient.delete(CATEGORY_BY_ID(id)),
  updateAssigningParentToProduct: (enabled) =>
    apiClient.put(CATEGORY_ASSIGNING_PARENT_TO_PRODUCT, { enabled }),
};
