import {
  ORDER_BY_ID,
  ORDER_COMMENTS,
} from 'api/urls';
import apiClient from 'utils/apiClient';

export default {
  getOrder: (id, config) => apiClient.get(ORDER_BY_ID(id), config),
  createComment: (id, payload) => apiClient.post(ORDER_COMMENTS(id), payload),
};
