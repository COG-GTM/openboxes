import {
  GL_ACCOUNT_API,
  GL_ACCOUNT_BY_ID,
  GL_ACCOUNT_TYPE_OPTIONS,
  GL_ACCOUNTS_OPTION,
} from 'api/urls';
import apiClient from 'utils/apiClient';

export default {
  getGlAccountOptions: (config) => apiClient.get(GL_ACCOUNTS_OPTION, config),
  getGlAccountTypeOptions: (config) => apiClient.get(GL_ACCOUNT_TYPE_OPTIONS, config),
  getGlAccounts: (config) => apiClient.get(GL_ACCOUNT_API, config),
  getGlAccount: (id) => apiClient.get(GL_ACCOUNT_BY_ID(id)),
  createGlAccount: (payload) => apiClient.post(GL_ACCOUNT_API, payload),
  updateGlAccount: (id, payload) => apiClient.put(GL_ACCOUNT_BY_ID(id), payload),
  deleteGlAccount: (id) => apiClient.delete(GL_ACCOUNT_BY_ID(id)),
};
