import {
  SHIPMENT_ITEM_API,
  SHIPMENT_ITEM_API_BY_ID,
  SHIPMENT_ITEM_OPTIONS,
  SHIPMENT_ITEM_PICK_CONTEXT,
  SHIPMENT_ITEM_SPLIT_BY_ID,
} from 'api/urls';
import apiClient from 'utils/apiClient';

export default {
  getShipmentItems: (config) => apiClient.get(SHIPMENT_ITEM_API, config),
  getShipmentItem: (id) => apiClient.get(SHIPMENT_ITEM_API_BY_ID(id)),
  updateShipmentItem: (id, payload) => apiClient.put(SHIPMENT_ITEM_API_BY_ID(id), payload),
  deleteShipmentItem: (id) => apiClient.delete(SHIPMENT_ITEM_API_BY_ID(id)),
  getOptions: () => apiClient.get(SHIPMENT_ITEM_OPTIONS),
  getPickContext: (id) => apiClient.get(SHIPMENT_ITEM_PICK_CONTEXT(id)),
  splitShipmentItem: (id, payload) => apiClient.post(SHIPMENT_ITEM_SPLIT_BY_ID(id), payload),
};
