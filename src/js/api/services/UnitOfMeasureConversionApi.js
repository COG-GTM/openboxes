import {
  UNIT_OF_MEASURE_CONVERSION_API,
  UNIT_OF_MEASURE_CONVERSION_BY_ID,
  UNIT_OF_MEASURE_GENERIC_LIST,
} from 'api/urls';
import apiClient from 'utils/apiClient';

export default {
  getUnitOfMeasureConversions: (config) => apiClient.get(UNIT_OF_MEASURE_CONVERSION_API, config),
  getUnitOfMeasureConversion: (id) => apiClient.get(UNIT_OF_MEASURE_CONVERSION_BY_ID(id)),
  createUnitOfMeasureConversion: (payload) => apiClient.post(
    UNIT_OF_MEASURE_CONVERSION_API,
    payload,
  ),
  updateUnitOfMeasureConversion: (id, payload) => apiClient.put(
    UNIT_OF_MEASURE_CONVERSION_BY_ID(id),
    payload,
  ),
  deleteUnitOfMeasureConversion: (id) => apiClient.delete(UNIT_OF_MEASURE_CONVERSION_BY_ID(id)),
  getUnitOfMeasures: () => apiClient.get(UNIT_OF_MEASURE_GENERIC_LIST, { params: { max: 1000, sort: 'name' } }),
};
