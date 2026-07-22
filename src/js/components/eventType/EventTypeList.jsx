import React, { useMemo, useState } from 'react';

import { useSelector } from 'react-redux';

import { EVENT_TYPE_API } from 'api/urls';
import DataTable, { TableCell } from 'components/DataTable';
import Button from 'components/form-elements/Button';
import { EVENT_TYPE_URL } from 'consts/applicationUrls';
import useTableData from 'hooks/list-pages/useTableData';
import useTranslate from 'hooks/useTranslate';
import useTranslation from 'hooks/useTranslation';
import Translate from 'utils/Translate';

const EventTypeList = () => {
  useTranslation('eventType', 'reactTable', 'default');

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
    url: EVENT_TYPE_API,
    errorMessageId: 'react.eventType.fetch.fail.label',
    defaultErrorMessage: 'Unable to fetch event types',
    defaultSorting: {
      sort: 'sortOrder',
      order: 'asc',
    },
    getParams,
  });

  const columns = useMemo(() => [
    {
      Header: <Translate id="react.eventType.column.id.label" defaultMessage="Id" />,
      accessor: 'id',
      className: 'd-flex align-items-center',
      headerClassName: 'header',
      maxWidth: 150,
      Cell: (row) => <TableCell {...row} link={EVENT_TYPE_URL.show(row.original.id)} />,
    },
    {
      Header: <Translate id="react.eventType.column.name.label" defaultMessage="Name" />,
      accessor: 'name',
      className: 'd-flex align-items-center',
      headerClassName: 'header',
      Cell: (row) => <TableCell {...row} link={EVENT_TYPE_URL.edit(row.original.id)} />,
    },
    {
      Header: <Translate id="react.eventType.column.description.label" defaultMessage="Description" />,
      accessor: 'description',
      className: 'd-flex align-items-center',
      headerClassName: 'header',
    },
    {
      Header: <Translate id="react.eventType.column.sortOrder.label" defaultMessage="Sort Order" />,
      accessor: 'sortOrder',
      className: 'd-flex align-items-center',
      headerClassName: 'header',
    },
    {
      Header: <Translate id="react.eventType.column.eventCode.label" defaultMessage="Event Status" />,
      accessor: 'eventCode',
      className: 'd-flex align-items-center',
      headerClassName: 'header',
    },
  ], []);

  return (
    <div className="d-flex flex-column list-page-main">
      <div className="d-flex list-page-header">
        <span className="d-flex align-self-center title">
          <Translate id="react.eventType.list.label" defaultMessage="List Event Types" />
        </span>
        {isUserAdmin && (
          <div className="d-flex justify-content-end buttons align-items-center">
            <a href={EVENT_TYPE_URL.create()}>
              <Button
                defaultLabel="Add Event Type"
                label="react.eventType.addEventType.label"
                variant="primary"
              />
            </a>
          </div>
        )}
      </div>
      <div className="list-page-list-section">
        <div className="title-text p-3 d-flex justify-content-between align-items-center">
          <span>
            <Translate id="react.eventType.list.label" defaultMessage="List Event Types" />
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
              placeholder={translate('react.eventType.searchByName.label', 'Search by name')}
              aria-label={translate('react.eventType.searchByName.label', 'Search by name')}
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
          noDataText={translate('react.eventType.empty.label', 'No event types match the given criteria')}
        />
      </div>
    </div>
  );
};

export default EventTypeList;
