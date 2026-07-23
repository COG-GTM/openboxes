import {
  MIGRATION_DATA_MIGRATION,
  MIGRATION_DATA_QUALITY,
  MIGRATION_DIMENSION_TABLES,
  MIGRATION_FACT_TABLES,
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
};
