import { DOCUMENT_TYPE_OPTIONS, HANDLING_REQUIREMENTS_OPTIONS, PRODUCT_TYPE_OPTIONS } from 'api/urls';
import apiClient from 'utils/apiClient';

export default {
  getHandlingRequirementsOptions: () => apiClient.get(HANDLING_REQUIREMENTS_OPTIONS),
  getProductTypeOptions: () => apiClient.get(PRODUCT_TYPE_OPTIONS),
  getDocumentTypeOptions: () => apiClient.get(DOCUMENT_TYPE_OPTIONS),
};
