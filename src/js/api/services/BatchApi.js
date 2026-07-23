import { BATCH_IMPORT_DATA_API } from 'api/urls';
import apiClient from 'utils/apiClient';

export default {
  importData: (formData) => apiClient.post(BATCH_IMPORT_DATA_API, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
};
