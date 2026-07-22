import {
  SHIPMENT_WORKFLOW_API,
  SHIPMENT_WORKFLOW_BY_ID,
  SHIPMENT_WORKFLOW_OPTIONS,
} from 'api/urls';
import apiClient from 'utils/apiClient';

export default {
  getShipmentWorkflows: (config) => apiClient.get(SHIPMENT_WORKFLOW_API, config),
  createShipmentWorkflow: (payload) => apiClient.post(SHIPMENT_WORKFLOW_API, payload),
  getShipmentWorkflow: (id) => apiClient.get(SHIPMENT_WORKFLOW_BY_ID(id)),
  updateShipmentWorkflow: (id, payload) => apiClient.put(SHIPMENT_WORKFLOW_BY_ID(id), payload),
  deleteShipmentWorkflow: (id) => apiClient.delete(SHIPMENT_WORKFLOW_BY_ID(id)),
  getOptions: () => apiClient.get(SHIPMENT_WORKFLOW_OPTIONS),
};
