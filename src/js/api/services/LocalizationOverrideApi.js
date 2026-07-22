import {
  LOCALE_OPTIONS,
  LOCALIZATION_OVERRIDE_API,
  LOCALIZATION_OVERRIDE_BY_ID,
  LOCALIZATION_OVERRIDE_IMPORT,
} from 'api/urls';
import apiClient from 'utils/apiClient';

export default {
  getLocalizations: (config) => apiClient.get(LOCALIZATION_OVERRIDE_API, config),
  getLocalization: (id) => apiClient.get(LOCALIZATION_OVERRIDE_BY_ID(id)),
  createLocalization: (payload) => apiClient.post(LOCALIZATION_OVERRIDE_API, payload),
  updateLocalization: (id, payload) => apiClient.put(LOCALIZATION_OVERRIDE_BY_ID(id), payload),
  deleteLocalization: (id) => apiClient.delete(LOCALIZATION_OVERRIDE_BY_ID(id)),
  importLocalizations: (formData) => apiClient.post(LOCALIZATION_OVERRIDE_IMPORT, formData),
  getLocaleOptions: () => apiClient.get(LOCALE_OPTIONS),
};
