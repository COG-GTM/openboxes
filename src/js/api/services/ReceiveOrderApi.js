import { ORDER_RECEIVE } from 'api/urls';
import apiClient from 'utils/apiClient';

export default {
  getReceiveOrderData: (id, config) => apiClient.get(ORDER_RECEIVE(id), config),
  receiveOrder: (id, payload) => apiClient.post(ORDER_RECEIVE(id), payload),
};
