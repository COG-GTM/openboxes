import {
  PRODUCT_ACTIVITY_CODE_OPTIONS,
  PRODUCT_FIELD_OPTIONS,
  PRODUCT_TYPE_API,
} from 'api/urls';
import apiClient from 'utils/apiClient';

export default {
  createProductType: (payload) => apiClient.post(PRODUCT_TYPE_API, payload),
  getProductActivityCodeOptions: () => apiClient.get(PRODUCT_ACTIVITY_CODE_OPTIONS),
  getProductFieldOptions: () => apiClient.get(PRODUCT_FIELD_OPTIONS),
};
