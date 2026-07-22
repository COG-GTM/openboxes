import {
  REQUISITION_TEMPLATE_ADD_PRODUCT_CODES,
  REQUISITION_TEMPLATE_API,
  REQUISITION_TEMPLATE_BY_ID,
  REQUISITION_TEMPLATE_HEADER,
  REQUISITION_TEMPLATE_IMPORT,
  REQUISITION_TEMPLATE_IMPORT_DATA,
  REQUISITION_TEMPLATE_ITEM,
  REQUISITION_TEMPLATE_ITEMS,
  REQUISITION_TEMPLATE_UPDATE_ITEMS,
  STOCKLIST_SEND_MAIL,
} from 'api/urls';
import apiClient from 'utils/apiClient';

export default {
  getTemplate: (id) => apiClient.get(REQUISITION_TEMPLATE_BY_ID(id)),
  createTemplate: (payload) => apiClient.post(REQUISITION_TEMPLATE_API, payload),
  updateTemplateHeader: (id, payload) => apiClient.post(REQUISITION_TEMPLATE_HEADER(id), payload),
  addTemplateItem: (id, payload) => apiClient.post(REQUISITION_TEMPLATE_ITEMS(id), payload),
  removeTemplateItem: (id, itemId) => apiClient.delete(REQUISITION_TEMPLATE_ITEM(id, itemId)),
  updateTemplateItems: (id, payload) =>
    apiClient.post(REQUISITION_TEMPLATE_UPDATE_ITEMS(id), payload),
  importTemplateData: (id, payload) =>
    apiClient.post(REQUISITION_TEMPLATE_IMPORT_DATA(id), payload),
  importTemplateItems: (id, payload) => apiClient.post(REQUISITION_TEMPLATE_IMPORT(id), payload),
  addProductCodes: (id, payload) =>
    apiClient.post(REQUISITION_TEMPLATE_ADD_PRODUCT_CODES(id), payload),
  sendMail: (id, payload) => apiClient.post(STOCKLIST_SEND_MAIL(id), payload),
};
