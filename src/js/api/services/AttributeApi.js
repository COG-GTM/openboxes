import { ATTRIBUTE_BY_ID, ATTRIBUTES, UNIT_OF_MEASURE_CLASS_OPTIONS } from 'api/urls';
import apiClient from 'utils/apiClient';

export default {
  searchAttributes: (config) => apiClient.get(ATTRIBUTES, config),
  getAttribute: (id) => apiClient.get(ATTRIBUTE_BY_ID(id)),
  createAttribute: (payload) => apiClient.post(ATTRIBUTES, payload),
  updateAttribute: (id, payload) => apiClient.put(ATTRIBUTE_BY_ID(id), payload),
  deleteAttribute: (id) => apiClient.delete(ATTRIBUTE_BY_ID(id)),
  getUnitOfMeasureClasses: () => apiClient.get(UNIT_OF_MEASURE_CLASS_OPTIONS),
};
