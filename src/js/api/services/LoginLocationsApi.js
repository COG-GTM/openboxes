import { LOGIN_LOCATIONS_API } from 'api/urls';
import apiClient from 'utils/apiClient';

export default {
  getLoginLocations: () => apiClient.get(LOGIN_LOCATIONS_API),
};
