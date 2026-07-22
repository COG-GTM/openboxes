import {
  PICKLIST_PRINT,
  PICKLIST_RETURN_PRINT,
  PICKLIST_SAVE,
  REQUISITION_API,
  REQUISITION_BY_ID,
  REQUISITION_CONFIRM,
  REQUISITION_DETAILS,
  REQUISITION_DOCUMENT_TYPES,
  REQUISITION_DOCUMENTS,
  REQUISITION_EDIT,
  REQUISITION_HEADER,
  REQUISITION_ISSUE,
  REQUISITION_ITEM_API,
  REQUISITION_ITEM_BY_ID,
  REQUISITION_ITEM_CANCEL,
  REQUISITION_ITEM_CHANGE_QUANTITY,
  REQUISITION_ITEM_SUBSTITUTE,
  REQUISITION_ITEM_UNDO_CHANGES,
  REQUISITION_ITEMS,
  REQUISITION_PICK,
  REQUISITION_PICKLIST,
  REQUISITION_PICKLIST_ITEMS,
  REQUISITION_PRINT_DRAFT,
  REQUISITION_PROCESS,
  REQUISITION_REVIEW,
  REQUISITION_TEMPLATES,
} from 'api/urls';
import apiClient from 'utils/apiClient';

export default {
  getRequisition: (id) => apiClient.get(REQUISITION_BY_ID(id)),
  getRequisitions: (params) => apiClient.get(REQUISITION_API, { params }),
  editRequisition: (id) => apiClient.post(REQUISITION_EDIT(id)),
  updateRequisitionHeader: (id, payload) => apiClient.post(REQUISITION_HEADER(id), payload),
  saveRequisitionItems: (id, payload) => apiClient.post(REQUISITION_ITEMS(id), payload),
  pickRequisition: (id) => apiClient.post(REQUISITION_PICK(id)),
  updatePicklist: (id, payload) => apiClient.post(REQUISITION_PICKLIST(id), payload),
  updatePicklistItems: (id, payload) => apiClient.post(REQUISITION_PICKLIST_ITEMS(id), payload),
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
  reviewRequisition: (id) => apiClient.post(REQUISITION_REVIEW(id)),
  getRequisitionProcess: (id) => apiClient.get(REQUISITION_PROCESS(id)),
  issueRequisition: (id, payload) => apiClient.post(REQUISITION_ISSUE(id), payload),
  getRequisitionPrintDraft: (id) => apiClient.get(REQUISITION_PRINT_DRAFT(id)),
  savePicklist: (payload) => apiClient.post(PICKLIST_SAVE, payload),
  getRequisitionItem: (id) => apiClient.get(REQUISITION_ITEM_BY_ID(id)),
  getCanceledRequisitionItems: (params) => apiClient.get(REQUISITION_ITEM_API, {
    params,
    // Grails params.list() expects repeated keys (no [] suffix) for arrays
    paramsSerializer: (parameters) => {
      const searchParams = new URLSearchParams();
      Object.entries(parameters).forEach(([key, value]) => {
        if (value === null || value === undefined) return;
        if (Array.isArray(value)) {
          value.forEach((item) => searchParams.append(key, item));
          return;
        }
        searchParams.append(key, value);
      });
      return searchParams.toString();
    },
  }),
  changeRequisitionItemQuantity: (id, payload) =>
    apiClient.post(REQUISITION_ITEM_CHANGE_QUANTITY(id), payload),
  substituteRequisitionItem: (id, payload) =>
    apiClient.post(REQUISITION_ITEM_SUBSTITUTE(id), payload),
  cancelRequisitionItem: (id, payload) => apiClient.post(REQUISITION_ITEM_CANCEL(id), payload),
  undoRequisitionItemChanges: (id) => apiClient.post(REQUISITION_ITEM_UNDO_CHANGES(id)),
};
