import { TAG_BY_ID } from 'api/urls';
import apiClient from 'utils/apiClient';

export default {
  getTag: (id) => apiClient.get(TAG_BY_ID(id)),
  deleteTag: (id) => apiClient.delete(TAG_BY_ID(id)),
};
