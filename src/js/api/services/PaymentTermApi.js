import { PAYMENT_TERM_API } from 'api/urls';
import apiClient from 'utils/apiClient';

export default {
  createPaymentTerm: (payload) => apiClient.post(PAYMENT_TERM_API, payload),
};
