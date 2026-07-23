import { DOCUMENT_API, DOCUMENT_TYPE_OPTIONS } from 'api/urls';
import apiClient from 'utils/apiClient';

export default {
  getDocumentTypeOptions: () => apiClient.get(DOCUMENT_TYPE_OPTIONS),
  createDocument: (formData) => apiClient.post(DOCUMENT_API, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
};
