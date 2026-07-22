import {
  PREFERENCE_TYPE_API,
  PREFERENCE_TYPE_BY_ID,
  VALIDATION_CODE_OPTIONS,
} from 'api/urls';
import apiClient from 'utils/apiClient';

export default {
  getPreferenceTypes: (config) => apiClient.get(PREFERENCE_TYPE_API, config),
  getPreferenceType: (id, config) => apiClient.get(PREFERENCE_TYPE_BY_ID(id), config),
  createPreferenceType: (payload) => apiClient.post(PREFERENCE_TYPE_API, payload),
  updatePreferenceType: (id, payload) => apiClient.put(PREFERENCE_TYPE_BY_ID(id), payload),
  getValidationCodeOptions: (config) => apiClient.get(VALIDATION_CODE_OPTIONS, config),
};
