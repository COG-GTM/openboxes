import React, { useMemo, useState } from 'react';

import { TAG_API } from 'api/urls';
import DataTable, { TableCell } from 'components/DataTable';
import DateCell from 'components/DataTable/DateCell';
import Button from 'components/form-elements/Button';
import { TAG_URL } from 'consts/applicationUrls';
import useTableData from 'hooks/list-pages/useTableData';
import useTranslate from 'hooks/useTranslate';
import useTranslation from 'hooks/useTranslation';
import Translate from 'utils/Translate';

const TagList = () => {
  useTranslation('tag', 'reactTable', 'default');

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
    url: TAG_API,
    errorMessageId: 'react.tag.fetch.fail.label',
    defaultErrorMessage: 'Unable to fetch tags',
    defaultSorting: {
      sort: 'tag',
      order: 'asc',
    },
    getParams,
  });

  const columns = useMemo(() => [
    {
      Header: <Translate id="react.tag.column.tag.label" defaultMessage="Tag" />,
      accessor: 'tag',
      className: 'd-flex align-items-center',
      headerClassName: 'header',
      Cell: (row) => <TableCell {...row} link={TAG_URL.edit(row.original.id)} />,
    },
    {
      Header: <Translate id="react.tag.column.products.label" defaultMessage="Products" />,
      accessor: 'productCount',
      className: 'd-flex align-items-center',
      headerClassName: 'header',
      maxWidth: 120,
      sortable: false,
    },
    {
      Header: <Translate id="react.tag.column.isActive.label" defaultMessage="Is active?" />,
      accessor: 'isActive',
      className: 'd-flex align-items-center',
      headerClassName: 'header',
      maxWidth: 120,
      sortable: false,
      Cell: (row) => <span>{`${row.value ?? ''}`}</span>,
    },
    {
      Header: <Translate id="react.tag.column.updatedBy.label" defaultMessage="Updated By" />,
      accessor: 'updatedBy',
      className: 'd-flex align-items-center',
      headerClassName: 'header',
      sortable: false,
    },
    {
      Header: <Translate id="react.tag.column.createdBy.label" defaultMessage="Created By" />,
      accessor: 'createdBy',
      className: 'd-flex align-items-center',
      headerClassName: 'header',
      sortable: false,
    },
    {
      Header: <Translate id="react.tag.column.dateCreated.label" defaultMessage="Date Created" />,
      accessor: 'dateCreated',
      className: 'd-flex align-items-center',
      headerClassName: 'header',
      Cell: (row) => <DateCell {...row} />,
    },
    {
      Header: <Translate id="react.tag.column.lastUpdated.label" defaultMessage="Last Updated" />,
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
          <Translate id="react.tag.list.label" defaultMessage="List Tags" />
        </span>
        <div className="d-flex justify-content-end buttons align-items-center">
          <a href={TAG_URL.create()}>
            <Button
              defaultLabel="Add Tag"
              label="react.tag.addTag.label"
              variant="primary"
            />
          </a>
        </div>
      </div>
      <div className="list-page-list-section">
        <div className="title-text p-3 d-flex justify-content-between align-items-center">
          <span>
            <Translate id="react.tag.list.label" defaultMessage="List Tags" />
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
              placeholder={translate('react.tag.searchByTag.label', 'Search by tag')}
              aria-label={translate('react.tag.searchByTag.label', 'Search by tag')}
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
          noDataText={translate('react.tag.empty.label', 'No tags match the given criteria')}
        />
      </div>
    </div>
  );
};

export default TagList;
