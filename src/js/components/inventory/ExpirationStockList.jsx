import React, { useEffect, useMemo, useState } from 'react';

import PropTypes from 'prop-types';
import { getTranslate } from 'react-localize-redux';
import { useSelector } from 'react-redux';

import { EXPIRED_STOCK, EXPIRING_STOCK } from 'api/urls';
import DataTable from 'components/DataTable';
import { INVENTORY_ITEM_URL, INVENTORY_URL } from 'consts/applicationUrls';
import useTranslation from 'hooks/useTranslation';
import apiClient from 'utils/apiClient';
import Select from 'utils/Select';
import Translate, { translateWithDefaultMessage } from 'utils/Translate';
import PageWrapper from 'wrappers/PageWrapper';

import 'components/inventory/styles.scss';

const EXPIRATION_STATUSES = [
  'within30Days',
  'within90Days',
  'within180Days',
  'within365Days',
  'greaterThan365Days',
];

const ExpirationStockList = ({ expired }) => {
  useTranslation('inventory', 'reactTable');

  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedStatus, setSelectedStatus] = useState(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [data, setData] = useState([]);
  const [selectedItems, setSelectedItems] = useState({});
  const [loading, setLoading] = useState(true);

  const { currentLocation, translate } = useSelector((state) => ({
    currentLocation: state.session.currentLocation,
    translate: translateWithDefaultMessage(getTranslate(state.localize)),
  }));

  const apiUrl = expired ? EXPIRED_STOCK : EXPIRING_STOCK;
  const pageUrl = expired ? INVENTORY_URL.listExpiredStock() : INVENTORY_URL.listExpiringStock();

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get(apiUrl(currentLocation?.id), {
        params: {
          'category.id': selectedCategory?.id,
          status: selectedStatus?.id,
          startDate: startDate || null,
          endDate: endDate || null,
        },
      });
      setData(response.data.data.items);
      if (!selectedCategory) {
        setCategories(response.data.data.categories);
      }
      setSelectedItems({});
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentLocation?.id) {
      fetchData();
    } else {
      setLoading(false);
    }
  }, [currentLocation?.id, expired]);

  // Legacy mid-flow: POST selected inventory items into the GSP createTransaction flow
  const submitAction = (action) => {
    const ids = Object.keys(selectedItems).filter((id) => selectedItems[id]);
    if (!ids.length) {
      // eslint-disable-next-line no-alert
      alert(translate('react.inventory.selectAtLeastOneProduct.label', 'Please select at least one product'));
      return;
    }
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = `${INVENTORY_URL.base}/${action}`;
    ids.forEach((id) => {
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = 'inventoryItem.id';
      input.value = id;
      form.appendChild(input);
    });
    document.body.appendChild(form);
    form.submit();
  };

  const downloadUrl = (withBinLocation) => {
    const searchParams = new URLSearchParams();
    searchParams.append('format', 'csv');
    if (withBinLocation) {
      searchParams.append('withBinLocation', 'true');
    }
    if (selectedCategory?.id) {
      searchParams.append('category.id', selectedCategory.id);
    }
    if (!expired && selectedStatus?.id) {
      searchParams.append('status', selectedStatus.id);
    }
    if (startDate) {
      searchParams.append('startDate', startDate);
    }
    if (endDate) {
      searchParams.append('endDate', endDate);
    }
    return `${pageUrl}?${searchParams.toString()}`;
  };

  const statusOptions = useMemo(() => EXPIRATION_STATUSES.map((status) => ({
    id: status,
    label: translate(`react.inventory.expiring.status.${status}.label`, status),
  })), [translate]);

  const columns = useMemo(() => [
    {
      Header: '',
      id: 'checkbox',
      width: 40,
      sortable: false,
      Cell: (row) => (
        <input
          type="checkbox"
          checked={!!selectedItems[row.original.inventoryItem.id]}
          onChange={(e) => setSelectedItems({
            ...selectedItems,
            [row.original.inventoryItem.id]: e.target.checked,
          })}
        />
      ),
    },
    {
      Header: <Translate id="react.inventory.productCode.label" defaultMessage="Code" />,
      accessor: 'product.productCode',
    },
    {
      Header: <Translate id="react.inventory.product.label" defaultMessage="Product" />,
      accessor: 'product.name',
      minWidth: 250,
      Cell: (row) => (
        <a href={INVENTORY_ITEM_URL.showStockCard(row.original.product.id)}>
          {row.value}
        </a>
      ),
    },
    {
      Header: <Translate id="react.inventory.category.label" defaultMessage="Category" />,
      accessor: 'product.category',
    },
    {
      Header: <Translate id="react.inventory.lotNumber.label" defaultMessage="Lot number" />,
      accessor: 'inventoryItem.lotNumber',
    },
    {
      Header: <Translate id="react.inventory.expirationDate.label" defaultMessage="Expiration date" />,
      accessor: 'inventoryItem.expirationDate',
    },
    {
      Header: <Translate id="react.inventory.quantity.label" defaultMessage="Quantity" />,
      accessor: 'quantity',
      className: 'text-right',
    },
    {
      Header: <Translate id="react.inventory.unitOfMeasure.label" defaultMessage="UoM" />,
      accessor: 'product.unitOfMeasure',
    },
  ], [selectedItems]);

  return (
    <PageWrapper className="inventory-list-page">
      <div className="list-page-header p-3 d-flex align-items-center justify-content-between">
        <h5 className="m-0">
          {expired
            ? <Translate id="react.inventory.listExpiredStock.title.label" defaultMessage="Expired stock" />
            : <Translate id="react.inventory.listExpiringStock.title.label" defaultMessage="Expiring stock" />}
        </h5>
      </div>
      <div className="list-page-filters d-flex align-items-end p-3">
        <div className="inventory-filter-select mr-3">
          <label htmlFor="category-filter">
            <Translate id="react.inventory.filters.category.label" defaultMessage="Category" />
          </label>
          <Select
            id="category-filter"
            options={categories.map((it) => ({ id: it.id, label: it.name }))}
            valueKey="id"
            labelKey="label"
            value={selectedCategory}
            onChange={setSelectedCategory}
          />
        </div>
        {!expired && (
          <div className="inventory-filter-select mr-3">
            <label htmlFor="status-filter">
              <Translate id="react.inventory.filters.expirationStatus.label" defaultMessage="Expiration status" />
            </label>
            <Select
              id="status-filter"
              options={statusOptions}
              valueKey="id"
              labelKey="label"
              value={selectedStatus}
              onChange={setSelectedStatus}
            />
          </div>
        )}
        <div className="mr-3">
          <label htmlFor="start-date-filter">
            <Translate id="react.inventory.filters.startDate.label" defaultMessage="Start date" />
          </label>
          <input
            id="start-date-filter"
            type="date"
            className="form-control"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>
        <div className="mr-3">
          <label htmlFor="end-date-filter">
            <Translate id="react.inventory.filters.endDate.label" defaultMessage="End date" />
          </label>
          <input
            id="end-date-filter"
            type="date"
            className="form-control"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>
        <button
          type="button"
          className="btn btn-primary mb-1 mr-2"
          onClick={() => fetchData()}
        >
          <Translate id="react.inventory.filters.runReport.label" defaultMessage="Run Report" />
        </button>
        <a className="btn btn-outline-secondary mb-1 mr-2" href={downloadUrl(false)}>
          <Translate id="react.inventory.filters.download.label" defaultMessage="Download" />
        </a>
        <a className="btn btn-outline-secondary mb-1" href={downloadUrl(true)}>
          <Translate id="react.inventory.filters.downloadWithBinLocations.label" defaultMessage="Download with bin locations" />
        </a>
        <div className="ml-auto d-flex">
          <button type="button" className="btn btn-outline-danger mb-1 mr-2" onClick={() => submitAction('createExpired')}>
            <Translate id="react.inventory.action.expired.label" defaultMessage="Expired" />
          </button>
          <button type="button" className="btn btn-outline-secondary mb-1 mr-2" onClick={() => submitAction('createConsumed')}>
            <Translate id="react.inventory.action.consumed.label" defaultMessage="Consumed" />
          </button>
          <button type="button" className="btn btn-outline-secondary mb-1" onClick={() => submitAction('createOutboundTransfer')}>
            <Translate id="react.inventory.action.outboundTransfer.label" defaultMessage="Outbound transfer" />
          </button>
        </div>
      </div>
      <DataTable
        data={data}
        columns={columns}
        loading={loading}
        sortable
        defaultPageSize={100}
        totalData={data.length}
        noDataText={translate(
          expired ? 'react.inventory.expired.empty.label' : 'react.inventory.expiring.empty.label',
          expired ? 'No expired stock' : 'No expiring stock',
        )}
      />
    </PageWrapper>
  );
};

export default ExpirationStockList;

ExpirationStockList.propTypes = {
  expired: PropTypes.bool,
};

ExpirationStockList.defaultProps = {
  expired: false,
};
