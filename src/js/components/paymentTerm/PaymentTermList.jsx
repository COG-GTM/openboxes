import React, { useMemo, useState } from 'react';

import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';

import { PAYMENT_TERM_API } from 'api/urls';
import DataTable, { TableCell } from 'components/DataTable';
import Button from 'components/form-elements/Button';
import { PAYMENT_TERM_URL } from 'consts/applicationUrls';
import useTableData from 'hooks/list-pages/useTableData';
import useTranslate from 'hooks/useTranslate';
import useTranslation from 'hooks/useTranslation';
import Translate from 'utils/Translate';

const PaymentTermList = () => {
  useTranslation('paymentTerm', 'reactTable', 'default');

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
    url: PAYMENT_TERM_API,
    errorMessageId: 'react.paymentTerm.fetch.fail.label',
    defaultErrorMessage: 'Unable to fetch payment terms',
    defaultSorting: {
      sort: 'id',
      order: 'asc',
    },
    getParams,
  });

  const columns = useMemo(() => [
    {
      Header: <Translate id="react.paymentTerm.column.id.label" defaultMessage="Id" />,
      accessor: 'id',
      className: 'd-flex align-items-center',
      headerClassName: 'header',
      maxWidth: 250,
      Cell: (row) => <TableCell {...row} link={PAYMENT_TERM_URL.edit(row.original.id)} />,
    },
    {
      Header: <Translate id="react.paymentTerm.column.code.label" defaultMessage="Code" />,
      accessor: 'code',
      className: 'd-flex align-items-center',
      headerClassName: 'header',
    },
    {
      Header: <Translate id="react.paymentTerm.column.name.label" defaultMessage="Name" />,
      accessor: 'name',
      className: 'd-flex align-items-center',
      headerClassName: 'header',
      Cell: (row) => <TableCell {...row} link={PAYMENT_TERM_URL.edit(row.original.id)} />,
    },
    {
      Header: <Translate id="react.paymentTerm.column.description.label" defaultMessage="Description" />,
      accessor: 'description',
      className: 'd-flex align-items-center',
      headerClassName: 'header',
    },
    {
      Header: <Translate id="react.paymentTerm.column.prepaymentPercent.label" defaultMessage="Prepayment Percent" />,
      accessor: 'prepaymentPercent',
      className: 'd-flex align-items-center',
      headerClassName: 'header',
      Cell: (row) => (
        <span className="mx-1">
          {row.original.prepaymentPercent != null ? `${row.original.prepaymentPercent}%` : ''}
        </span>
      ),
    },
    {
      Header: <Translate id="react.paymentTerm.column.daysToPayment.label" defaultMessage="Days To Payment" />,
      accessor: 'daysToPayment',
      className: 'd-flex align-items-center',
      headerClassName: 'header',
    },
  ], []);

  return (
    <div className="d-flex flex-column list-page-main">
      <div className="d-flex list-page-header">
        <span className="d-flex align-self-center title">
          <Translate id="react.paymentTerm.list.label" defaultMessage="List Payment Terms" />
        </span>
        {isUserAdmin && (
          <div className="d-flex justify-content-end buttons align-items-center">
            <Link to={PAYMENT_TERM_URL.create()}>
              <Button
                defaultLabel="Add Payment Term"
                label="react.paymentTerm.add.label"
                variant="primary"
              />
            </Link>
          </div>
        )}
      </div>
      <div className="list-page-list-section">
        <div className="title-text p-3 d-flex justify-content-between align-items-center">
          <span>
            <Translate id="react.paymentTerm.list.label" defaultMessage="List Payment Terms" />
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
              placeholder={translate('react.paymentTerm.searchByName.label', 'Search by name')}
              aria-label={translate('react.paymentTerm.searchByName.label', 'Search by name')}
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
          noDataText={translate('react.paymentTerm.empty.label', 'No payment terms match the given criteria')}
        />
      </div>
    </div>
  );
};

export default PaymentTermList;
