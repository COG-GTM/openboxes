import React, { useMemo, useState } from 'react';

import { confirmAlert } from 'react-confirm-alert';
import { Link } from 'react-router-dom';

import personApi from 'api/services/PersonApi';
import { PERSON_SEARCH_API } from 'api/urls';
import DataTable, { TableCell } from 'components/DataTable';
import Button from 'components/form-elements/Button';
import notification from 'components/Layout/notifications/notification';
import { PERSON_URL } from 'consts/applicationUrls';
import NotificationType from 'consts/notificationTypes';
import useTableData from 'hooks/list-pages/useTableData';
import useTranslate from 'hooks/useTranslate';
import useTranslation from 'hooks/useTranslation';
import StatusIndicator from 'utils/StatusIndicator';
import Translate from 'utils/Translate';

const PersonList = () => {
  useTranslation('person', 'reactTable', 'default');

  const translate = useTranslate();

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
    fireFetchData,
  } = useTableData({
    filterParams,
    url: PERSON_SEARCH_API,
    errorMessageId: 'react.person.fetch.fail.label',
    defaultErrorMessage: 'Unable to fetch people',
    defaultSorting: {
      sort: 'lastName',
      order: 'asc',
    },
    getParams,
  });

  const deletePerson = async (id) => {
    try {
      const { status } = await personApi.deletePerson(id);
      if (status === 204) {
        notification(NotificationType.SUCCESS)({
          message: translate('react.person.delete.success.label', 'Person has been deleted successfully'),
        });
        fireFetchData();
      }
    } catch (error) {
      // apiClient's response interceptor already notifies the user
    }
  };

  const onDelete = (id) => {
    confirmAlert({
      title: translate('react.default.areYouSure.label', 'Are you sure?'),
      message: translate(
        'react.person.delete.confirm.label',
        'Are you sure you want to delete this person?',
      ),
      buttons: [
        {
          label: translate('react.default.yes.label', 'Yes'),
          onClick: () => deletePerson(id),
        },
        {
          label: translate('react.default.no.label', 'No'),
        },
      ],
    });
  };

  const columns = useMemo(() => [
    {
      Header: <Translate id="react.person.column.active.label" defaultMessage="Active" />,
      accessor: 'active',
      className: 'active-circle d-flex justify-content-center align-items-center',
      headerClassName: 'header justify-content-center',
      maxWidth: 150,
      Cell: (row) => (<StatusIndicator status={row.value ? 'Active' : 'Inactive'} variant={row.value ? 'success' : 'danger'} />),
    },
    {
      Header: <Translate id="react.person.column.name.label" defaultMessage="Name" />,
      accessor: 'name',
      className: 'd-flex align-items-center',
      headerClassName: 'header',
      sortable: false,
      Cell: (row) => <TableCell {...row} link={PERSON_URL.edit(row.original.id)} />,
    },
    {
      Header: <Translate id="react.person.column.type.label" defaultMessage="Type" />,
      accessor: 'type',
      className: 'd-flex align-items-center',
      headerClassName: 'header',
      sortable: false,
      maxWidth: 120,
      Cell: (row) => <TableCell {...row} link={PERSON_URL.show(row.original.id)} />,
    },
    {
      Header: <Translate id="react.person.column.email.label" defaultMessage="Email" />,
      accessor: 'email',
      className: 'd-flex align-items-center',
      headerClassName: 'header',
    },
    {
      Header: <Translate id="react.person.column.phoneNumber.label" defaultMessage="Phone Number" />,
      accessor: 'phoneNumber',
      className: 'd-flex align-items-center',
      headerClassName: 'header',
    },
    {
      Header: <Translate id="react.default.actions.label" defaultMessage="Actions" />,
      accessor: 'id',
      className: 'd-flex align-items-center',
      headerClassName: 'header',
      sortable: false,
      maxWidth: 120,
      Cell: (row) => (
        <button
          type="button"
          className="btn btn-link p-0"
          onClick={() => onDelete(row.original.id)}
        >
          <Translate id="react.default.button.delete.label" defaultMessage="Delete" />
        </button>
      ),
    },
  ], []);

  return (
    <div className="d-flex flex-column list-page-main">
      <div className="d-flex list-page-header">
        <span className="d-flex align-self-center title">
          <Translate id="react.person.list.label" defaultMessage="List People" />
        </span>
        <div className="d-flex justify-content-end buttons align-items-center">
          <Link to={PERSON_URL.create()}>
            <Button
              defaultLabel="Add Person"
              label="react.person.addPerson.label"
              variant="primary"
            />
          </Link>
        </div>
      </div>
      <div className="list-page-list-section">
        <div className="title-text p-3 d-flex justify-content-between align-items-center">
          <span>
            <Translate id="react.person.list.label" defaultMessage="List People" />
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
              placeholder={translate('react.person.searchByNameOrEmail.label', 'Search by name or email')}
              aria-label={translate('react.person.searchByNameOrEmail.label', 'Search by name or email')}
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
          noDataText={translate('react.person.empty.label', 'No people match the given criteria')}
        />
      </div>
    </div>
  );
};

export default PersonList;
