import {
  PRODUCT_ASSOCIATION_API,
  PRODUCT_ASSOCIATION_BY_ID,
  PRODUCT_ASSOCIATION_TYPE_CODE_OPTIONS,
} from 'api/urls';
import apiClient from 'utils/apiClient';

export default {
  getProductAssociations: (config) => apiClient.get(PRODUCT_ASSOCIATION_API, config),
  getProductAssociation: (id) => apiClient.get(PRODUCT_ASSOCIATION_BY_ID(id)),
  createProductAssociation: (payload) => apiClient.post(PRODUCT_ASSOCIATION_API, payload),
  updateProductAssociation: (id, payload) => apiClient.put(PRODUCT_ASSOCIATION_BY_ID(id), payload),
  deleteProductAssociation: (id, mutualDelete) => apiClient.delete(PRODUCT_ASSOCIATION_BY_ID(id), {
    params: mutualDelete != null ? { mutualDelete } : {},
  }),
  getTypeCodeOptions: () => apiClient.get(PRODUCT_ASSOCIATION_TYPE_CODE_OPTIONS),
};
