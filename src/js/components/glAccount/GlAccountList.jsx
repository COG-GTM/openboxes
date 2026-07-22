import React, { useMemo } from 'react';

import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';

import { GL_ACCOUNT_API } from 'api/urls';
import DataTable, { TableCell } from 'components/DataTable';
import DateCell from 'components/DataTable/DateCell';
import Button from 'components/form-elements/Button';
import { GL_ACCOUNT_URL } from 'consts/applicationUrls';
import useTableData from 'hooks/list-pages/useTableData';
import useTranslate from 'hooks/useTranslate';
import useTranslation from 'hooks/useTranslation';
import StatusIndicator from 'utils/StatusIndicator';
import Translate from 'utils/Translate';

const FILTER_PARAMS = { initialized: true };

const GlAccountList = () => {
  useTranslation('glAccount', 'reactTable', 'default');

  const translate = useTranslate();

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
    url: GL_ACCOUNT_API,
    errorMessageId: 'react.glAccount.fetch.fail.label',
    defaultErrorMessage: 'Unable to fetch GL accounts',
    defaultSorting: {
      sort: 'code',
      order: 'asc',
    },
    getParams,
  });

  const columns = useMemo(() => [
    {
      Header: <Translate id="react.glAccount.column.active.label" defaultMessage="Active" />,
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
      Header: <Translate id="react.glAccount.column.code.label" defaultMessage="Code" />,
      accessor: 'code',
      className: 'd-flex align-items-center',
      headerClassName: 'header',
      Cell: (row) => <TableCell {...row} link={GL_ACCOUNT_URL.edit(row.original.id)} />,
    },
    {
      Header: <Translate id="react.glAccount.column.name.label" defaultMessage="Name" />,
      accessor: 'name',
      className: 'd-flex align-items-center',
      headerClassName: 'header',
    },
    {
      Header: <Translate id="react.glAccount.column.description.label" defaultMessage="Description" />,
      accessor: 'description',
      className: 'd-flex align-items-center',
      headerClassName: 'header',
    },
    {
      Header: <Translate id="react.glAccount.column.glAccountType.label" defaultMessage="GL Account Type" />,
      accessor: 'glAccountType.code',
      className: 'd-flex align-items-center',
      headerClassName: 'header',
      sortable: false,
    },
    {
      Header: <Translate id="react.glAccount.column.dateCreated.label" defaultMessage="Date Created" />,
      accessor: 'dateCreated',
      className: 'd-flex align-items-center',
      headerClassName: 'header',
      Cell: (row) => <DateCell {...row} tooltip />,
    },
    {
      Header: <Translate id="react.glAccount.column.lastUpdated.label" defaultMessage="Date Updated" />,
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
          <Translate id="react.glAccount.list.label" defaultMessage="List GL Accounts" />
        </span>
        {isUserAdmin && (
          <div className="d-flex justify-content-end buttons align-items-center">
            <Link to={GL_ACCOUNT_URL.create()}>
              <Button
                defaultLabel="Create GL Account"
                label="react.glAccount.createGlAccount.label"
                variant="primary"
              />
            </Link>
          </div>
        )}
      </div>
      <div className="list-page-list-section">
        <div className="title-text p-3 d-flex justify-content-between align-items-center">
          <span>
            <Translate id="react.glAccount.list.label" defaultMessage="List GL Accounts" />
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
          noDataText={translate('react.glAccount.empty.label', 'No GL accounts match the given criteria')}
        />
      </div>
    </div>
  );
};

export default GlAccountList;
