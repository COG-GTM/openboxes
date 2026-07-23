import {
  MIGRATION_DATA_MIGRATION,
  MIGRATION_DATA_QUALITY,
  MIGRATION_DIMENSION_TABLES,
  MIGRATION_FACT_TABLES,
  MIGRATION_MATERIALIZED_VIEWS,
  MIGRATION_PRODUCT_AVAILABILITY,
  MIGRATION_PRODUCT_AVAILABILITY_CALCULATE,
  MIGRATION_PRODUCT_AVAILABILITY_COUNT,
  MIGRATION_PRODUCT_AVAILABILITY_REFRESH,
  MIGRATION_PRODUCT_DEMAND_REFRESH,
  MIGRATION_RECEIPTS_WITHOUT_TRANSACTION,
  MIGRATION_SHIPMENTS_WITHOUT_TRANSACTIONS,
  MIGRATION_STOCK_MOVEMENTS_WITHOUT_SHIPMENT_ITEMS,
} from 'api/urls';
import apiClient from 'utils/apiClient';

export default {
  getDataMigration: () => apiClient.get(MIGRATION_DATA_MIGRATION),
  getDataQuality: () => apiClient.get(MIGRATION_DATA_QUALITY),
  getReceiptsWithoutTransaction: () => apiClient.get(MIGRATION_RECEIPTS_WITHOUT_TRANSACTION),
  getShipmentsWithoutTransactions: () => apiClient.get(MIGRATION_SHIPMENTS_WITHOUT_TRANSACTIONS),
  getStockMovementsWithoutShipmentItems: () =>
    apiClient.get(MIGRATION_STOCK_MOVEMENTS_WITHOUT_SHIPMENT_ITEMS),
  getDimensionTables: () => apiClient.get(MIGRATION_DIMENSION_TABLES),
  getFactTables: () => apiClient.get(MIGRATION_FACT_TABLES),
  getMaterializedViews: () => apiClient.get(MIGRATION_MATERIALIZED_VIEWS),
  getProductAvailability: () => apiClient.get(MIGRATION_PRODUCT_AVAILABILITY),
  getProductAvailabilityCount: (locationId) => apiClient.get(
    MIGRATION_PRODUCT_AVAILABILITY_COUNT,
    { params: { locationId } },
  ),
  calculateProductAvailability: (locationId) => apiClient.get(
    MIGRATION_PRODUCT_AVAILABILITY_CALCULATE,
    { params: { locationId } },
  ),
  refreshProductAvailability: (locationId) => apiClient.post(
    MIGRATION_PRODUCT_AVAILABILITY_REFRESH,
    null,
    { params: locationId ? { locationId } : {} },
  ),
  refreshProductDemand: () => apiClient.post(MIGRATION_PRODUCT_DEMAND_REFRESH),
};
