import React, { useEffect, useMemo, useState } from 'react';

import queryString from 'query-string';
import { getTranslate } from 'react-localize-redux';
import { useSelector } from 'react-redux';
import { useHistory, useLocation } from 'react-router-dom';

import { DAILY_TRANSACTIONS } from 'api/urls';
import DataTable from 'components/DataTable';
import { INVENTORY_ITEM_URL, INVENTORY_URL } from 'consts/applicationUrls';
import useTranslation from 'hooks/useTranslation';
import apiClient from 'utils/apiClient';
import Translate, { translateWithDefaultMessage } from 'utils/Translate';
import PageWrapper from 'wrappers/PageWrapper';

import 'components/inventory/styles.scss';

const DailyTransactionsList = () => {
  useTranslation('inventory', 'reactTable');

  const history = useHistory();
  const location = useLocation();
  const { date } = queryString.parse(location.search);

  const [data, setData] = useState({ dates: [], transactions: [], dateSelected: null });
  const [loading, setLoading] = useState(true);

  const { currentLocation, translate } = useSelector((state) => ({
    currentLocation: state.session.currentLocation,
    translate: translateWithDefaultMessage(getTranslate(state.localize)),
  }));

  useEffect(() => {
    setLoading(true);
    apiClient.get(DAILY_TRANSACTIONS, { params: { date } })
      .then((response) => setData(response.data.data))
      .finally(() => setLoading(false));
  }, [date]);

  const rows = useMemo(() => data.transactions.flatMap((transaction) => (
    transaction.transactionEntries.length
      ? transaction.transactionEntries.map((entry) => ({ transaction, entry }))
      : [{ transaction, entry: null }]
  )), [data.transactions]);

  const columns = useMemo(() => [
    {
      Header: <Translate id="react.inventory.dailyTransactions.dateTime.label" defaultMessage="Date/Time" />,
      accessor: 'transaction.transactionDate',
      minWidth: 140,
    },
    {
      Header: <Translate id="react.inventory.dailyTransactions.transaction.label" defaultMessage="Transaction" />,
      accessor: 'transaction.transactionNumber',
      Cell: (row) => (
        <a href={INVENTORY_URL.showTransaction(row.original.transaction.id)}>
          {row.value || row.original.transaction.id}
        </a>
      ),
    },
    {
      Header: <Translate id="react.inventory.dailyTransactions.transactionType.label" defaultMessage="Transaction type" />,
      accessor: 'transaction.transactionType.name',
      Cell: (row) => (
        <span>
          {row.value}
          {row.original.transaction.source && ` — ${row.original.transaction.source.name}`}
          {row.original.transaction.destination && ` → ${row.original.transaction.destination.name}`}
        </span>
      ),
    },
    {
      Header: <Translate id="react.inventory.product.label" defaultMessage="Product" />,
      accessor: 'entry.product.name',
      minWidth: 200,
      Cell: (row) => (row.original.entry ? (
        <a href={INVENTORY_ITEM_URL.showStockCard(row.original.entry.product.id)}>
          {row.value}
        </a>
      ) : null),
    },
    {
      Header: <Translate id="react.inventory.lotNumber.label" defaultMessage="Lot number" />,
      accessor: 'entry.inventoryItem.lotNumber',
    },
    {
      Header: <Translate id="react.inventory.quantity.label" defaultMessage="Quantity" />,
      accessor: 'entry.quantity',
      className: 'text-right',
    },
  ], []);

  return (
    <PageWrapper className="inventory-list-page">
      <div className="list-page-header p-3 d-flex align-items-center justify-content-between">
        <h5 className="m-0">
          <Translate id="react.inventory.listDailyTransactions.title.label" defaultMessage="Daily transactions" />
          {currentLocation?.name && ` — ${currentLocation.name}`}
          {data.dateSelected && ` — ${data.dateSelected}`}
        </h5>
      </div>
      <div className="d-flex daily-transactions-layout">
        <div className="daily-transactions-dates p-3">
          <h6>
            <Translate id="react.inventory.dailyTransactions.dates.label" defaultMessage="Transaction dates" />
          </h6>
          <ul className="list-unstyled">
            {data.dates.map((dateEntry) => (
              <li key={dateEntry.date}>
                <button
                  type="button"
                  className={`btn btn-link p-0 ${dateEntry.date === data.dateSelected ? 'font-weight-bold' : ''}`}
                  onClick={() => history.push({
                    pathname: location.pathname,
                    search: queryString.stringify({ date: dateEntry.date }),
                  })}
                >
                  {dateEntry.date}
                  {` (${dateEntry.count})`}
                </button>
              </li>
            ))}
          </ul>
        </div>
        <div className="flex-grow-1">
          <DataTable
            data={rows}
            columns={columns}
            loading={loading}
            defaultPageSize={100}
            totalData={rows.length}
            noDataText={translate('react.inventory.dailyTransactions.empty.label', 'No transactions')}
          />
        </div>
      </div>
    </PageWrapper>
  );
};

export default DailyTransactionsList;
