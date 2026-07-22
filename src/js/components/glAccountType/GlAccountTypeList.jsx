import React, { useMemo } from 'react';

import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';

import { GL_ACCOUNT_TYPE_API } from 'api/urls';
import DataTable, { TableCell } from 'components/DataTable';
import DateCell from 'components/DataTable/DateCell';
import Button from 'components/form-elements/Button';
import { GL_ACCOUNT_TYPE_URL } from 'consts/applicationUrls';
import useTableData from 'hooks/list-pages/useTableData';
import useTranslate from 'hooks/useTranslate';
import useTranslation from 'hooks/useTranslation';
import Translate from 'utils/Translate';

const FILTER_PARAMS = { initialized: true };

const GlAccountTypeList = () => {
  useTranslation('glAccountType', 'reactTable', 'default');

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
    url: GL_ACCOUNT_TYPE_API,
    errorMessageId: 'react.glAccountType.fetch.fail.label',
    defaultErrorMessage: 'Unable to fetch GL account types',
    defaultSorting: {
      sort: 'code',
      order: 'asc',
    },
    getParams,
  });

  const columns = useMemo(() => [
    {
      Header: <Translate id="react.glAccountType.column.code.label" defaultMessage="Code" />,
      accessor: 'code',
      className: 'd-flex align-items-center',
      headerClassName: 'header',
      Cell: (row) => <TableCell {...row} link={GL_ACCOUNT_TYPE_URL.edit(row.original.id)} />,
    },
    {
      Header: <Translate id="react.glAccountType.column.name.label" defaultMessage="Name" />,
      accessor: 'name',
      className: 'd-flex align-items-center',
      headerClassName: 'header',
    },
    {
      Header: <Translate id="react.glAccountType.column.glAccountTypeCode.label" defaultMessage="GL Account Type Code" />,
      accessor: 'glAccountTypeCode',
      className: 'd-flex align-items-center',
      headerClassName: 'header',
    },
    {
      Header: <Translate id="react.glAccountType.column.dateCreated.label" defaultMessage="Date Created" />,
      accessor: 'dateCreated',
      className: 'd-flex align-items-center',
      headerClassName: 'header',
      Cell: (row) => <DateCell {...row} tooltip />,
    },
    {
      Header: <Translate id="react.glAccountType.column.lastUpdated.label" defaultMessage="Date Updated" />,
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
          <Translate id="react.glAccountType.list.label" defaultMessage="List GL Account Types" />
        </span>
        {isUserAdmin && (
          <div className="d-flex justify-content-end buttons align-items-center">
            <Link to={GL_ACCOUNT_TYPE_URL.create()}>
              <Button
                defaultLabel="Create GL Account Type"
                label="react.glAccountType.createGlAccountType.label"
                variant="primary"
              />
            </Link>
          </div>
        )}
      </div>
      <div className="list-page-list-section">
        <div className="title-text p-3 d-flex justify-content-between align-items-center">
          <span>
            <Translate id="react.glAccountType.list.label" defaultMessage="List GL Account Types" />
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
          noDataText={translate('react.glAccountType.empty.label', 'No GL account types match the given criteria')}
        />
      </div>
    </div>
  );
};

export default GlAccountTypeList;
