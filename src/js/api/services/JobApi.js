import {
  JOBS_DETAILS_API,
  JOBS_TRIGGERS_API,
} from 'api/urls';
import apiClient from 'utils/apiClient';

export default {
  getJob: (name, group) => apiClient.get(JOBS_DETAILS_API, {
    params: { name, ...(group ? { group } : {}) },
  }),
  createTrigger: (payload) => apiClient.post(JOBS_TRIGGERS_API, payload),
  deleteTrigger: (name, group) => apiClient.delete(JOBS_TRIGGERS_API, {
    params: { name, ...(group ? { group } : {}) },
  }),
};
