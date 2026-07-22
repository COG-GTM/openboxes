import {
  STOCKLIST_API,
  STOCKLIST_CLEAR,
  STOCKLIST_CLONE,
  STOCKLIST_DELETE,
  STOCKLIST_DETAILS,
  STOCKLIST_PUBLISH,
  STOCKLIST_UNPUBLISH,
} from 'api/urls';
import apiClient from 'utils/apiClient';

export default {
  getStockLists: (config) => apiClient.get(STOCKLIST_API, config),
  getStockListDetails: (id) => apiClient.get(STOCKLIST_DETAILS(id)),
  deleteStockList: (id) => apiClient.delete(STOCKLIST_DELETE(id)),
  clearStockList: (id) => apiClient.post(STOCKLIST_CLEAR(id)),
  cloneStockList: (id) => apiClient.post(STOCKLIST_CLONE(id)),
  publishStockList: (id) => apiClient.post(STOCKLIST_PUBLISH(id)),
  unpublishStockList: (id) => apiClient.post(STOCKLIST_UNPUBLISH(id)),
};
