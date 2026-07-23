import {
  LOGIN_LOCATION_OPTIONS,
  ROLE_OPTIONS,
  USER_BY_ID,
  USER_CREATE_API,
  USER_LOCATION_ROLE_BY_ID,
  USER_LOCATION_ROLES,
  USER_PASSWORD,
  USER_PHOTO,
  USERS_OPTIONS,
} from 'api/urls';
import apiClient from 'utils/apiClient';

export default {
  getUsersOptions: (config) => apiClient.get(USERS_OPTIONS, config),
  getUser: (id) => apiClient.get(USER_BY_ID(id)),
  createUser: (payload) => apiClient.post(USER_CREATE_API, payload),
  updateUser: (id, payload) => apiClient.put(USER_BY_ID(id), payload),
  deleteUser: (id) => apiClient.delete(USER_BY_ID(id)),
  changePassword: (id, payload) => apiClient.put(USER_PASSWORD(id), payload),
  uploadPhoto: (id, formData) => apiClient.post(USER_PHOTO(id), formData),
  addLocationRoles: (id, payload) => apiClient.post(USER_LOCATION_ROLES(id), payload),
  deleteLocationRole: (id, locationRoleId) =>
    apiClient.delete(USER_LOCATION_ROLE_BY_ID(id, locationRoleId)),
  getRoleOptions: () => apiClient.get(ROLE_OPTIONS),
  getLoginLocationOptions: () => apiClient.get(LOGIN_LOCATION_OPTIONS),
};
