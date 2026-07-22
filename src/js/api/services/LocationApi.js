import {
  LOCATION,
  LOCATION_API,
  LOCATION_BIN_LOCATIONS,
  LOCATION_CONTENTS,
  LOCATION_DETAILS,
  LOCATION_LOGO,
  LOCATION_SUPPORTED_ACTIVITIES,
  LOCATION_TYPES,
  LOCATION_ZONE_LOCATIONS,
} from 'api/urls';
import apiClient from 'utils/apiClient';

export default {
  getLocations: (config) => apiClient(LOCATION_API, config),
  getLocationTypes: (config) => apiClient.get(LOCATION_TYPES, config),
  getSupportedActivities: (config) => apiClient.get(LOCATION_SUPPORTED_ACTIVITIES, config),
  getLocation: (id, config) => apiClient.get(LOCATION(id), config),
  getLocationDetails: (id, config) => apiClient.get(LOCATION_DETAILS(id), config),
  getBinLocations: (id, config) => apiClient.get(LOCATION_BIN_LOCATIONS(id), config),
  getZoneLocations: (id, config) => apiClient.get(LOCATION_ZONE_LOCATIONS(id), config),
  getContents: (id, config) => apiClient.get(LOCATION_CONTENTS(id), config),
  createLocation: (payload, params) => apiClient.post(LOCATION_API, payload, { params }),
  updateLocation: (id, payload, params) => apiClient.put(LOCATION(id), payload, { params }),
  deleteLocation: (id) => apiClient.delete(LOCATION(id)),
  deleteLogo: (id) => apiClient.delete(LOCATION_LOGO(id)),
  updateLocationAddress: (locationId, address) =>
    apiClient.post(LOCATION(locationId), { address }),
};
