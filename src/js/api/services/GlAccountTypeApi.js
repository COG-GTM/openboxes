import {
  GL_ACCOUNT_TYPE_API,
  GL_ACCOUNT_TYPE_BY_ID,
  GL_ACCOUNT_TYPE_CODE_OPTIONS,
} from 'api/urls';
import apiClient from 'utils/apiClient';

export default {
  getGlAccountTypes: (config) => apiClient.get(GL_ACCOUNT_TYPE_API, config),
  getGlAccountType: (id) => apiClient.get(GL_ACCOUNT_TYPE_BY_ID(id)),
  getGlAccountTypeCodeOptions: (config) => apiClient.get(GL_ACCOUNT_TYPE_CODE_OPTIONS, config),
  createGlAccountType: (payload) => apiClient.post(GL_ACCOUNT_TYPE_API, payload),
  updateGlAccountType: (id, payload) => apiClient.put(GL_ACCOUNT_TYPE_BY_ID(id), payload),
  deleteGlAccountType: (id) => apiClient.delete(GL_ACCOUNT_TYPE_BY_ID(id)),
};
