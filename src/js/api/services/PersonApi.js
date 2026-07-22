import {
  PERSON_API,
  PERSON_BY_ID,
  PERSON_DETAILS,
} from 'api/urls';
import apiClient from 'utils/apiClient';

export default {
  getPersonDetails: (id) => apiClient.get(PERSON_DETAILS(id)),
  createPerson: (payload) => apiClient.post(PERSON_API, payload),
  updatePerson: (id, payload) => apiClient.put(PERSON_BY_ID(id), payload),
  deletePerson: (id) => apiClient.delete(PERSON_BY_ID(id)),
};
