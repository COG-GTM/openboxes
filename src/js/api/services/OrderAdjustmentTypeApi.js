import {
  ORDER_ADJUSTMENT_TYPE_API,
  ORDER_ADJUSTMENT_TYPE_BY_ID,
  ORDER_ADJUSTMENT_TYPE_CODE_OPTIONS,
} from 'api/urls';
import apiClient from 'utils/apiClient';

export default {
  getOrderAdjustmentTypes: (config) => apiClient.get(ORDER_ADJUSTMENT_TYPE_API, config),
  getOrderAdjustmentType: (id, config) => apiClient.get(ORDER_ADJUSTMENT_TYPE_BY_ID(id), config),
  createOrderAdjustmentType: (payload) => apiClient.post(ORDER_ADJUSTMENT_TYPE_API, payload),
  updateOrderAdjustmentType: (id, payload) =>
    apiClient.put(ORDER_ADJUSTMENT_TYPE_BY_ID(id), payload),
  getOrderAdjustmentTypeCodeOptions: (config) =>
    apiClient.get(ORDER_ADJUSTMENT_TYPE_CODE_OPTIONS, config),
};
