import React, { useMemo } from 'react';

import moment from 'moment';

import { SHIPMENT_WORKFLOW_API } from 'api/urls';
import DataTable, { TableCell } from 'components/DataTable';
import { SHIPMENT_WORKFLOW_URL } from 'consts/applicationUrls';
import useTableData from 'hooks/list-pages/useTableData';
import useTranslate from 'hooks/useTranslate';
import useTranslation from 'hooks/useTranslation';
import Translate from 'utils/Translate';

// Stable reference: useTableData refetches whenever the filterParams
// reference changes (see PartyRoleList).
const FILTER_PARAMS = { q: '' };

const ShipmentWorkflowList = () => {
  useTranslation('shipmentWorkflow', 'reactTable', 'default');

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
    url: SHIPMENT_WORKFLOW_API,
    errorMessageId: 'react.shipmentWorkflow.fetch.fail.label',
    defaultErrorMessage: 'Unable to fetch shipment workflows',
    defaultSorting: {
      sort: 'name',
      order: 'asc',
    },
    getParams,
  });

  const columns = useMemo(() => [
    {
      Header: <Translate id="react.shipmentWorkflow.column.name.label" defaultMessage="Name" />,
      accessor: 'name',
      className: 'd-flex align-items-center',
      headerClassName: 'header',
      Cell: (row) => <TableCell {...row} link={SHIPMENT_WORKFLOW_URL.show(row.original.id)} />,
    },
    {
      Header: <Translate id="react.shipmentWorkflow.column.shipmentType.label" defaultMessage="Shipment Type" />,
      accessor: 'shipmentType.name',
      sortable: false,
      className: 'd-flex align-items-center',
      headerClassName: 'header',
    },
    {
      Header: <Translate id="react.shipmentWorkflow.column.excludedFields.label" defaultMessage="Excluded Fields" />,
      accessor: 'excludedFields',
      className: 'd-flex align-items-center',
      headerClassName: 'header',
    },
    {
      Header: <Translate id="react.shipmentWorkflow.column.documentTemplate.label" defaultMessage="Document Template" />,
      accessor: 'documentTemplate',
      className: 'd-flex align-items-center',
      headerClassName: 'header',
    },
    {
      Header: <Translate id="react.shipmentWorkflow.column.dateCreated.label" defaultMessage="Date Created" />,
      accessor: 'dateCreated',
      className: 'd-flex align-items-center',
      headerClassName: 'header',
      Cell: (row) => (
        <span className="mx-1">
          {row.value ? moment(row.value).format('DD/MMM/YYYY') : ''}
        </span>
      ),
    },
  ], []);

  return (
    <div className="d-flex flex-column list-page-main">
      <div className="d-flex list-page-header">
        <span className="d-flex align-self-center title">
          <Translate id="react.shipmentWorkflow.list.label" defaultMessage="List Shipment Workflows" />
        </span>
      </div>
      <div className="list-page-list-section">
        <div className="title-text p-3 d-flex justify-content-between align-items-center">
          <span>
            <Translate id="react.shipmentWorkflow.list.label" defaultMessage="List Shipment Workflows" />
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
          noDataText={translate('react.shipmentWorkflow.empty.label', 'No shipment workflows match the given criteria')}
        />
      </div>
    </div>
  );
};

export default ShipmentWorkflowList;
