import React, { useMemo } from 'react';

import { useSelector } from 'react-redux';
import { useHistory } from 'react-router-dom';

import { UNIT_OF_MEASURE_CONVERSION_API } from 'api/urls';
import DataTable, { TableCell } from 'components/DataTable';
import DateCell from 'components/DataTable/DateCell';
import Button from 'components/form-elements/Button';
import { UNIT_OF_MEASURE_CONVERSION_URL } from 'consts/applicationUrls';
import useTableData from 'hooks/list-pages/useTableData';
import useTranslate from 'hooks/useTranslate';
import useTranslation from 'hooks/useTranslation';
import Translate from 'utils/Translate';

// useTableData only fetches when filterParams is non-empty, and its
// callbacks depend on the reference, so use a stable module-level constant.
const FILTER_PARAMS = { initialized: true };

const UnitOfMeasureConversionList = () => {
  useTranslation('unitOfMeasureConversion', 'reactTable', 'default');

  const history = useHistory();
  const translate = useTranslate();
  // The legacy GSP showed the create button only to admins (<g:isUserAdmin>)
  const isUserAdmin = useSelector((state) => state.session.isUserAdmin);

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
    url: UNIT_OF_MEASURE_CONVERSION_API,
    errorMessageId: 'react.unitOfMeasureConversion.fetch.fail.label',
    defaultErrorMessage: 'Unable to fetch unit of measure conversions',
    defaultSorting: {
      sort: 'dateCreated',
      order: 'asc',
    },
    getParams,
  });

  const columns = useMemo(() => [
    {
      Header: <Translate id="react.unitOfMeasureConversion.column.id.label" defaultMessage="Id" />,
      accessor: 'id',
      className: 'd-flex align-items-center',
      headerClassName: 'header',
      Cell: (row) => (
        <TableCell {...row} link={UNIT_OF_MEASURE_CONVERSION_URL.edit(row.original.id)} />
      ),
    },
    {
      Header: <Translate id="react.unitOfMeasureConversion.column.active.label" defaultMessage="Active" />,
      accessor: 'active',
      className: 'd-flex align-items-center',
      headerClassName: 'header',
      maxWidth: 100,
      Cell: (row) => (
        <TableCell {...row} value={row.value ? 'true' : 'false'} />
      ),
    },
    {
      Header: <Translate id="react.unitOfMeasureConversion.column.fromUnitOfMeasure.label" defaultMessage="From Unit of Measure" />,
      accessor: 'fromUnitOfMeasure.name',
      id: 'fromUnitOfMeasure',
      className: 'd-flex align-items-center',
      headerClassName: 'header',
    },
    {
      Header: <Translate id="react.unitOfMeasureConversion.column.toUnitOfMeasure.label" defaultMessage="To Unit of Measure" />,
      accessor: 'toUnitOfMeasure.name',
      id: 'toUnitOfMeasure',
      className: 'd-flex align-items-center',
      headerClassName: 'header',
    },
    {
      Header: <Translate id="react.unitOfMeasureConversion.column.conversionRate.label" defaultMessage="Conversion Rate" />,
      accessor: 'conversionRate',
      className: 'd-flex align-items-center',
      headerClassName: 'header',
      maxWidth: 140,
      Cell: (row) => (
        <TableCell
          {...row}
          value={row.value !== null && row.value !== undefined ? `${Number(row.value)}` : ''}
        />
      ),
    },
    {
      Header: <Translate id="react.unitOfMeasureConversion.column.dateCreated.label" defaultMessage="Date Created" />,
      accessor: 'dateCreated',
      className: 'd-flex align-items-center',
      headerClassName: 'header',
      Cell: (row) => <DateCell {...row} />,
    },
    {
      Header: <Translate id="react.unitOfMeasureConversion.column.lastUpdated.label" defaultMessage="Last Updated" />,
      accessor: 'lastUpdated',
      className: 'd-flex align-items-center',
      headerClassName: 'header',
      Cell: (row) => <DateCell {...row} />,
    },
  ], []);

  return (
    <div className="d-flex flex-column list-page-main">
      <div className="d-flex list-page-header">
        <span className="d-flex align-self-center title">
          <Translate id="react.unitOfMeasureConversion.list.label" defaultMessage="List Uom Conversions" />
        </span>
        <div className="d-flex justify-content-end buttons align-items-center">
          {isUserAdmin && (
            <Button
              defaultLabel="Add Uom Conversion"
              label="react.unitOfMeasureConversion.add.label"
              variant="primary"
              onClick={() => history.push(UNIT_OF_MEASURE_CONVERSION_URL.create())}
            />
          )}
        </div>
      </div>
      <div className="list-page-list-section">
        <div className="title-text p-3 d-flex justify-content-between align-items-center">
          <span>
            <Translate id="react.unitOfMeasureConversion.list.label" defaultMessage="List Uom Conversions" />
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
          noDataText={translate('react.unitOfMeasureConversion.empty.label', 'No unit of measure conversions match the given criteria')}
        />
      </div>
    </div>
  );
};

export default UnitOfMeasureConversionList;
