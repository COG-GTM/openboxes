import {
  STOCK_MOVEMENT_API,
  STOCK_MOVEMENT_BY_ID,
  STOCK_MOVEMENT_COMMENTS,
  STOCK_MOVEMENT_DETAILS,
  STOCK_MOVEMENT_DOCUMENT_TYPES,
  STOCK_MOVEMENT_DOCUMENTS,
  STOCK_MOVEMENT_EVENTS,
  STOCK_MOVEMENT_ITEMS,
  STOCK_MOVEMENT_PACKING_LIST,
  STOCK_MOVEMENT_RECEIPT_ITEMS,
  STOCK_MOVEMENT_ROLLBACK_APPROVAL,
  STOCK_MOVEMENT_UPDATE_REQUISITION,
  STOCK_MOVEMENT_UPDATE_SHIPMENT,
  STOCK_MOVEMENT_UPDATE_STATUS,
  STOCK_MOVEMENT_UPLOAD_DOCUMENT,
} from 'api/urls';
import { STOCK_MOVEMENT_URL } from 'consts/applicationUrls';
import RequisitionStatus from 'consts/requisitionStatus';
import apiClient from 'utils/apiClient';

export default {
  createStockMovement: (payload) => apiClient.post(STOCK_MOVEMENT_API, payload),
  updateStockMovement: (id, payload) => apiClient.post(
    STOCK_MOVEMENT_UPDATE_REQUISITION(id), payload,
  ),
  getStockMovements: (config) => apiClient.get(STOCK_MOVEMENT_API, config),
  deleteStockMovement: (id) => apiClient.delete(STOCK_MOVEMENT_BY_ID(id)),
  updateStatus: (id, payload) => apiClient.post(STOCK_MOVEMENT_UPDATE_STATUS(id), payload),
  rejectRequest: ({
    id,
    sender,
    recipient,
    comment,
  }) =>
    apiClient.post(STOCK_MOVEMENT_UPDATE_STATUS(id), {
      status: RequisitionStatus.REJECTED,
      sender,
      recipient,
      comment,
    }),
  rollbackApproval: (id) => apiClient.put(STOCK_MOVEMENT_ROLLBACK_APPROVAL(id)),
  importCsv: (stockMovementId, formData) =>
    apiClient.post(STOCK_MOVEMENT_URL.importCsv(stockMovementId), formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  exportCsv: (stockMovementId) =>
    apiClient.get(STOCK_MOVEMENT_URL.exportCsv(stockMovementId), { responseType: 'blob' }),
  getStockMovementById: (id, params) =>
    apiClient.get(STOCK_MOVEMENT_BY_ID(id), { params }),
  getStockMovementItems: (id, params) =>
    apiClient.get(STOCK_MOVEMENT_ITEMS(id), { params }),
  updateShipment: (id, payload) => apiClient.post(
    STOCK_MOVEMENT_UPDATE_SHIPMENT(id), payload,
  ),
  uploadDocuments: (id, formData) =>
    apiClient.post(STOCK_MOVEMENT_URL.uploadDocuments(id), formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  getDocuments: (id) => apiClient.get(STOCK_MOVEMENT_DOCUMENTS(id)),
  getDetails: (id) => apiClient.get(STOCK_MOVEMENT_DETAILS(id)),
  getPackingList: (id) => apiClient.get(STOCK_MOVEMENT_PACKING_LIST(id)),
  getReceiptItems: (id) => apiClient.get(STOCK_MOVEMENT_RECEIPT_ITEMS(id)),
  getEvents: (id) => apiClient.get(STOCK_MOVEMENT_EVENTS(id)),
  getComments: (id) => apiClient.get(STOCK_MOVEMENT_COMMENTS(id)),
  createComment: (id, payload) => apiClient.post(STOCK_MOVEMENT_COMMENTS(id), payload),
  getDocumentTypeOptions: () => apiClient.get(STOCK_MOVEMENT_DOCUMENT_TYPES),
  uploadDocument: (id, formData) => apiClient.post(STOCK_MOVEMENT_UPLOAD_DOCUMENT(id), formData),
};
