import {
  SUPPLIER_DETAILS,
  SUPPLIER_PRICE_HISTORY,
} from 'api/urls';
import apiClient from 'utils/apiClient';

export default {
  getSupplierDetails: (id) => apiClient.get(SUPPLIER_DETAILS(id)),
  getSupplierPriceHistory: (id, params) =>
    apiClient.get(SUPPLIER_PRICE_HISTORY(id), { params }),
};
