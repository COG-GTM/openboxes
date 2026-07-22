import React, { useMemo, useState } from 'react';

import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';

import { PREFERENCE_TYPE_API } from 'api/urls';
import DataTable, { TableCell } from 'components/DataTable';
import DateCell from 'components/DataTable/DateCell';
import Button from 'components/form-elements/Button';
import { PREFERENCE_TYPE_URL } from 'consts/applicationUrls';
import useTableData from 'hooks/list-pages/useTableData';
import useTranslate from 'hooks/useTranslate';
import useTranslation from 'hooks/useTranslation';
import Translate from 'utils/Translate';

const PreferenceTypeList = () => {
  useTranslation('preferenceType', 'reactTable', 'default');

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
    url: PREFERENCE_TYPE_API,
    errorMessageId: 'react.preferenceType.fetch.fail.label',
    defaultErrorMessage: 'Unable to fetch preference types',
    defaultSorting: {
      sort: 'id',
      order: 'asc',
    },
    getParams,
  });

  const columns = useMemo(() => [
    {
      Header: <Translate id="react.preferenceType.column.id.label" defaultMessage="Id" />,
      accessor: 'id',
      className: 'd-flex align-items-center',
      headerClassName: 'header',
      maxWidth: 250,
      Cell: (row) => <TableCell {...row} link={PREFERENCE_TYPE_URL.edit(row.original.id)} />,
    },
    {
      Header: <Translate id="react.preferenceType.column.name.label" defaultMessage="Name" />,
      accessor: 'name',
      className: 'd-flex align-items-center',
      headerClassName: 'header',
      Cell: (row) => <TableCell {...row} link={PREFERENCE_TYPE_URL.edit(row.original.id)} />,
    },
    {
      Header: <Translate id="react.preferenceType.column.validationCode.label" defaultMessage="Validation Code" />,
      accessor: 'validationCode',
      className: 'd-flex align-items-center',
      headerClassName: 'header',
    },
    {
      Header: <Translate id="react.preferenceType.column.dateCreated.label" defaultMessage="Date Created" />,
      accessor: 'dateCreated',
      className: 'd-flex align-items-center',
      headerClassName: 'header',
      Cell: (row) => <DateCell {...row} />,
    },
    {
      Header: <Translate id="react.preferenceType.column.lastUpdated.label" defaultMessage="Date Updated" />,
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
          <Translate id="react.preferenceType.list.label" defaultMessage="List Preference Types" />
        </span>
        {isUserAdmin && (
          <div className="d-flex justify-content-end buttons align-items-center">
            <Link to={PREFERENCE_TYPE_URL.create()}>
              <Button
                defaultLabel="Add Preference Type"
                label="react.preferenceType.add.label"
                variant="primary"
              />
            </Link>
          </div>
        )}
      </div>
      <div className="list-page-list-section">
        <div className="title-text p-3 d-flex justify-content-between align-items-center">
          <span>
            <Translate id="react.preferenceType.list.label" defaultMessage="List Preference Types" />
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
              placeholder={translate('react.preferenceType.searchByName.label', 'Search by name')}
              aria-label={translate('react.preferenceType.searchByName.label', 'Search by name')}
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
          noDataText={translate('react.preferenceType.empty.label', 'No preference types match the given criteria')}
        />
      </div>
    </div>
  );
};

export default PreferenceTypeList;
