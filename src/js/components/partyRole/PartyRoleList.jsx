import React, { useMemo } from 'react';

import { Link } from 'react-router-dom';

import { PARTY_ROLE_API } from 'api/urls';
import DataTable, { TableCell } from 'components/DataTable';
import DateCell from 'components/DataTable/DateCell';
import Button from 'components/form-elements/Button';
import { PARTY_ROLE_URL, PARTY_URL } from 'consts/applicationUrls';
import useTableData from 'hooks/list-pages/useTableData';
import useTranslate from 'hooks/useTranslate';
import useTranslation from 'hooks/useTranslation';
import Translate from 'utils/Translate';

// useTableData only fetches when filterParams is non-empty and refetches
// whenever its reference changes, so keep a stable module-level object
const FILTER_PARAMS = { includeAll: true };

const PartyRoleList = () => {
  useTranslation('partyRole', 'reactTable', 'default');

  const translate = useTranslate();

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
    url: PARTY_ROLE_API,
    errorMessageId: 'react.partyRole.fetch.fail.label',
    defaultErrorMessage: 'Unable to fetch party roles',
    defaultSorting: {
      sort: 'id',
      order: 'asc',
    },
    getParams,
  });

  const columns = useMemo(() => [
    {
      Header: <Translate id="react.partyRole.column.id.label" defaultMessage="Id" />,
      accessor: 'id',
      className: 'd-flex align-items-center',
      headerClassName: 'header',
      Cell: (row) => <TableCell {...row} link={PARTY_ROLE_URL.show(row.original.id)} />,
    },
    {
      Header: <Translate id="react.partyRole.column.party.label" defaultMessage="Party" />,
      accessor: 'party',
      className: 'd-flex align-items-center',
      headerClassName: 'header',
      sortable: false,
      Cell: (row) => (
        <TableCell
          {...row}
          value={row.original.party?.id}
          link={row.original.party ? PARTY_URL.show(row.original.party.id) : undefined}
        />
      ),
    },
    {
      Header: <Translate id="react.partyRole.column.roleType.label" defaultMessage="Role Type" />,
      accessor: 'roleType',
      className: 'd-flex align-items-center',
      headerClassName: 'header',
    },
    {
      Header: <Translate id="react.partyRole.column.startDate.label" defaultMessage="Start Date" />,
      accessor: 'startDate',
      className: 'd-flex align-items-center',
      headerClassName: 'header',
      Cell: (row) => <DateCell {...row} />,
    },
    {
      Header: <Translate id="react.partyRole.column.endDate.label" defaultMessage="End Date" />,
      accessor: 'endDate',
      className: 'd-flex align-items-center',
      headerClassName: 'header',
      Cell: (row) => <DateCell {...row} />,
    },
  ], []);

  return (
    <div className="d-flex flex-column list-page-main">
      <div className="d-flex list-page-header">
        <span className="d-flex align-self-center title">
          <Translate id="react.partyRole.list.label" defaultMessage="List Party Roles" />
        </span>
        <div className="d-flex justify-content-end buttons align-items-center">
          <Link to={PARTY_ROLE_URL.create()}>
            <Button
              defaultLabel="Add Party Role"
              label="react.partyRole.addPartyRole.label"
              variant="primary"
            />
          </Link>
        </div>
      </div>
      <div className="list-page-list-section">
        <div className="title-text p-3 d-flex justify-content-between align-items-center">
          <span>
            <Translate id="react.partyRole.list.label" defaultMessage="List Party Roles" />
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
          noDataText={translate('react.partyRole.empty.label', 'No party roles match the given criteria')}
        />
      </div>
    </div>
  );
};

export default PartyRoleList;
