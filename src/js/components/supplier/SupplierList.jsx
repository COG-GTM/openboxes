import React, { useMemo, useState } from 'react';

import { SUPPLIER_SEARCH_API } from 'api/urls';
import DataTable, { TableCell } from 'components/DataTable';
import Button from 'components/form-elements/Button';
import {
  CONTEXT_PATH,
  STOCK_MOVEMENT_URL,
  SUPPLIER_URL,
} from 'consts/applicationUrls';
import useTableData from 'hooks/list-pages/useTableData';
import useTranslate from 'hooks/useTranslate';
import useTranslation from 'hooks/useTranslation';
import Translate from 'utils/Translate';

const PENDING_RECEIPT_STATUS_CODES = ['CREATED', 'PENDING', 'SHIPPED', 'PARTIALLY_RECEIVED'];

const pendingShipmentsUrl = (locationId) => {
  const receiptStatusParams = PENDING_RECEIPT_STATUS_CODES
    .map((code) => `receiptStatusCode=${code}`)
    .join('&');
  return `${STOCK_MOVEMENT_URL.list()}?direction=INBOUND&origin=${locationId}&${receiptStatusParams}`;
};

const SupplierList = () => {
  useTranslation('supplier', 'reactTable', 'default');

  const translate = useTranslate();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterParams, setFilterParams] = useState({ q: '' });

  const getParams = ({ offset, state }) => ({
    offset: `${offset}`,
    max: `${state.pageSize}`,
    ...(filterParams.q ? { q: filterParams.q } : {}),
  });

  const {
    tableRef,
    loading,
    tableData,
    onFetchHandler,
  } = useTableData({
    filterParams,
    url: SUPPLIER_SEARCH_API,
    errorMessageId: 'react.supplier.fetch.fail.label',
    defaultErrorMessage: 'Unable to fetch suppliers',
    getParams,
  });

  const columns = useMemo(() => [
    {
      Header: <Translate id="react.supplier.column.organization.label" defaultMessage="Supplier Organization" />,
      accessor: 'organization',
      className: 'd-flex align-items-center',
      headerClassName: 'header',
      sortable: false,
      Cell: (row) => (
        <TableCell
          {...row}
          value={row.original.organization?.name}
          link={row.original.organization?.id
            ? SUPPLIER_URL.show(row.original.organization.id)
            : undefined}
        />
      ),
    },
    {
      Header: <Translate id="react.supplier.column.location.label" defaultMessage="Supplier Location" />,
      accessor: 'name',
      className: 'd-flex align-items-center',
      headerClassName: 'header',
      sortable: false,
      Cell: (row) => (
        <TableCell
          {...row}
          link={`${CONTEXT_PATH}/location/show/${row.original.id}`}
        />
      ),
    },
    {
      Header: <Translate id="react.supplier.column.openPurchaseOrders.label" defaultMessage="No. of Open POs" />,
      accessor: 'pendingOrdersCount',
      className: 'd-flex align-items-center',
      headerClassName: 'header',
      sortable: false,
      Cell: (row) => (
        <TableCell
          {...row}
          value={`${row.value ?? 0}`}
          link={`${CONTEXT_PATH}/purchaseOrder/list?origin=${row.original.id}`}
        />
      ),
    },
    {
      Header: <Translate id="react.supplier.column.openShipments.label" defaultMessage="No. of Open Shipments" />,
      accessor: 'pendingShipmentsCount',
      className: 'd-flex align-items-center',
      headerClassName: 'header',
      sortable: false,
      Cell: (row) => (
        <TableCell
          {...row}
          value={`${row.value ?? 0}`}
          link={pendingShipmentsUrl(row.original.id)}
        />
      ),
    },
  ], []);

  return (
    <div className="d-flex flex-column list-page-main">
      <div className="d-flex list-page-header">
        <span className="d-flex align-self-center title">
          <Translate id="react.supplier.list.label" defaultMessage="List Suppliers" />
        </span>
      </div>
      <div className="list-page-list-section">
        <div className="title-text p-3 d-flex justify-content-between align-items-center">
          <span>
            <Translate id="react.supplier.list.label" defaultMessage="List Suppliers" />
          </span>
          <form
            className="d-flex align-items-center gap-8"
            onSubmit={(e) => {
              e.preventDefault();
              setFilterParams({ q: searchTerm });
            }}
          >
            <input
              className="form-control"
              type="text"
              placeholder={translate('react.supplier.searchByName.label', 'Search by organization name or location name')}
              aria-label={translate('react.supplier.searchByName.label', 'Search by organization name or location name')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Button
              type="submit"
              defaultLabel="Find"
              label="react.default.button.find.label"
              variant="primary-outline"
            />
          </form>
        </div>
        <DataTable
          manual
          ref={tableRef}
          columns={columns}
          data={tableData.data}
          loading={loading}
          defaultPageSize={10}
          pages={tableData.pages}
          totalData={tableData.totalCount}
          onFetchData={onFetchHandler}
          noDataText={translate('react.supplier.empty.label', 'No suppliers match the given criteria')}
        />
      </div>
    </div>
  );
};

export default SupplierList;
