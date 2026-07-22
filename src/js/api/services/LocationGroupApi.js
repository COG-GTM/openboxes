import {
  LOCATION_GROUP_BY_ID,
  LOCATION_GROUP_DETAILS,
  LOCATION_GROUP_SEARCH_API,
  LOCATION_GROUPS_API,
} from 'api/urls';
import apiClient from 'utils/apiClient';

export default {
  searchLocationGroups: (config) => apiClient.get(LOCATION_GROUP_SEARCH_API, config),
  getLocationGroupDetails: (id) => apiClient.get(LOCATION_GROUP_DETAILS(id)),
  createLocationGroup: (payload) => apiClient.post(LOCATION_GROUPS_API, payload),
  updateLocationGroup: (id, payload) => apiClient.put(LOCATION_GROUP_BY_ID(id), payload),
  deleteLocationGroup: (id) => apiClient.delete(LOCATION_GROUP_BY_ID(id)),
};
