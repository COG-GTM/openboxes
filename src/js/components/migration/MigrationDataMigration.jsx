import React, { useEffect, useState } from 'react';

import { useDispatch } from 'react-redux';

import { hideSpinner, showSpinner } from 'actions';
import migrationApi from 'api/services/MigrationApi';
import notification from 'components/Layout/notifications/notification';
import MigrationTabs from 'components/migration/MigrationTabs';
import { MIGRATION_URL, ORGANIZATION_URL, PRODUCT_SUPPLIER_URL } from 'consts/applicationUrls';
import NotificationType from 'consts/notificationTypes';
import useTranslate from 'hooks/useTranslate';
import apiClient from 'utils/apiClient';
import Translate from 'utils/Translate';

const stripHtml = (value) => (typeof value === 'string'
  ? value.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
  : '');

const MigrationDataMigration = () => {
  const dispatch = useDispatch();
  const translate = useTranslate();

  const [data, setData] = useState(null);

  useEffect(() => {
    migrationApi.getDataMigration()
      .then((response) => setData(response?.data?.data));
  }, []);

  // Matches the legacy g:remoteLink actions, which rendered the returned
  // /migration/_status template into the page.
  const runRemoteAction = async (action) => {
    dispatch(showSpinner());
    try {
      const response = await apiClient.get(`${MIGRATION_URL.base}/${action}`);
      notification(NotificationType.SUCCESS)({
        message: stripHtml(response?.data) || 'Completed migration!',
      });
      const refreshed = await migrationApi.getDataMigration();
      setData(refreshed?.data?.data);
    } finally {
      dispatch(hideSpinner());
    }
  };

  const legacyUrl = (actionWithParams) => `${MIGRATION_URL.base}/${actionWithParams}`;

  const recordStockMigrationEnabled = (data?.amountOfMissingInventoryImportTransactionSources
    + data?.amountOfMissingCycleCountTransactionSources) === 0;

  const overlappingTransactions = data?.overlappingTransactions ?? {};
  const overlappingTransactionEntries = Object.entries(overlappingTransactions);

  const migrateFirstMessage = 'Important: trigger the product inventory transactions migration '
    + 'first, before proceeding with creating the missing transaction sources.';

  const renderMissingInventoryImportActions = () => {
    if (data?.productInventoryTransactionInCurrentLocationCount) {
      return <p className="mb-0">{migrateFirstMessage}</p>;
    }
    if (data?.amountOfMissingInventoryImportTransactionSources) {
      return (
        <a
          className="btn btn-outline-primary btn-sm"
          href={legacyUrl('createMissingInventoryImportTransactionSourcesForCurrentLocation')}
          target="_blank"
          rel="noopener noreferrer"
        >
          Migrate inventory import transactions for current location
        </a>
      );
    }
    return <p className="mb-0">All missing inventory import transaction sources have been created.</p>;
  };

  const renderMissingCycleCountActions = () => {
    if (data?.productInventoryTransactionInCurrentLocationCount) {
      return <p className="mb-0">{migrateFirstMessage}</p>;
    }
    if (data?.amountOfMissingCycleCountTransactionSources) {
      return (
        <a
          className="btn btn-outline-primary btn-sm"
          href={legacyUrl('createMissingCycleCountTransactionSourcesForCurrentLocation')}
          target="_blank"
          rel="noopener noreferrer"
        >
          Migrate cycle count transactions for current location
        </a>
      );
    }
    return <p className="mb-0">All missing cycle count transaction sources have been created.</p>;
  };

  const renderMissingRecordStockActions = () => {
    if (!recordStockMigrationEnabled) {
      return <p className="mb-0">Please migrate all missing inventory import and cycle count transaction sources first.</p>;
    }
    if (data?.amountOfMissingRecordStockTransactionSources) {
      return (
        <a
          className="btn btn-outline-primary btn-sm"
          href={legacyUrl('createMissingRecordStockTransactionSourcesForCurrentLocation')}
          target="_blank"
          rel="noopener noreferrer"
        >
          Migrate record stock and adjust inventory transactions for current location
        </a>
      );
    }
    return <p className="mb-0">All missing record stock and adjust inventory transaction sources have been created.</p>;
  };

  return (
    <MigrationTabs activeTab="dataMigration">
      <h2 className="font-weight-bold">
        <Translate id="react.migration.dataMigration.label" defaultMessage="Data Migration" />
      </h2>
      <table className="table table-sm" data-testid="data-migration-table">
        <thead>
          <tr>
            <th>{translate('react.migration.column.data.label', 'Data')}</th>
            <th>{translate('react.migration.column.count.label', 'Count')}</th>
            <th>{translate('react.migration.column.actions.label', 'Actions')}</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><Translate id="react.migration.organizations.label" defaultMessage="Organizations" /></td>
            <td aria-label="Organizations" data-testid="organization-count">{data?.organizationCount ?? '...'}</td>
            <td>
              <div className="d-flex gap-8">
                <a className="btn btn-outline-primary btn-sm" href={ORGANIZATION_URL.list()}>List</a>
                <button
                  type="button"
                  className="btn btn-outline-primary btn-sm"
                  onClick={() => runRemoteAction('migrateOrganizations')}
                >
                  Migrate
                </button>
                <button
                  type="button"
                  className="btn btn-outline-danger btn-sm"
                  onClick={() => runRemoteAction('deleteOrganizations')}
                >
                  Delete
                </button>
              </div>
            </td>
          </tr>
          <tr>
            <td><Translate id="react.migration.productSuppliers.label" defaultMessage="Product Suppliers" /></td>
            <td aria-label="Product Suppliers" data-testid="product-supplier-count">{data?.productSupplierCount ?? '...'}</td>
            <td>
              <div className="d-flex gap-8">
                <a className="btn btn-outline-primary btn-sm" href={PRODUCT_SUPPLIER_URL.list()}>List</a>
                <button
                  type="button"
                  className="btn btn-outline-primary btn-sm"
                  onClick={() => runRemoteAction('migrateProductSuppliers')}
                >
                  Migrate
                </button>
                <button
                  type="button"
                  className="btn btn-outline-danger btn-sm"
                  onClick={() => runRemoteAction('deleteProductSuppliers')}
                >
                  Delete
                </button>
              </div>
            </td>
          </tr>
          <tr>
            <td>Inventory transactions should be replaced by adjustments</td>
            <td aria-label="Inventory transactions" data-testid="inventory-transaction-count">{data?.inventoryTransactionCount ?? '...'}</td>
            <td>
              <div className="d-flex flex-wrap gap-8">
                <a
                  className="btn btn-outline-primary btn-sm"
                  href={legacyUrl('nextInventoryTransaction?max=1')}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Next Product
                </a>
                <a
                  className="btn btn-outline-primary btn-sm"
                  href={legacyUrl('locationsWithInventoryTransactions')}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  View All Locations
                </a>
                <a
                  className="btn btn-outline-primary btn-sm"
                  href={legacyUrl('downloadCurrentInventory?format=csv')}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Download Inventory (.csv)
                </a>
                <a
                  className="btn btn-outline-primary btn-sm"
                  href={legacyUrl('migrateInventoryTransactions?max=1&performMigration=false')}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Preview Migration
                </a>
                <a
                  className="btn btn-outline-primary btn-sm"
                  href={legacyUrl('migrateInventoryTransactions?performMigration=true&format=json')}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Migrate Current Location
                </a>
                <a className="btn btn-outline-primary btn-sm" href={legacyUrl('migrateAllInventoryTransactions')}>
                  Migrate All Locations
                </a>
              </div>
            </td>
          </tr>
          <tr>
            <td>
              Product Inventory transactions that should be replaced by Inventory Baseline
              and Adjustment pair
            </td>
            <td>
              <div data-testid="product-inventory-transaction-count">
                {`${data?.productInventoryTransactionCount ?? '...'} (total), ${data?.productInventoryTransactionInCurrentLocationCount ?? '...'} (current location)`}
              </div>
              <div className="pt-2">
                Products that have a product inventory transaction overlapping with other
                type of transaction PLEASE REVIEW THESE BEFORE (OR AFTER MIGRATION):
                {overlappingTransactionEntries.length
                  ? overlappingTransactionEntries.map(([product, transactions]) => (
                    <div key={product}>{`${product}=${JSON.stringify(transactions)}`}</div>
                  ))
                  : <div>None</div>}
              </div>
              <div className="pt-2">
                {`Products with old transaction: ${data?.productsWithProductInventoryTransactionInCurrentLocation?.join(', ') || 'None'}`}
              </div>
            </td>
            <td>
              <div className="d-flex flex-wrap gap-8">
                <a
                  className="btn btn-outline-primary btn-sm"
                  href={legacyUrl('locationsWithProductInventoryTransactions')}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  View All Locations with deprecated Product Inventory transaction
                </a>
                <a
                  className="btn btn-outline-primary btn-sm"
                  href={legacyUrl('downloadCurrentInventory?format=csv')}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Download Inventory (.csv)
                </a>
                <a
                  className="btn btn-outline-primary btn-sm"
                  href={legacyUrl('migrateProductInventoryTransactions?performMigration=false')}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Preview Migration for Current Location
                </a>
                <a
                  className="btn btn-outline-primary btn-sm"
                  href={legacyUrl('migrateProductInventoryTransactions?performMigration=true')}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Migrate Current Location
                </a>
              </div>
              <p className="pt-2 mb-0">
                {'Warning! Currently it takes about couple of minutes to migrate about ~1000 '
                  + 'transactions. Results will be visible in the new tab after everything is '
                  + 'processed (for your convenience do not close it). Do not trigger migration '
                  + 'for the same location twice (ideally each location should be processed one '
                  + 'by one). Preview displays all transaction entries within this location '
                  + 'grouped by product.'}
              </p>
            </td>
          </tr>
          <tr>
            <td>Missing transaction sources for inventory import based transactions</td>
            <td data-testid="missing-inventory-import-count">
              {`Maximum amount of inventory import transactions without transaction source: ${data?.amountOfMissingInventoryImportTransactionSources ?? '...'}`}
            </td>
            <td>{renderMissingInventoryImportActions()}</td>
          </tr>
          <tr>
            <td>Missing transaction sources for cycle count based transactions</td>
            <td data-testid="missing-cycle-count-count">
              {`Maximum amount of cycle count transactions without transaction source: ${data?.amountOfMissingCycleCountTransactionSources ?? '...'}`}
            </td>
            <td>{renderMissingCycleCountActions()}</td>
          </tr>
          <tr>
            <td>
              Missing transaction sources for record stock and adjust inventory based
              transactions
            </td>
            <td data-testid="missing-record-stock-count">
              {`The amount of missing transaction sources for record stock and adjust inventory based transactions: ${data?.amountOfMissingRecordStockTransactionSources ?? ''}`}
            </td>
            <td>{renderMissingRecordStockActions()}</td>
          </tr>
        </tbody>
      </table>
    </MigrationTabs>
  );
};

export default MigrationDataMigration;
