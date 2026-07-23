import {
  USER_CREATE_API,
  USER_DETAILS,
  USER_PHOTO,
  USERS_OPTIONS,
} from 'api/urls';
import apiClient from 'utils/apiClient';

export default {
  getUsersOptions: (config) => apiClient.get(USERS_OPTIONS, config),
  getUser: (id) => apiClient.get(USER_DETAILS(id)),
  createUser: (payload) => apiClient.post(USER_CREATE_API, payload),
  uploadPhoto: (id, formData) => apiClient.post(USER_PHOTO(id), formData),
};
