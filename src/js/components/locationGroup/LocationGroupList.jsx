import React, { useMemo, useState } from 'react';

import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';

import { LOCATION_GROUP_SEARCH_API } from 'api/urls';
import DataTable, { TableCell } from 'components/DataTable';
import Button from 'components/form-elements/Button';
import { LOCATION_GROUP_URL } from 'consts/applicationUrls';
import useTableData from 'hooks/list-pages/useTableData';
import useTranslate from 'hooks/useTranslate';
import useTranslation from 'hooks/useTranslation';
import Translate from 'utils/Translate';

const LocationGroupList = () => {
  useTranslation('locationGroup', 'reactTable', 'default');

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
    url: LOCATION_GROUP_SEARCH_API,
    errorMessageId: 'react.locationGroup.fetch.fail.label',
    defaultErrorMessage: 'Unable to fetch location groups',
    defaultSorting: {
      sort: 'name',
      order: 'asc',
    },
    getParams,
  });

  const columns = useMemo(() => [
    {
      Header: <Translate id="react.locationGroup.column.name.label" defaultMessage="Name" />,
      accessor: 'name',
      className: 'd-flex align-items-center',
      headerClassName: 'header',
      Cell: (row) => <TableCell {...row} link={LOCATION_GROUP_URL.edit(row.original.id)} />,
    },
    {
      Header: <Translate id="react.locationGroup.column.description.label" defaultMessage="Description" />,
      accessor: 'description',
      className: 'd-flex align-items-center',
      headerClassName: 'header',
      sortable: false,
    },
    {
      Header: <Translate id="react.locationGroup.column.locations.label" defaultMessage="Locations" />,
      accessor: 'locationsCount',
      className: 'd-flex align-items-center',
      headerClassName: 'header',
      sortable: false,
      Cell: (row) => (
        <TableCell {...row} value={`${row.value ?? 0}`} link={LOCATION_GROUP_URL.show(row.original.id)} />
      ),
    },
  ], []);

  return (
    <div className="d-flex flex-column list-page-main">
      <div className="d-flex list-page-header">
        <span className="d-flex align-self-center title">
          <Translate id="react.locationGroup.list.label" defaultMessage="List Location Groups" />
        </span>
        {isUserAdmin && (
          <div className="d-flex justify-content-end buttons align-items-center">
            <Link to={LOCATION_GROUP_URL.create()}>
              <Button
                defaultLabel="Add Location Group"
                label="react.locationGroup.addLocationGroup.label"
                variant="primary"
              />
            </Link>
          </div>
        )}
      </div>
      <div className="list-page-list-section">
        <div className="title-text p-3 d-flex justify-content-between align-items-center">
          <span>
            <Translate id="react.locationGroup.list.label" defaultMessage="List Location Groups" />
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
              placeholder={translate('react.locationGroup.searchByName.label', 'Search by name')}
              aria-label={translate('react.locationGroup.searchByName.label', 'Search by name')}
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
          noDataText={translate('react.locationGroup.empty.label', 'No location groups match the given criteria')}
        />
      </div>
    </div>
  );
};

export default LocationGroupList;
