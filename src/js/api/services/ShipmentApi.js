import {
  SHIPMENT_API,
  SHIPMENT_BY_ID,
  SHIPMENT_CLEAR_PICKLIST,
  SHIPMENT_CONTAINER_BY_ID,
  SHIPMENT_CONTAINERS,
  SHIPMENT_DETAILS,
  SHIPMENT_GOODS_RECEIPT_NOTE_PRINT,
  SHIPMENT_ITEM_BY_ID,
  SHIPMENT_ITEM_PICK,
  SHIPMENT_ITEM_SPLIT,
  SHIPMENT_ITEMS,
  SHIPMENT_OUTBOUND_RETURN_PRINT,
  SHIPMENT_PACKING,
  SHIPMENT_PICKLIST,
  SHIPMENT_SEND,
  SHIPMENT_TRACKING,
  SHIPMENT_VALIDATE_PICKLIST,
  SHIPMENT_WIZARD_OPTIONS,
} from 'api/urls';
import apiClient from 'utils/apiClient';

export default {
  getShipment: (id) => apiClient.get(SHIPMENT_BY_ID(id)),
  getWizardOptions: () => apiClient.get(SHIPMENT_WIZARD_OPTIONS),
  createShipment: (payload) => apiClient.post(SHIPMENT_API, payload),
  saveShipmentDetails: (id, payload) => apiClient.post(SHIPMENT_DETAILS(id), payload),
  saveShipmentTracking: (id, payload) => apiClient.post(SHIPMENT_TRACKING(id), payload),
  getShipmentPacking: (id) => apiClient.get(SHIPMENT_PACKING(id)),
  createContainers: (id, payload) => apiClient.post(SHIPMENT_CONTAINERS(id), payload),
  deleteContainer: (id, containerId, deleteItems) =>
    apiClient.delete(SHIPMENT_CONTAINER_BY_ID(id, containerId), { params: { deleteItems } }),
  addShipmentItem: (id, payload) => apiClient.post(SHIPMENT_ITEMS(id), payload),
  updateShipmentItem: (id, itemId, payload) =>
    apiClient.post(SHIPMENT_ITEM_BY_ID(id, itemId), payload),
  deleteShipmentItem: (id, itemId) => apiClient.delete(SHIPMENT_ITEM_BY_ID(id, itemId)),
  getShipmentPicklist: (id) => apiClient.get(SHIPMENT_PICKLIST(id)),
  pickShipmentItem: (id, itemId, payload) =>
    apiClient.post(SHIPMENT_ITEM_PICK(id, itemId), payload),
  splitShipmentItem: (id, itemId) => apiClient.post(SHIPMENT_ITEM_SPLIT(id, itemId)),
  validatePicklist: (id) => apiClient.post(SHIPMENT_VALIDATE_PICKLIST(id)),
  clearPicklist: (id) => apiClient.post(SHIPMENT_CLEAR_PICKLIST(id)),
  sendShipment: (id, payload) => apiClient.post(SHIPMENT_SEND(id), payload),
  getOutboundReturnPrintData: (id, config) =>
    apiClient.get(SHIPMENT_OUTBOUND_RETURN_PRINT(id), config),
  getGoodsReceiptNotePrintData: (id, config) =>
    apiClient.get(SHIPMENT_GOODS_RECEIPT_NOTE_PRINT(id), config),
};
