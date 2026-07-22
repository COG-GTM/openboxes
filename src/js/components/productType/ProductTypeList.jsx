import React, { useMemo, useState } from 'react';

import { PRODUCT_TYPE_API } from 'api/urls';
import DataTable, { TableCell } from 'components/DataTable';
import DateCell from 'components/DataTable/DateCell';
import Button from 'components/form-elements/Button';
import { PRODUCT_TYPE_URL } from 'consts/applicationUrls';
import useTableData from 'hooks/list-pages/useTableData';
import useTranslate from 'hooks/useTranslate';
import useTranslation from 'hooks/useTranslation';
import Translate from 'utils/Translate';

const ProductTypeList = () => {
  useTranslation('productType', 'reactTable', 'default');

  const translate = useTranslate();

  // useTableData skips fetching entirely when filterParams is empty, and
  // refetches whenever its identity changes, so keep a stable non-empty one
  const [filterParams] = useState({ sort: 'name' });

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
    filterParams,
    url: PRODUCT_TYPE_API,
    errorMessageId: 'react.productType.fetch.fail.label',
    defaultErrorMessage: 'Unable to fetch product types',
    defaultSorting: {
      sort: 'name',
      order: 'asc',
    },
    getParams,
  });

  const columns = useMemo(() => [
    {
      Header: <Translate id="react.productType.column.id.label" defaultMessage="Id" />,
      accessor: 'id',
      className: 'd-flex align-items-center',
      headerClassName: 'header',
      Cell: (row) => <TableCell {...row} link={PRODUCT_TYPE_URL.edit(row.original.id)} />,
    },
    {
      Header: <Translate id="react.productType.column.name.label" defaultMessage="Name" />,
      accessor: 'name',
      className: 'd-flex align-items-center',
      headerClassName: 'header',
      Cell: (row) => <TableCell {...row} link={PRODUCT_TYPE_URL.show(row.original.id)} />,
    },
    {
      Header: <Translate id="react.productType.column.productTypeCode.label" defaultMessage="Product Type Code" />,
      accessor: 'productTypeCode',
      className: 'd-flex align-items-center',
      headerClassName: 'header',
    },
    {
      Header: <Translate id="react.productType.column.productIdentifierFormat.label" defaultMessage="Product Identifier Format" />,
      accessor: 'productIdentifierFormat',
      className: 'd-flex align-items-center',
      headerClassName: 'header',
    },
    {
      Header: <Translate id="react.productType.column.sequenceNumber.label" defaultMessage="Sequence Number" />,
      accessor: 'sequenceNumber',
      className: 'd-flex align-items-center',
      headerClassName: 'header',
      maxWidth: 140,
    },
    {
      Header: <Translate id="react.productType.column.dateCreated.label" defaultMessage="Date Created" />,
      accessor: 'dateCreated',
      className: 'd-flex align-items-center',
      headerClassName: 'header',
      Cell: (row) => <DateCell {...row} />,
    },
    {
      Header: <Translate id="react.productType.column.lastUpdated.label" defaultMessage="Last Updated" />,
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
          <Translate id="react.productType.list.label" defaultMessage="List Product Types" />
        </span>
        <div className="d-flex justify-content-end buttons align-items-center">
          <a href={PRODUCT_TYPE_URL.create()}>
            <Button
              defaultLabel="Add Product Type"
              label="react.productType.addProductType.label"
              variant="primary"
            />
          </a>
        </div>
      </div>
      <div className="list-page-list-section">
        <div className="title-text p-3 d-flex justify-content-between align-items-center">
          <span>
            <Translate id="react.productType.list.label" defaultMessage="List Product Types" />
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
          noDataText={translate('react.productType.empty.label', 'No product types match the given criteria')}
        />
      </div>
    </div>
  );
};

export default ProductTypeList;
