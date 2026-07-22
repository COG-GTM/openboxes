import { PRODUCT_GROUP_API, PRODUCT_GROUP_OPTION } from 'api/urls';
import apiClient from 'utils/apiClient';

export default {
  getProductGroupsOptions: () => apiClient.get(PRODUCT_GROUP_OPTION),
  createProductGroup: (payload) => apiClient.post(PRODUCT_GROUP_API, payload),
};
