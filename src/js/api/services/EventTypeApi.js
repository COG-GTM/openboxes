import {
  EVENT_CODE_OPTIONS,
  EVENT_TYPE_API,
  EVENT_TYPE_BY_ID,
} from 'api/urls';
import apiClient from 'utils/apiClient';

export default {
  getEventTypes: (config) => apiClient.get(EVENT_TYPE_API, config),
  getEventType: (id) => apiClient.get(EVENT_TYPE_BY_ID(id)),
  getEventCodeOptions: (config) => apiClient.get(EVENT_CODE_OPTIONS, config),
  createEventType: (payload) => apiClient.post(EVENT_TYPE_API, payload),
  updateEventType: (id, payload) => apiClient.put(EVENT_TYPE_BY_ID(id), payload),
  deleteEventType: (id) => apiClient.delete(EVENT_TYPE_BY_ID(id)),
};
