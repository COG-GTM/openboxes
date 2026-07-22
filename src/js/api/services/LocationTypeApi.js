import {
  LOCATION_SUPPORTED_ACTIVITIES,
  LOCATION_TYPE_API,
  LOCATION_TYPE_BY_ID,
  LOCATION_TYPE_CODE_OPTIONS,
} from 'api/urls';
import apiClient from 'utils/apiClient';

export default {
  getLocationTypes: (config) => apiClient.get(LOCATION_TYPE_API, config),
  getLocationType: (id) => apiClient.get(LOCATION_TYPE_BY_ID(id)),
  createLocationType: (payload) => apiClient.post(LOCATION_TYPE_API, payload),
  updateLocationType: (id, payload) => apiClient.put(LOCATION_TYPE_BY_ID(id), payload),
  deleteLocationType: (id) => apiClient.delete(LOCATION_TYPE_BY_ID(id)),
  getLocationTypeCodeOptions: () => apiClient.get(LOCATION_TYPE_CODE_OPTIONS),
  getSupportedActivities: () => apiClient.get(LOCATION_SUPPORTED_ACTIVITIES),
};
