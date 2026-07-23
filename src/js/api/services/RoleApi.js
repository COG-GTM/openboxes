import { ROLE_BY_ID } from 'api/urls';
import apiClient from 'utils/apiClient';

export default {
  getRole: (id) => apiClient.get(ROLE_BY_ID(id)),
  deleteRole: (id) => apiClient.delete(ROLE_BY_ID(id)),
};
