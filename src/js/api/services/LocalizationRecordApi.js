import {
  LOCALIZATION_RECORD_BY_ID,
  LOCALIZATION_RECORD_DETAILS,
} from 'api/urls';
import apiClient from 'utils/apiClient';

export default {
  getLocalization: (id) => apiClient.get(LOCALIZATION_RECORD_DETAILS(id)),
  deleteLocalization: (id) => apiClient.delete(LOCALIZATION_RECORD_BY_ID(id)),
};
