import {
  DOCUMENT_API,
  DOCUMENT_BY_ID,
  DOCUMENT_CONTENT,
  DOCUMENT_TYPE_OPTIONS,
} from 'api/urls';
import apiClient from 'utils/apiClient';

export default {
  getDocuments: (config) => apiClient.get(DOCUMENT_API, config),
  getDocument: (id) => apiClient.get(DOCUMENT_BY_ID(id)),
  getDocumentTypeOptions: (config) => apiClient.get(DOCUMENT_TYPE_OPTIONS, config),
  createDocument: (formData) => apiClient.post(DOCUMENT_API, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  updateDocument: (id, payload) => apiClient.put(DOCUMENT_BY_ID(id), payload),
  deleteDocument: (id) => apiClient.delete(DOCUMENT_BY_ID(id)),
  uploadDocumentContent: (id, formData) => apiClient.post(DOCUMENT_CONTENT(id), formData),
};
