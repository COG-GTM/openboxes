import React, { useMemo } from 'react';

import { SHIPMENT_ITEM_API } from 'api/urls';
import DataTable, { TableCell } from 'components/DataTable';
import DateCell from 'components/DataTable/DateCell';
import Button from 'components/form-elements/Button';
import { SHIPMENT_ITEM_URL } from 'consts/applicationUrls';
import useTableData from 'hooks/list-pages/useTableData';
import useTranslate from 'hooks/useTranslate';
import useTranslation from 'hooks/useTranslation';
import Translate from 'utils/Translate';

// useTableData only fetches when filterParams is non-empty, and its
// callbacks depend on the reference, so use a stable module-level constant.
const FILTER_PARAMS = { initialized: true };

const ShipmentItemList = () => {
  useTranslation('shipmentItem', 'reactTable', 'default');

  const translate = useTranslate();

  const getParams = ({ offset, state, sortingParams }) => ({
    offset: `${offset}`,
    max: `${state.pageSize}`,
    ...sortingParams,
  });

  const {
    tableRef,
    loading,
    tableData,
    onFetchHandler,
  } = useTableData({
    filterParams: FILTER_PARAMS,
    url: SHIPMENT_ITEM_API,
    errorMessageId: 'react.shipmentItem.fetch.fail.label',
    defaultErrorMessage: 'Unable to fetch shipment items',
    defaultSorting: {
      sort: 'id',
      order: 'asc',
    },
    getParams,
  });

  const columns = useMemo(() => [
    {
      Header: <Translate id="react.shipmentItem.column.id.label" defaultMessage="Id" />,
      accessor: 'id',
      className: 'd-flex align-items-center',
      headerClassName: 'header',
      Cell: (row) => (
        <TableCell {...row} link={SHIPMENT_ITEM_URL.edit(row.original.id)} />
      ),
    },
    {
      Header: <Translate id="react.shipmentItem.column.container.label" defaultMessage="Container" />,
      accessor: 'container.name',
      sortable: false,
      className: 'd-flex align-items-center',
      headerClassName: 'header',
    },
    {
      Header: <Translate id="react.shipmentItem.column.product.label" defaultMessage="Product" />,
      accessor: 'product.name',
      sortable: false,
      className: 'd-flex align-items-center',
      headerClassName: 'header',
    },
    {
      Header: <Translate id="react.shipmentItem.column.lotNumber.label" defaultMessage="Lot Number" />,
      accessor: 'lotNumber',
      className: 'd-flex align-items-center',
      headerClassName: 'header',
    },
    {
      Header: <Translate id="react.shipmentItem.column.expirationDate.label" defaultMessage="Expiration Date" />,
      accessor: 'expirationDate',
      className: 'd-flex align-items-center',
      headerClassName: 'header',
      Cell: (row) => <DateCell {...row} />,
    },
    {
      Header: <Translate id="react.shipmentItem.column.quantity.label" defaultMessage="Quantity" />,
      accessor: 'quantity',
      className: 'd-flex align-items-center',
      headerClassName: 'header',
      maxWidth: 120,
    },
  ], []);

  return (
    <div className="d-flex flex-column list-page-main">
      <div className="d-flex list-page-header">
        <span className="d-flex align-self-center title">
          <Translate id="react.shipmentItem.list.label" defaultMessage="List Shipment Items" />
        </span>
        <div className="d-flex justify-content-end buttons align-items-center">
          <Button
            defaultLabel="Add Shipment Item"
            label="react.shipmentItem.add.label"
            variant="primary"
            // The shipment item create screen is still a legacy GSP screen,
            // so leave the SPA entirely.
            onClick={() => { window.location.href = SHIPMENT_ITEM_URL.create(); }}
          />
        </div>
      </div>
      <div className="list-page-list-section">
        <div className="title-text p-3 d-flex justify-content-between align-items-center">
          <span>
            <Translate id="react.shipmentItem.list.label" defaultMessage="List Shipment Items" />
          </span>
        </div>
        <DataTable
          manual
          sortable
          ref={tableRef}
          columns={columns}
          data={tableData.data}
          loading={loading}
          defaultPageSize={10}
          pages={tableData.pages}
          totalData={tableData.totalCount}
          onFetchData={onFetchHandler}
          noDataText={translate('react.shipmentItem.empty.label', 'No shipment items match the given criteria')}
        />
      </div>
    </div>
  );
};

export default ShipmentItemList;
