import React, { useMemo, useState } from 'react';

import { useSelector } from 'react-redux';

import { USER_LIST_API } from 'api/urls';
import DataTable, { TableCell } from 'components/DataTable';
import Button from 'components/form-elements/Button';
import { USER_URL } from 'consts/applicationUrls';
import useTableData from 'hooks/list-pages/useTableData';
import useTranslate from 'hooks/useTranslate';
import useTranslation from 'hooks/useTranslation';
import StatusIndicator from 'utils/StatusIndicator';
import Translate from 'utils/Translate';

const formatDate = (value) => (value ? new Date(value).toLocaleString() : '');

const UserList = () => {
  useTranslation('user', 'reactTable', 'default');

  const translate = useTranslate();

  const isUserAdmin = useSelector((state) => state.session.isUserAdmin);

  const [searchTerm, setSearchTerm] = useState('');
  const [status, setStatus] = useState('');
  const [filterParams, setFilterParams] = useState({ q: '', status: '' });

  const getParams = ({ offset, state, sortingParams }) => ({
    offset: `${offset}`,
    max: `${state.pageSize}`,
    ...sortingParams,
    // The derived "name" column sorts by lastName, matching the legacy list
    ...(sortingParams.sort === 'name' ? { sort: 'lastName' } : {}),
    ...(filterParams.q ? { q: filterParams.q } : {}),
    ...(filterParams.status ? { status: filterParams.status } : {}),
  });

  const {
    tableRef,
    loading,
    tableData,
    onFetchHandler,
  } = useTableData({
    filterParams,
    url: USER_LIST_API,
    errorMessageId: 'react.user.fetch.fail.label',
    defaultErrorMessage: 'Unable to fetch users',
    defaultSorting: {
      sort: 'username',
      order: 'asc',
    },
    getParams,
  });

  const columns = useMemo(() => [
    {
      Header: <Translate id="react.user.column.active.label" defaultMessage="Active" />,
      accessor: 'active',
      className: 'active-circle d-flex justify-content-center align-items-center',
      headerClassName: 'header justify-content-center',
      maxWidth: 100,
      Cell: (row) => (
        <StatusIndicator
          status={row.value
            ? translate('react.user.active.label', 'Active')
            : translate('react.user.inactive.label', 'Inactive')}
          variant={row.value ? 'success' : 'danger'}
        />
      ),
    },
    {
      Header: <Translate id="react.user.column.username.label" defaultMessage="Username" />,
      accessor: 'username',
      className: 'd-flex align-items-center',
      headerClassName: 'header',
      Cell: (row) => <TableCell {...row} link={USER_URL.edit(row.original.id)} />,
    },
    {
      Header: <Translate id="react.user.column.name.label" defaultMessage="Name" />,
      accessor: 'name',
      className: 'd-flex align-items-center',
      headerClassName: 'header',
      Cell: (row) => <TableCell {...row} link={USER_URL.show(row.original.id)} />,
    },
    {
      Header: <Translate id="react.user.column.email.label" defaultMessage="Email" />,
      accessor: 'email',
      className: 'd-flex align-items-center',
      headerClassName: 'header',
    },
    {
      Header: <Translate id="react.user.column.locale.label" defaultMessage="Locale" />,
      accessor: 'localeDisplayName',
      className: 'd-flex align-items-center',
      headerClassName: 'header',
      sortable: false,
      maxWidth: 120,
    },
    {
      Header: <Translate id="react.user.column.roles.label" defaultMessage="Roles" />,
      accessor: 'roles',
      className: 'd-flex align-items-center',
      headerClassName: 'header',
      sortable: false,
    },
    {
      Header: <Translate id="react.user.column.lastLoginDate.label" defaultMessage="Last Login" />,
      accessor: 'lastLoginDate',
      className: 'd-flex align-items-center',
      headerClassName: 'header',
      Cell: (row) => <span>{formatDate(row.value)}</span>,
    },
  ], [translate]);

  return (
    <div className="d-flex flex-column list-page-main">
      <div className="d-flex list-page-header">
        <span className="d-flex align-self-center title">
          <Translate id="react.user.list.label" defaultMessage="List Users" />
        </span>
        {isUserAdmin && (
          <div className="d-flex justify-content-end buttons align-items-center">
            <a href={USER_URL.create()}>
              <Button
                defaultLabel="Add User"
                label="react.user.addUser.label"
                variant="primary"
              />
            </a>
          </div>
        )}
      </div>
      <div className="list-page-list-section">
        <div className="title-text p-3 d-flex justify-content-between align-items-center">
          <span>
            <Translate id="react.user.list.label" defaultMessage="List Users" />
          </span>
          <form
            className="d-flex align-items-center gap-8"
            onSubmit={(e) => {
              e.preventDefault();
              setFilterParams({ q: searchTerm, status });
            }}
          >
            <input
              className="form-control"
              type="text"
              placeholder={translate('react.user.searchByNameOrEmail.label', 'Search by name, username or email')}
              aria-label={translate('react.user.searchByNameOrEmail.label', 'Search by name, username or email')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <select
              className="form-control"
              aria-label={translate('react.user.status.label', 'Status')}
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="">{translate('react.user.status.all.label', 'All users')}</option>
              <option value="true">{translate('react.user.status.active.label', 'Active users only')}</option>
              <option value="false">{translate('react.user.status.inactive.label', 'Inactive users only')}</option>
            </select>
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
          noDataText={translate('react.user.empty.label', 'No users returned')}
        />
      </div>
    </div>
  );
};

export default UserList;
