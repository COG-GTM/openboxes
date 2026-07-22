import React, {
  useCallback, useEffect, useMemo, useRef, useState,
} from 'react';

import { getTranslate } from 'react-localize-redux';
import { useSelector } from 'react-redux';

import { STOCK_CARD_TRANSACTION_LOG, TRANSACTION_TYPE_OPTIONS } from 'api/urls';
import DataTable from 'components/DataTable';
import StockCardHeader from 'components/inventory/stockCard/StockCardHeader';
import useProductId from 'components/inventory/stockCard/useProductId';
import { INVENTORY_URL } from 'consts/applicationUrls';
import useTranslation from 'hooks/useTranslation';
import apiClient from 'utils/apiClient';
import Select from 'utils/Select';
import Translate, { translateWithDefaultMessage } from 'utils/Translate';
import PageWrapper from 'wrappers/PageWrapper';

import 'components/inventory/styles.scss';

// The API expects the legacy datepicker format
const toLegacyDate = (isoDate) => {
  if (!isoDate) {
    return null;
  }
  const [year, month, day] = isoDate.split('-');
  return `${month}/${day}/${year}`;
};

const TransactionLogPage = () => {
  useTranslation('stockCard', 'inventory', 'reactTable');

  const productId = useProductId();
  const [transactionTypes, setTransactionTypes] = useState([]);
  const [transactionType, setTransactionType] = useState(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [data, setData] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const filtersRef = useRef({});

  const { currentLocation, translate } = useSelector((state) => ({
    currentLocation: state.session.currentLocation,
    translate: translateWithDefaultMessage(getTranslate(state.localize)),
  }));

  const fetchData = useCallback(async (filters = filtersRef.current) => {
    filtersRef.current = filters;
    setLoading(true);
    try {
      const response = await apiClient.get(STOCK_CARD_TRANSACTION_LOG(productId), {
        params: {
          startDate: toLegacyDate(filters.startDate),
          endDate: toLegacyDate(filters.endDate),
          'transactionType.id': filters.transactionType?.id || null,
        },
      });
      setData(response.data.data);
      setTotalCount(response.data.totalCount);
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    apiClient.get(TRANSACTION_TYPE_OPTIONS)
      .then((response) => setTransactionTypes(response.data.data));
  }, []);

  useEffect(() => {
    if (productId && currentLocation?.id) {
      fetchData();
    } else {
      setLoading(false);
    }
  }, [productId, currentLocation?.id]);

  const columns = useMemo(() => [
    {
      Header: <Translate id="react.stockCard.transactionLog.date.label" defaultMessage="Date" />,
      accessor: 'transactionDate',
      minWidth: 140,
    },
    {
      Header: <Translate id="react.stockCard.transactionLog.type.label" defaultMessage="Type" />,
      accessor: 'transactionType.name',
      Cell: (row) => (
        <a
          className={row.original.transactionType?.transactionCode?.toLowerCase()}
          href={INVENTORY_URL.showTransaction(row.original.id)}
        >
          {row.value}
        </a>
      ),
    },
    {
      Header: <Translate id="react.stockCard.transactionLog.shipment.label" defaultMessage="Shipment" />,
      accessor: 'shipment.name',
      Cell: (row) => (
        <span>
          {row.value || translate('react.default.none.label', 'None')}
        </span>
      ),
    },
    {
      Header: <Translate id="react.stockCard.transactionLog.source.label" defaultMessage="Source" />,
      accessor: 'source',
    },
    {
      Header: <Translate id="react.stockCard.transactionLog.destination.label" defaultMessage="Destination" />,
      accessor: 'destination',
    },
    {
      Header: <Translate id="react.stockCard.transactionLog.quantityChange.label" defaultMessage="Quantity Change" />,
      accessor: 'quantityChange',
      className: 'text-center',
      Cell: (row) => (
        <span className={row.original.transactionType?.transactionCode?.toLowerCase()}>
          {row.value}
        </span>
      ),
    },
  ], [translate]);

  return (
    <PageWrapper className="transaction-log-page">
      <StockCardHeader productId={productId} activeScreen="transactionLog" />
      <div className="list-page-filters d-flex align-items-end flex-wrap p-3">
        <div className="mr-3">
          <label htmlFor="transaction-log-start-date">
            <Translate id="react.stockCard.transactionLog.from.label" defaultMessage="From" />
          </label>
          <input
            id="transaction-log-start-date"
            className="form-control"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>
        <div className="mr-3">
          <label htmlFor="transaction-log-end-date">
            <Translate id="react.stockCard.transactionLog.to.label" defaultMessage="To" />
          </label>
          <input
            id="transaction-log-end-date"
            className="form-control"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>
        <div className="inventory-filter-select mr-3">
          <label htmlFor="transaction-log-type-filter">
            <Translate id="react.stockCard.transactionLog.type.label" defaultMessage="Type" />
          </label>
          <Select
            id="transaction-log-type-filter"
            options={transactionTypes}
            valueKey="id"
            labelKey="name"
            value={transactionType}
            onChange={(value) => setTransactionType(value)}
          />
        </div>
        <button
          type="button"
          className="btn btn-primary mb-1"
          onClick={() => fetchData({ startDate, endDate, transactionType })}
        >
          <Translate id="react.default.button.filter.label" defaultMessage="Filter" />
        </button>
      </div>
      <div className="px-3 pb-2">
        <Translate
          id="react.stockCard.transactionLog.showing.label"
          defaultMessage={`Showing ${data.length} of ${totalCount} transactions`}
          data={{ count: data.length, totalCount }}
        />
      </div>
      <DataTable
        data={data}
        columns={columns}
        loading={loading}
        sortable
        defaultPageSize={20}
        totalData={data.length}
        noDataText={translate('react.stockCard.transactionLog.empty.label', 'No transactions')}
      />
    </PageWrapper>
  );
};

export default TransactionLogPage;
