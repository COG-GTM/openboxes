import React, { useEffect, useMemo, useState } from 'react';

import { getTranslate } from 'react-localize-redux';
import { useSelector } from 'react-redux';

import { INVENTORY_SNAPSHOT_API } from 'api/urls';
import DataTable from 'components/DataTable';
import { INVENTORY_SNAPSHOT_URL } from 'consts/applicationUrls';
import useTranslation from 'hooks/useTranslation';
import apiClient from 'utils/apiClient';
import Translate, { translateWithDefaultMessage } from 'utils/Translate';
import PageWrapper from 'wrappers/PageWrapper';

import 'components/inventory/styles.scss';

// Inventory snapshots for today are always generated against tomorrow's date,
// so the date filter defaults to tomorrow (same as the legacy screen).
const defaultDate = () => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const mm = String(tomorrow.getMonth() + 1).padStart(2, '0');
  const dd = String(tomorrow.getDate()).padStart(2, '0');
  return `${mm}/${dd}/${tomorrow.getFullYear()}`;
};

const toInputValue = (mmddyyyy) => {
  const [mm, dd, yyyy] = mmddyyyy.split('/');
  return `${yyyy}-${mm}-${dd}`;
};

const fromInputValue = (yyyymmdd) => {
  const [yyyy, mm, dd] = yyyymmdd.split('-');
  return `${mm}/${dd}/${yyyy}`;
};

const InventorySnapshotList = () => {
  useTranslation('inventory', 'reactTable');

  const [date, setDate] = useState(defaultDate());
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshMessage, setRefreshMessage] = useState(null);
  const [reloadCounter, setReloadCounter] = useState(0);

  const { currentLocation, translate } = useSelector((state) => ({
    currentLocation: state.session.currentLocation,
    translate: translateWithDefaultMessage(getTranslate(state.localize)),
  }));

  useEffect(() => {
    if (!currentLocation?.id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    apiClient.get(INVENTORY_SNAPSHOT_API, { params: { date, 'location.id': currentLocation.id } })
      .then((response) => setData(response.data.data))
      .catch((err) => {
        setData([]);
        setError(err.response?.data?.errorMessage
          || translate('react.default.errors.error.label', 'An error occurred'));
      })
      .finally(() => setLoading(false));
  }, [date, currentLocation?.id, reloadCounter]);

  const triggerSnapshotRefresh = async () => {
    setRefreshing(true);
    setError(null);
    setRefreshMessage(null);
    try {
      const response = await apiClient.post(`${INVENTORY_SNAPSHOT_URL.base}/update`, null, {
        params: { date, 'location.id': currentLocation?.id },
      });
      // The legacy update action renders error JSON with a 200 status
      if (response.data?.error) {
        setError(response.data.message
          || translate('react.default.errors.error.label', 'An error occurred'));
        return;
      }
      setRefreshMessage(translate(
        'react.inventorySnapshot.refreshStarted.label',
        'Snapshot refresh started - this may take some time. Reload the page later to see updated data.',
      ));
      setReloadCounter((counter) => counter + 1);
    } catch (err) {
      setError(err.response?.data?.message
        || translate('react.default.errors.error.label', 'An error occurred'));
    } finally {
      setRefreshing(false);
    }
  };

  const columns = useMemo(() => [
    {
      Header: <Translate id="react.inventorySnapshot.location.label" defaultMessage="Location" />,
      accessor: 'location',
    },
    {
      Header: <Translate id="react.inventorySnapshot.sku.label" defaultMessage="SKU" />,
      accessor: 'productCode',
    },
    {
      Header: <Translate id="react.inventory.product.label" defaultMessage="Product" />,
      accessor: 'product',
      minWidth: 250,
    },
    {
      Header: <Translate id="react.inventorySnapshot.productGroup.label" defaultMessage="Product group" />,
      accessor: 'productGroup',
    },
    {
      Header: <Translate id="react.inventorySnapshot.category.label" defaultMessage="Category" />,
      accessor: 'category',
    },
    {
      Header: <Translate id="react.inventorySnapshot.tags.label" defaultMessage="Tags" />,
      accessor: 'tags',
    },
    {
      Header: <Translate id="react.inventorySnapshot.qoh.label" defaultMessage="QoH" />,
      accessor: 'quantityOnHand',
      className: 'text-right',
    },
    {
      Header: <Translate id="react.inventorySnapshot.uom.label" defaultMessage="UoM" />,
      accessor: 'unitOfMeasure',
    },
  ], []);

  const downloadUrl = `${INVENTORY_SNAPSHOT_URL.download()}?date=${encodeURIComponent(date)}&location.id=${currentLocation?.id || ''}`;

  return (
    <PageWrapper className="inventory-list-page">
      <div className="list-page-header p-3 d-flex align-items-center justify-content-between">
        <h5 className="m-0">
          <Translate id="react.inventorySnapshot.title.label" defaultMessage="Current Stock" />
          {currentLocation?.name && ` — ${currentLocation.name}`}
          {` — ${date}`}
        </h5>
        <div>
          <button
            type="button"
            className="btn btn-outline-secondary btn-sm mr-2"
            disabled={refreshing}
            onClick={triggerSnapshotRefresh}
            data-testid="snapshot-refresh-button"
          >
            <Translate id="react.inventorySnapshot.refresh.label" defaultMessage="Refresh snapshot" />
          </button>
          <a href={downloadUrl} className="btn btn-outline-secondary btn-sm" data-testid="snapshot-download-button">
            <Translate id="react.default.button.download.label" defaultMessage="Download" />
          </a>
        </div>
      </div>
      {error && (
        <div className="alert alert-danger mx-3 mt-3" role="alert">{error}</div>
      )}
      {refreshMessage && (
        <div className="alert alert-info mx-3 mt-3" role="alert">{refreshMessage}</div>
      )}
      <div className="p-3 d-flex align-items-end">
        <div className="form-group m-0">
          <label htmlFor="snapshot-date">
            <Translate id="react.inventorySnapshot.date.label" defaultMessage="Date" />
          </label>
          <input
            id="snapshot-date"
            type="date"
            className="form-control"
            value={toInputValue(date)}
            onChange={(e) => e.target.value && setDate(fromInputValue(e.target.value))}
          />
        </div>
      </div>
      <DataTable
        data={data}
        columns={columns}
        loading={loading}
        defaultPageSize={10}
        totalData={data.length}
        noDataText={translate('react.inventorySnapshot.empty.label', 'No records found')}
      />
    </PageWrapper>
  );
};

export default InventorySnapshotList;
