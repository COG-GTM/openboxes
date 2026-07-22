import React, { useEffect, useMemo, useState } from 'react';

import { getTranslate } from 'react-localize-redux';
import { useSelector } from 'react-redux';

import { PRODUCT_GROUP_SUMMARY } from 'api/urls';
import DataTable from 'components/DataTable';
import { INVENTORY_ITEM_URL } from 'consts/applicationUrls';
import useTranslation from 'hooks/useTranslation';
import apiClient from 'utils/apiClient';
import Translate, { translateWithDefaultMessage } from 'utils/Translate';
import PageWrapper from 'wrappers/PageWrapper';

import 'components/inventory/styles.scss';

// Same statuses (and default selection) as the legacy inventoryBrowser/list.gsp
const STATUSES = [
  { key: 'IN_STOCK', defaultChecked: true },
  { key: 'NOT_STOCKED', defaultChecked: false },
  { key: 'STOCK_OUT', defaultChecked: true },
  { key: 'LOW_STOCK', defaultChecked: true },
  { key: 'REORDER', defaultChecked: true },
  { key: 'IDEAL_STOCK', defaultChecked: true },
  { key: 'OVERSTOCK', defaultChecked: true },
  { key: 'INVALID', defaultChecked: true },
];

const InventoryBrowserList = () => {
  useTranslation('inventoryBrowser', 'inventory', 'reactTable');

  const [selectedStatuses, setSelectedStatuses] = useState(
    STATUSES.filter((it) => it.defaultChecked).map((it) => it.key),
  );
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const { currentLocation, translate } = useSelector((state) => ({
    currentLocation: state.session.currentLocation,
    translate: translateWithDefaultMessage(getTranslate(state.localize)),
  }));

  const fetchData = async (statuses = selectedStatuses) => {
    setLoading(true);
    try {
      const response = await apiClient.get(PRODUCT_GROUP_SUMMARY(currentLocation?.id), {
        params: { status: statuses },
        paramsSerializer: (params) => {
          const searchParams = new URLSearchParams();
          Object.entries(params).forEach(([key, value]) => {
            if (Array.isArray(value)) {
              value.forEach((v) => searchParams.append(key, v));
              return;
            }
            searchParams.append(key, value);
          });
          return searchParams.toString();
        },
      });
      setData(response.data.data);
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
  }, [currentLocation?.id]);

  const toggleStatus = (status) => {
    setSelectedStatuses((prev) => (prev.includes(status)
      ? prev.filter((it) => it !== status)
      : [...prev, status]));
  };

  const rows = useMemo(() => (data?.rows ? [...data.rows] : []), [data]);

  const columns = useMemo(() => [
    {
      Header: <Translate id="react.inventoryBrowser.status.label" defaultMessage="Status" />,
      accessor: 'status',
    },
    {
      Header: <Translate id="react.inventoryBrowser.productCodes.label" defaultMessage="Product Code" />,
      accessor: 'productCodes',
      Cell: (row) => <span>{(row.value || []).join(', ')}</span>,
    },
    {
      Header: <Translate id="react.inventoryBrowser.name.label" defaultMessage="Name" />,
      accessor: 'name',
      minWidth: 250,
      Cell: (row) => (row.original.hasProductGroup || !row.original.id
        ? <span>{row.value}</span>
        : <a href={INVENTORY_ITEM_URL.showStockCard(row.original.id)}>{row.value}</a>),
    },
    {
      Header: <Translate id="react.inventoryBrowser.minQuantity.label" defaultMessage="Minimum" />,
      accessor: 'minQuantity',
      className: 'text-right',
    },
    {
      Header: <Translate id="react.inventoryBrowser.reorderQuantity.label" defaultMessage="Reorder" />,
      accessor: 'reorderQuantity',
      className: 'text-right',
    },
    {
      Header: <Translate id="react.inventoryBrowser.maxQuantity.label" defaultMessage="Maximum" />,
      accessor: 'maxQuantity',
      className: 'text-right',
    },
    {
      Header: <Translate id="react.inventoryBrowser.onHandQuantity.label" defaultMessage="QoH" />,
      accessor: 'onHandQuantity',
      className: 'text-right',
    },
    {
      Header: <Translate id="react.inventoryBrowser.unitPrice.label" defaultMessage="Unit Price" />,
      accessor: 'unitPriceFormatted',
      className: 'text-right',
    },
    {
      Header: <Translate id="react.inventoryBrowser.totalValue.label" defaultMessage="Total Value" />,
      accessor: 'totalValueFormatted',
      className: 'text-right',
    },
  ], []);

  return (
    <PageWrapper className="inventory-browser-page">
      <div className="list-page-header p-3 d-flex align-items-center justify-content-between">
        <h5 className="m-0">
          <Translate id="react.inventoryBrowser.title.label" defaultMessage="Inventory Snapshots" />
        </h5>
        {data && (
          <div>
            <Translate id="react.inventoryBrowser.totalValue.label" defaultMessage="Total Value" />
            {': '}
            <strong>{data.totalValueFormatted}</strong>
          </div>
        )}
      </div>
      <div className="list-page-filters d-flex flex-wrap align-items-center p-3">
        {STATUSES.map((status) => (
          <div className="form-check mr-3" key={status.key}>
            <input
              id={`status-${status.key}`}
              className="form-check-input"
              type="checkbox"
              checked={selectedStatuses.includes(status.key)}
              onChange={() => toggleStatus(status.key)}
            />
            <label className="form-check-label" htmlFor={`status-${status.key}`}>
              {translate(`react.inventoryBrowser.status.${status.key}.label`, status.key)}
            </label>
          </div>
        ))}
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => fetchData()}
        >
          <Translate id="react.inventoryBrowser.runReport.label" defaultMessage="Run Report" />
        </button>
      </div>
      <DataTable
        data={rows}
        columns={columns}
        loading={loading}
        sortable
        defaultPageSize={100}
        totalData={rows.length}
        noDataText={translate('react.inventoryBrowser.empty.label', 'No products found')}
      />
    </PageWrapper>
  );
};

export default InventoryBrowserList;
