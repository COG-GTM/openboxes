import {
  BUDGET_CODE_OPTIONS,
  ORDER_ADJUSTMENT_BY_ID,
  ORDER_ADJUSTMENT_TYPE_OPTIONS,
  ORDER_ADJUSTMENTS,
  ORDER_API,
  ORDER_BY_ID,
  ORDER_COMMENTS,
  ORDER_DOCUMENT_TYPES,
  ORDER_DOCUMENTS,
  ORDER_ITEM_OPTIONS,
  ORDER_ITEM_SUMMARIES,
  ORDER_PENDING_ITEMS,
  ORDER_SUMMARIES,
} from 'api/urls';
import apiClient from 'utils/apiClient';

export default {
  getOrders: (config) => apiClient.get(ORDER_API, config),
  getOrder: (id, config) => apiClient.get(ORDER_BY_ID(id), config),
  createComment: (id, payload) => apiClient.post(ORDER_COMMENTS(id), payload),
  getPendingItems: (config) => apiClient.get(ORDER_PENDING_ITEMS, config),
  getDocumentTypeOptions: (config) => apiClient.get(ORDER_DOCUMENT_TYPES, config),
  uploadDocument: (id, formData) => apiClient.post(ORDER_DOCUMENTS(id), formData),
  getOrderItemOptions: (id, config) => apiClient.get(ORDER_ITEM_OPTIONS(id), config),
  getAdjustment: (id, adjustmentId, config) =>
    apiClient.get(ORDER_ADJUSTMENT_BY_ID(id, adjustmentId), config),
  createAdjustment: (id, payload) => apiClient.post(ORDER_ADJUSTMENTS(id), payload),
  updateAdjustment: (id, adjustmentId, payload) =>
    apiClient.put(ORDER_ADJUSTMENT_BY_ID(id, adjustmentId), payload),
  getOrderAdjustmentTypeOptions: (config) => apiClient.get(ORDER_ADJUSTMENT_TYPE_OPTIONS, config),
  getBudgetCodeOptions: (config) => apiClient.get(BUDGET_CODE_OPTIONS, config),
  getOrderSummaries: (config) => apiClient.get(ORDER_SUMMARIES, config),
  getOrderItemSummaries: (config) => apiClient.get(ORDER_ITEM_SUMMARIES, config),
};
