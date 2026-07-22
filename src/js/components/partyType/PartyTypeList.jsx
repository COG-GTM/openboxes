import React, { useMemo, useState } from 'react';

import { Link } from 'react-router-dom';

import { PARTY_TYPE_API } from 'api/urls';
import DataTable, { TableCell } from 'components/DataTable';
import DateCell from 'components/DataTable/DateCell';
import Button from 'components/form-elements/Button';
import { PARTY_TYPE_URL } from 'consts/applicationUrls';
import useTableData from 'hooks/list-pages/useTableData';
import useTranslate from 'hooks/useTranslate';
import useTranslation from 'hooks/useTranslation';
import Translate from 'utils/Translate';

const PartyTypeList = () => {
  useTranslation('partyType', 'reactTable', 'default');

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
  } = useTableData({
    filterParams,
    url: PARTY_TYPE_API,
    errorMessageId: 'react.partyType.fetch.fail.label',
    defaultErrorMessage: 'Unable to fetch party types',
    defaultSorting: {
      sort: 'id',
      order: 'asc',
    },
    getParams,
  });

  const columns = useMemo(() => [
    {
      Header: <Translate id="react.partyType.column.id.label" defaultMessage="Id" />,
      accessor: 'id',
      className: 'd-flex align-items-center',
      headerClassName: 'header',
      maxWidth: 250,
      Cell: (row) => <TableCell {...row} link={PARTY_TYPE_URL.show(row.original.id)} />,
    },
    {
      Header: <Translate id="react.partyType.column.code.label" defaultMessage="Code" />,
      accessor: 'code',
      className: 'd-flex align-items-center',
      headerClassName: 'header',
    },
    {
      Header: <Translate id="react.partyType.column.name.label" defaultMessage="Name" />,
      accessor: 'name',
      className: 'd-flex align-items-center',
      headerClassName: 'header',
      Cell: (row) => <TableCell {...row} link={PARTY_TYPE_URL.show(row.original.id)} />,
    },
    {
      Header: <Translate id="react.partyType.column.description.label" defaultMessage="Description" />,
      accessor: 'description',
      className: 'd-flex align-items-center',
      headerClassName: 'header',
    },
    {
      Header: <Translate id="react.partyType.column.dateCreated.label" defaultMessage="Date Created" />,
      accessor: 'dateCreated',
      className: 'd-flex align-items-center',
      headerClassName: 'header',
      Cell: (row) => <DateCell {...row} />,
    },
    {
      Header: <Translate id="react.partyType.column.lastUpdated.label" defaultMessage="Last Updated" />,
      accessor: 'lastUpdated',
      className: 'd-flex align-items-center',
      headerClassName: 'header',
      Cell: (row) => <DateCell {...row} />,
    },
    {
      Header: <Translate id="react.partyType.column.partyTypeCode.label" defaultMessage="Party Type Code" />,
      accessor: 'partyTypeCode',
      className: 'd-flex align-items-center',
      headerClassName: 'header',
    },
  ], []);

  return (
    <div className="d-flex flex-column list-page-main">
      <div className="d-flex list-page-header">
        <span className="d-flex align-self-center title">
          <Translate id="react.partyType.list.label" defaultMessage="List Party Types" />
        </span>
        <div className="d-flex justify-content-end buttons align-items-center">
          <Link to={PARTY_TYPE_URL.create()}>
            <Button
              defaultLabel="Add Party Type"
              label="react.partyType.addPartyType.label"
              variant="primary"
            />
          </Link>
        </div>
      </div>
      <div className="list-page-list-section">
        <div className="title-text p-3 d-flex justify-content-between align-items-center">
          <span>
            <Translate id="react.partyType.list.label" defaultMessage="List Party Types" />
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
              placeholder={translate('react.partyType.searchByName.label', 'Search by name')}
              aria-label={translate('react.partyType.searchByName.label', 'Search by name')}
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
          noDataText={translate('react.partyType.empty.label', 'No party types match the given criteria')}
        />
      </div>
    </div>
  );
};

export default PartyTypeList;
