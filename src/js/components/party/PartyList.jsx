import React, { useMemo, useState } from 'react';

import { Link } from 'react-router-dom';

import { PARTY_SEARCH_API } from 'api/urls';
import DataTable, { TableCell } from 'components/DataTable';
import Button from 'components/form-elements/Button';
import { PARTY_URL } from 'consts/applicationUrls';
import useTableData from 'hooks/list-pages/useTableData';
import useTranslate from 'hooks/useTranslate';
import useTranslation from 'hooks/useTranslation';
import Translate from 'utils/Translate';

const PartyList = () => {
  useTranslation('party', 'reactTable', 'default');

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
    url: PARTY_SEARCH_API,
    errorMessageId: 'react.party.fetch.fail.label',
    defaultErrorMessage: 'Unable to fetch parties',
    defaultSorting: {
      sort: 'id',
      order: 'asc',
    },
    getParams,
  });

  const columns = useMemo(() => [
    {
      Header: <Translate id="react.party.column.id.label" defaultMessage="Id" />,
      accessor: 'id',
      className: 'd-flex align-items-center',
      headerClassName: 'header',
      Cell: (row) => <TableCell {...row} link={PARTY_URL.show(row.original.id)} />,
    },
    {
      Header: <Translate id="react.party.column.partyType.label" defaultMessage="Party Type" />,
      accessor: 'partyType',
      className: 'd-flex align-items-center',
      headerClassName: 'header',
      sortable: false,
    },
    {
      Header: <Translate id="react.party.column.roles.label" defaultMessage="Roles" />,
      accessor: 'roles',
      className: 'd-flex align-items-center',
      headerClassName: 'header',
      sortable: false,
      Cell: (row) => <TableCell {...row} value={(row.original.roles ?? []).join(', ')} />,
    },
  ], []);

  return (
    <div className="d-flex flex-column list-page-main">
      <div className="d-flex list-page-header">
        <span className="d-flex align-self-center title">
          <Translate id="react.party.list.label" defaultMessage="List Parties" />
        </span>
        <div className="d-flex justify-content-end buttons align-items-center">
          <Link to={PARTY_URL.create()}>
            <Button
              defaultLabel="Add Party"
              label="react.party.addParty.label"
              variant="primary"
            />
          </Link>
        </div>
      </div>
      <div className="list-page-list-section">
        <div className="title-text p-3 d-flex justify-content-between align-items-center">
          <span>
            <Translate id="react.party.list.label" defaultMessage="List Parties" />
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
              placeholder={translate('react.party.searchById.label', 'Search by id')}
              aria-label={translate('react.party.searchById.label', 'Search by id')}
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
          noDataText={translate('react.party.empty.label', 'No parties match the given criteria')}
        />
      </div>
    </div>
  );
};

export default PartyList;
