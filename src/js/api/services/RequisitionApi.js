import {
  PICKLIST_PRINT,
  PICKLIST_RETURN_PRINT,
  REQUISITION_API,
  REQUISITION_BY_ID,
  REQUISITION_CONFIRM,
  REQUISITION_DETAILS,
  REQUISITION_DOCUMENT_TYPES,
  REQUISITION_DOCUMENTS,
  REQUISITION_TEMPLATES,
} from 'api/urls';
import apiClient from 'utils/apiClient';

export default {
  getRequisition: (id) => apiClient.get(REQUISITION_BY_ID(id)),
  createRequisition: (payload) => apiClient.post(REQUISITION_API, payload),
  confirmRequisition: (id) => apiClient.post(REQUISITION_CONFIRM(id)),
  saveRequisitionDetails: (id, payload) => apiClient.post(REQUISITION_DETAILS(id), payload),
  getRequisitionTemplates: () => apiClient.get(REQUISITION_TEMPLATES),
  getDocumentTypeOptions: () => apiClient.get(REQUISITION_DOCUMENT_TYPES),
  uploadDocument: (id, formData) => apiClient.post(REQUISITION_DOCUMENTS(id), formData, {
    headers: { 'content-type': 'multipart/form-data' },
  }),
  getPicklistPrint: (id) => apiClient.get(PICKLIST_PRINT(id)),
  getPicklistReturnPrint: (id) => apiClient.get(PICKLIST_RETURN_PRINT(id)),
};
