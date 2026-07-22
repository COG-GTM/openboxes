import {
  PARTY_TYPE_API,
  PARTY_TYPE_BY_ID,
  PARTY_TYPE_CODE_OPTIONS,
} from 'api/urls';
import apiClient from 'utils/apiClient';

export default {
  getPartyType: (id) => apiClient.get(PARTY_TYPE_BY_ID(id)),
  createPartyType: (payload) => apiClient.post(PARTY_TYPE_API, payload),
  updatePartyType: (id, payload) => apiClient.put(PARTY_TYPE_BY_ID(id), payload),
  deletePartyType: (id) => apiClient.delete(PARTY_TYPE_BY_ID(id)),
  getPartyTypeCodeOptions: () => apiClient.get(PARTY_TYPE_CODE_OPTIONS),
};
