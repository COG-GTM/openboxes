import {
  DATA_EXPORT_API,
  REPORT_BIN_LOCATION,
  REPORT_CYCLE_COUNT,
  REPORT_SHIPPING,
} from 'api/urls';
import apiClient from 'utils/apiClient';

export default {
  getBinLocationReport: (config) => apiClient.get(REPORT_BIN_LOCATION, config),
  getCycleCountReport: () => apiClient.get(REPORT_CYCLE_COUNT),
  getShippingReport: (shipmentId) => apiClient.get(REPORT_SHIPPING(shipmentId)),
  getDataExports: () => apiClient.get(DATA_EXPORT_API),
};
