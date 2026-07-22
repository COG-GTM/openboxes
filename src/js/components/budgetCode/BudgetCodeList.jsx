import React, { useMemo, useState } from 'react';

import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';

import { BUDGET_CODE_API } from 'api/urls';
import DataTable, { TableCell } from 'components/DataTable';
import DateCell from 'components/DataTable/DateCell';
import Button from 'components/form-elements/Button';
import { BUDGET_CODE_URL } from 'consts/applicationUrls';
import useTableData from 'hooks/list-pages/useTableData';
import useTranslate from 'hooks/useTranslate';
import useTranslation from 'hooks/useTranslation';
import StatusIndicator from 'utils/StatusIndicator';
import Translate from 'utils/Translate';

const BudgetCodeList = () => {
  useTranslation('budgetCode', 'reactTable', 'default');

  const translate = useTranslate();

  const isUserAdmin = useSelector((state) => state.session.isUserAdmin);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterParams, setFilterParams] = useState({ q: '' });

  const getParams = ({ offset, state, sortingParams }) => ({
    offset: `${offset}`,
    max: `${state.pageSize}`,
    ...sortingParams,
    ...(filterParams.q ? { q: filterParams.q } : {}),
  });

  const {
    tableRef,
    loading,
    tableData,
    onFetchHandler,
  } = useTableData({
    filterParams,
    url: BUDGET_CODE_API,
    errorMessageId: 'react.budgetCode.fetch.fail.label',
    defaultErrorMessage: 'Unable to fetch budget codes',
    defaultSorting: {
      sort: 'code',
      order: 'asc',
    },
    getParams,
  });

  const columns = useMemo(() => [
    {
      Header: <Translate id="react.budgetCode.column.active.label" defaultMessage="Active" />,
      accessor: 'active',
      className: 'active-circle d-flex justify-content-center align-items-center',
      headerClassName: 'header justify-content-center',
      maxWidth: 150,
      Cell: (row) => (
        <StatusIndicator
          variant={row.original.active ? 'success' : 'danger'}
          status={row.original.active ? 'Active' : 'Inactive'}
        />
      ),
    },
    {
      Header: <Translate id="react.budgetCode.column.code.label" defaultMessage="Code" />,
      accessor: 'code',
      className: 'd-flex align-items-center',
      headerClassName: 'header',
      Cell: (row) => <TableCell {...row} link={BUDGET_CODE_URL.edit(row.original.id)} />,
    },
    {
      Header: <Translate id="react.budgetCode.column.name.label" defaultMessage="Name" />,
      accessor: 'name',
      className: 'd-flex align-items-center',
      headerClassName: 'header',
    },
    {
      Header: <Translate id="react.budgetCode.column.description.label" defaultMessage="Description" />,
      accessor: 'description',
      className: 'd-flex align-items-center',
      headerClassName: 'header',
    },
    {
      Header: <Translate id="react.budgetCode.column.organization.label" defaultMessage="Organization" />,
      accessor: 'organization.name',
      className: 'd-flex align-items-center',
      headerClassName: 'header',
      sortable: false,
    },
    {
      Header: <Translate id="react.budgetCode.column.dateCreated.label" defaultMessage="Date Created" />,
      accessor: 'dateCreated',
      className: 'd-flex align-items-center',
      headerClassName: 'header',
      Cell: (row) => <DateCell {...row} tooltip />,
    },
    {
      Header: <Translate id="react.budgetCode.column.lastUpdated.label" defaultMessage="Date Updated" />,
      accessor: 'lastUpdated',
      className: 'd-flex align-items-center',
      headerClassName: 'header',
      Cell: (row) => <DateCell {...row} tooltip />,
    },
  ], []);

  return (
    <div className="d-flex flex-column list-page-main">
      <div className="d-flex list-page-header">
        <span className="d-flex align-self-center title">
          <Translate id="react.budgetCode.list.label" defaultMessage="List Budget Codes" />
        </span>
        {isUserAdmin && (
          <div className="d-flex justify-content-end buttons align-items-center">
            <Link to={BUDGET_CODE_URL.create()}>
              <Button
                defaultLabel="Create Budget Code"
                label="react.budgetCode.createBudgetCode.label"
                variant="primary"
              />
            </Link>
          </div>
        )}
      </div>
      <div className="list-page-list-section">
        <div className="title-text p-3 d-flex justify-content-between align-items-center">
          <span>
            <Translate id="react.budgetCode.list.label" defaultMessage="List Budget Codes" />
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
              placeholder={translate('react.budgetCode.searchByCode.label', 'Search by code')}
              aria-label={translate('react.budgetCode.searchByCode.label', 'Search by code')}
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
          sortable
          ref={tableRef}
          columns={columns}
          data={tableData.data}
          loading={loading}
          defaultPageSize={10}
          pages={tableData.pages}
          totalData={tableData.totalCount}
          onFetchData={onFetchHandler}
          noDataText={translate('react.budgetCode.empty.label', 'No budget codes match the given criteria')}
        />
      </div>
    </div>
  );
};

export default BudgetCodeList;
