import { LAST_ERROR_API } from 'api/urls';
import apiClient from 'utils/apiClient';

export default {
  getErrorDetails: () => apiClient.get(LAST_ERROR_API),
};
