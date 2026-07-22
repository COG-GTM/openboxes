import React, {
  useCallback, useEffect, useMemo, useRef, useState,
} from 'react';

import { getTranslate } from 'react-localize-redux';
import { useSelector } from 'react-redux';
import Alert from 'react-s-alert';

import { TRANSACTION_API, TRANSACTION_BY_ID, TRANSACTION_TYPE_OPTIONS } from 'api/urls';
import DataTable from 'components/DataTable';
import { INVENTORY_URL } from 'consts/applicationUrls';
import useTranslation from 'hooks/useTranslation';
import apiClient from 'utils/apiClient';
import Select from 'utils/Select';
import Translate, { translateWithDefaultMessage } from 'utils/Translate';
import PageWrapper from 'wrappers/PageWrapper';

import 'components/inventory/styles.scss';

const PAGE_SIZE = 10;

const TransactionsList = () => {
  useTranslation('inventory', 'reactTable');

  const [transactionTypes, setTransactionTypes] = useState([]);
  const [transactionNumber, setTransactionNumber] = useState('');
  const [transactionType, setTransactionType] = useState(null);
  const [transactionDateFrom, setTransactionDateFrom] = useState('');
  const [transactionDateTo, setTransactionDateTo] = useState('');
  const [data, setData] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const pageRef = useRef(0);
  const sortedRef = useRef([]);

  const { currentLocation, isSuperuser, translate } = useSelector((state) => ({
    currentLocation: state.session.currentLocation,
    isSuperuser: state.session.isSuperuser,
    translate: translateWithDefaultMessage(getTranslate(state.localize)),
  }));

  const fetchData = useCallback(async (page = pageRef.current, sorted = sortedRef.current) => {
    pageRef.current = page;
    sortedRef.current = sorted;
    setLoading(true);
    const sortColumn = sorted?.[0];
    try {
      const response = await apiClient.get(TRANSACTION_API, {
        params: {
          max: PAGE_SIZE,
          offset: page * PAGE_SIZE,
          sort: sortColumn?.id || null,
          order: sortColumn ? (sortColumn.desc && 'desc') || 'asc' : null,
          transactionNumber: transactionNumber || null,
          transactionTypeId: transactionType?.id || null,
          transactionDateFrom: transactionDateFrom || null,
          transactionDateTo: transactionDateTo || null,
        },
      });
      setData(response.data.data);
      setTotalCount(response.data.totalCount);
    } finally {
      setLoading(false);
    }
  }, [transactionNumber, transactionType, transactionDateFrom, transactionDateTo]);

  useEffect(() => {
    apiClient.get(TRANSACTION_TYPE_OPTIONS)
      .then((response) => setTransactionTypes(response.data.data));
  }, []);

  useEffect(() => {
    if (currentLocation?.id) {
      fetchData(0);
    } else {
      setLoading(false);
    }
  }, [currentLocation?.id]);

  const deleteTransaction = async (id) => {
    // eslint-disable-next-line no-alert
    if (!window.confirm(translate('react.inventory.transactions.delete.confirm.label', 'Are you sure you want to delete this transaction?'))) {
      return;
    }
    try {
      await apiClient.delete(TRANSACTION_BY_ID(id));
      Alert.success(translate('react.inventory.transactions.deleted.label', 'Transaction deleted'));
      fetchData();
    } catch (error) {
      Alert.error(error.response?.data?.errorMessage
        || translate('react.inventory.transactions.deleteFailed.label', 'Transaction could not be deleted'));
    }
  };

  const columns = useMemo(() => [
    {
      Header: <Translate id="react.inventory.transactions.actions.label" defaultMessage="Actions" />,
      accessor: 'id',
      minWidth: 140,
      sortable: false,
      Cell: (row) => (
        <div className="d-flex">
          <a className="btn btn-sm btn-link" href={INVENTORY_URL.showTransaction(row.value)}>
            <Translate id="react.inventory.transactions.show.label" defaultMessage="Show" />
          </a>
          {isSuperuser && (
            <>
              <a className="btn btn-sm btn-link" href={INVENTORY_URL.editTransaction(row.value)}>
                <Translate id="react.inventory.transactions.edit.label" defaultMessage="Edit" />
              </a>
              <button
                type="button"
                className="btn btn-sm btn-link text-danger"
                onClick={() => deleteTransaction(row.value)}
              >
                <Translate id="react.inventory.transactions.delete.label" defaultMessage="Delete" />
              </button>
            </>
          )}
        </div>
      ),
    },
    {
      Header: <Translate id="react.inventory.transactions.count.label" defaultMessage="Count" />,
      accessor: 'entryCount',
      className: 'text-right',
      maxWidth: 70,
      sortable: false,
    },
    {
      Header: <Translate id="react.inventory.transactions.transactionNumber.label" defaultMessage="Transaction number" />,
      accessor: 'transactionNumber',
      minWidth: 160,
      Cell: (row) => (
        <a href={INVENTORY_URL.showTransaction(row.original.id)}>
          {row.value || row.original.id}
        </a>
      ),
    },
    {
      Header: <Translate id="react.inventory.transactions.date.label" defaultMessage="Date" />,
      accessor: 'transactionDate',
      minWidth: 140,
    },
    {
      Header: <Translate id="react.inventory.transactions.type.label" defaultMessage="Transaction type" />,
      accessor: 'transactionType.name',
      sortable: false,
    },
    {
      Header: <Translate id="react.inventory.transactions.inventory.label" defaultMessage="Inventory" />,
      accessor: 'inventory.name',
      sortable: false,
    },
    {
      Header: <Translate id="react.inventory.transactions.sourceOrDestination.label" defaultMessage="Source / Destination" />,
      accessor: 'source.name',
      sortable: false,
      Cell: (row) => (
        <span>
          {row.original.source?.name
            || row.original.destination?.name
            || translate('react.default.na.label', 'Not applicable')}
        </span>
      ),
    },
    {
      Header: <Translate id="react.inventory.transactions.createdBy.label" defaultMessage="Created by" />,
      accessor: 'createdBy.name',
      sortable: false,
      Cell: (row) => (
        <span>
          {row.value || translate('react.default.nobody.label', 'Nobody')}
        </span>
      ),
    },
    {
      Header: <Translate id="react.inventory.transactions.dateCreated.label" defaultMessage="Date created" />,
      accessor: 'dateCreated',
      minWidth: 140,
    },
  ], [isSuperuser, translate]);

  return (
    <PageWrapper className="inventory-list-page">
      <div className="list-page-header p-3 d-flex align-items-center justify-content-between">
        <h5 className="m-0">
          <Translate id="react.inventory.listTransactions.title.label" defaultMessage="Transactions" />
          {currentLocation?.name && ` — ${currentLocation.name}`}
        </h5>
      </div>
      <div className="list-page-filters d-flex align-items-end flex-wrap p-3">
        <div className="mr-3">
          <label htmlFor="transaction-number-filter">
            <Translate id="react.inventory.transactions.transactionNumber.label" defaultMessage="Transaction number" />
          </label>
          <input
            id="transaction-number-filter"
            className="form-control"
            type="text"
            value={transactionNumber}
            onChange={(e) => setTransactionNumber(e.target.value)}
          />
        </div>
        <div className="inventory-filter-select mr-3">
          <label htmlFor="transaction-type-filter">
            <Translate id="react.inventory.transactions.type.label" defaultMessage="Transaction type" />
          </label>
          <Select
            id="transaction-type-filter"
            options={transactionTypes}
            valueKey="id"
            labelKey="name"
            value={transactionType}
            onChange={(value) => setTransactionType(value)}
          />
        </div>
        <div className="mr-3">
          <label htmlFor="transaction-date-from-filter">
            <Translate id="react.inventory.transactions.dateFrom.label" defaultMessage="Date from" />
          </label>
          <input
            id="transaction-date-from-filter"
            className="form-control"
            type="date"
            value={transactionDateFrom}
            onChange={(e) => setTransactionDateFrom(e.target.value)}
          />
        </div>
        <div className="mr-3">
          <label htmlFor="transaction-date-to-filter">
            <Translate id="react.inventory.transactions.dateTo.label" defaultMessage="Date to" />
          </label>
          <input
            id="transaction-date-to-filter"
            className="form-control"
            type="date"
            value={transactionDateTo}
            onChange={(e) => setTransactionDateTo(e.target.value)}
          />
        </div>
        <button
          type="button"
          className="btn btn-primary mb-1"
          onClick={() => fetchData(0)}
        >
          <Translate id="react.inventory.transactions.search.label" defaultMessage="Search" />
        </button>
      </div>
      <div className="px-3 pb-2">
        <Translate
          id="react.inventory.transactions.showing.label"
          defaultMessage={`Showing ${totalCount} transactions`}
          data={{ count: totalCount }}
        />
      </div>
      <DataTable
        manual
        sortable
        data={data}
        columns={columns}
        loading={loading}
        page={pageRef.current}
        pages={Math.max(1, Math.ceil(totalCount / PAGE_SIZE))}
        defaultPageSize={PAGE_SIZE}
        showPageSizeOptions={false}
        onPageChange={(page) => fetchData(page)}
        onSortedChange={(sorted) => fetchData(0, sorted)}
        totalData={totalCount}
        noDataText={translate('react.inventory.transactions.empty.label', 'No transactions')}
      />
    </PageWrapper>
  );
};

export default TransactionsList;
