import React, { useMemo, useState } from 'react';

import { PRODUCT_GROUP_API } from 'api/urls';
import DataTable, { TableCell } from 'components/DataTable';
import DateCell from 'components/DataTable/DateCell';
import Button from 'components/form-elements/Button';
import { PRODUCT_GROUP_URL } from 'consts/applicationUrls';
import useTableData from 'hooks/list-pages/useTableData';
import useTranslate from 'hooks/useTranslate';
import useTranslation from 'hooks/useTranslation';
import Translate from 'utils/Translate';

const ProductGroupList = () => {
  useTranslation('productGroup', 'reactTable', 'default');

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
    url: PRODUCT_GROUP_API,
    errorMessageId: 'react.productGroup.fetch.fail.label',
    defaultErrorMessage: 'Unable to fetch product groups',
    defaultSorting: {
      sort: 'name',
      order: 'asc',
    },
    getParams,
  });

  const columns = useMemo(() => [
    {
      Header: <Translate id="react.productGroup.column.name.label" defaultMessage="Name" />,
      accessor: 'name',
      className: 'd-flex align-items-center',
      headerClassName: 'header',
      Cell: (row) => <TableCell {...row} link={PRODUCT_GROUP_URL.edit(row.original.id)} />,
    },
    {
      Header: <Translate id="react.productGroup.column.category.label" defaultMessage="Category" />,
      accessor: 'category',
      className: 'd-flex align-items-center',
      headerClassName: 'header',
      sortable: false,
    },
    {
      Header: <Translate id="react.productGroup.column.products.label" defaultMessage="Products" />,
      accessor: 'productCount',
      className: 'd-flex align-items-center',
      headerClassName: 'header',
      maxWidth: 120,
      sortable: false,
    },
    {
      Header: <Translate id="react.productGroup.column.dateCreated.label" defaultMessage="Date Created" />,
      accessor: 'dateCreated',
      className: 'd-flex align-items-center',
      headerClassName: 'header',
      Cell: (row) => <DateCell {...row} />,
    },
    {
      Header: <Translate id="react.productGroup.column.lastUpdated.label" defaultMessage="Last Updated" />,
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
          <Translate id="react.productGroup.list.label" defaultMessage="List Product Groups" />
        </span>
        <div className="d-flex justify-content-end buttons align-items-center">
          <a href={PRODUCT_GROUP_URL.create()}>
            <Button
              defaultLabel="Add Product Group"
              label="react.productGroup.addProductGroup.label"
              variant="primary"
            />
          </a>
        </div>
      </div>
      <div className="list-page-list-section">
        <div className="title-text p-3 d-flex justify-content-between align-items-center">
          <span>
            <Translate id="react.productGroup.list.label" defaultMessage="List Product Groups" />
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
              placeholder={translate('react.productGroup.searchByName.label', 'Search by name')}
              aria-label={translate('react.productGroup.searchByName.label', 'Search by name')}
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
          noDataText={translate('react.productGroup.empty.label', 'No product groups match the given criteria')}
        />
      </div>
    </div>
  );
};

export default ProductGroupList;
