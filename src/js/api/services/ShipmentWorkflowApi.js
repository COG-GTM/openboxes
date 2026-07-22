import { SHIPMENT_WORKFLOW_API } from 'api/urls';
import apiClient from 'utils/apiClient';

export default {
  getShipmentWorkflows: (config) => apiClient.get(SHIPMENT_WORKFLOW_API, config),
  createShipmentWorkflow: (payload) => apiClient.post(SHIPMENT_WORKFLOW_API, payload),
};
