import { PAYMENT_TERM_API, PAYMENT_TERM_BY_ID } from 'api/urls';
import apiClient from 'utils/apiClient';

export default {
  getPaymentTerms: (config) => apiClient.get(PAYMENT_TERM_API, config),
  getPaymentTerm: (id, config) => apiClient.get(PAYMENT_TERM_BY_ID(id), config),
  createPaymentTerm: (payload) => apiClient.post(PAYMENT_TERM_API, payload),
  updatePaymentTerm: (id, payload) => apiClient.put(PAYMENT_TERM_BY_ID(id), payload),
};
