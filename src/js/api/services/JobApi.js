import {
  JOBS_DETAILS_API,
  JOBS_LIST_API,
  JOBS_PAUSE_API,
  JOBS_RESUME_API,
  JOBS_RUN_API,
  JOBS_SCHEDULER_STANDBY_API,
  JOBS_SCHEDULER_START_API,
  JOBS_TRIGGERS_API,
} from 'api/urls';
import apiClient from 'utils/apiClient';

export default {
  getJob: (name, group) => apiClient.get(JOBS_DETAILS_API, {
    params: { name, ...(group ? { group } : {}) },
  }),
  getJobs: () => apiClient.get(JOBS_LIST_API),
  createTrigger: (payload) => apiClient.post(JOBS_TRIGGERS_API, payload),
  deleteTrigger: (name, group) => apiClient.delete(JOBS_TRIGGERS_API, {
    params: { name, ...(group ? { group } : {}) },
  }),
  pauseJob: (jobName, jobGroup) => apiClient.post(JOBS_PAUSE_API, { jobName, jobGroup }),
  resumeJob: (jobName, jobGroup) => apiClient.post(JOBS_RESUME_API, { jobName, jobGroup }),
  runJobNow: (jobName, jobGroup) => apiClient.post(JOBS_RUN_API, { jobName, jobGroup }),
  standbyScheduler: () => apiClient.post(JOBS_SCHEDULER_STANDBY_API),
  startScheduler: () => apiClient.post(JOBS_SCHEDULER_START_API),
};
