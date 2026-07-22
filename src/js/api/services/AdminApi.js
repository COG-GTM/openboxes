import {
  ADMIN_CACHE,
  ADMIN_CACHE_EVICT_DOMAIN,
  ADMIN_CACHE_EVICT_QUERIES,
  ADMIN_CONTROLLER_ACTIONS,
  ADMIN_CONTROLLERS,
  ADMIN_MAIL,
  ADMIN_PLUGINS,
  ADMIN_SETTINGS,
  ADMIN_STOCK_ALERTS_TRIGGER,
} from 'api/urls';
import apiClient from 'utils/apiClient';

export default {
  getControllers: () => apiClient.get(ADMIN_CONTROLLERS),
  getControllerActions: () => apiClient.get(ADMIN_CONTROLLER_ACTIONS),
  getCache: () => apiClient.get(ADMIN_CACHE),
  evictDomainCache: (name) => apiClient.post(ADMIN_CACHE_EVICT_DOMAIN, null, { params: { name } }),
  evictQueryCache: (name) => apiClient.post(
    ADMIN_CACHE_EVICT_QUERIES,
    null,
    { params: name ? { name } : {} },
  ),
  getPlugins: () => apiClient.get(ADMIN_PLUGINS),
  getMailInfo: () => apiClient.get(ADMIN_MAIL),
  sendMail: (formData) => apiClient.post(ADMIN_MAIL, formData),
  getSettings: () => apiClient.get(ADMIN_SETTINGS),
  triggerStockAlerts: () => apiClient.post(ADMIN_STOCK_ALERTS_TRIGGER),
};
