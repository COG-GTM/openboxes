import {
  EVENT_TYPE_API,
  EVENT_TYPE_BY_ID,
} from 'api/urls';
import apiClient from 'utils/apiClient';

export default {
  getEventTypes: (config) => apiClient.get(EVENT_TYPE_API, config),
  getEventType: (id) => apiClient.get(EVENT_TYPE_BY_ID(id)),
  deleteEventType: (id) => apiClient.delete(EVENT_TYPE_BY_ID(id)),
};
