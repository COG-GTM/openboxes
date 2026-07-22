import {
  PARTY_API,
  PARTY_BY_ID,
  PARTY_DETAILS,
  PARTY_OPTIONS,
  PARTY_ROLE_API,
  PARTY_ROLE_BY_ID,
  PARTY_ROLE_DETAILS,
  PARTY_TYPE_OPTIONS,
  ROLE_TYPE_OPTIONS,
} from 'api/urls';
import apiClient from 'utils/apiClient';

export default {
  getPartyDetails: (id) => apiClient.get(PARTY_DETAILS(id)),
  createParty: (payload) => apiClient.post(PARTY_API, payload),
  updateParty: (id, payload) => apiClient.put(PARTY_BY_ID(id), payload),
  deleteParty: (id) => apiClient.delete(PARTY_BY_ID(id)),
  getPartyRoleDetails: (id) => apiClient.get(PARTY_ROLE_DETAILS(id)),
  createPartyRole: (payload) => apiClient.post(PARTY_ROLE_API, payload),
  updatePartyRole: (id, payload) => apiClient.put(PARTY_ROLE_BY_ID(id), payload),
  deletePartyRole: (id) => apiClient.delete(PARTY_ROLE_BY_ID(id)),
  getPartyTypeOptions: () => apiClient.get(PARTY_TYPE_OPTIONS),
  getPartyOptions: () => apiClient.get(PARTY_OPTIONS),
  getRoleTypeOptions: () => apiClient.get(ROLE_TYPE_OPTIONS),
};
