import React, { useEffect, useRef, useState } from 'react';

import migrationApi from 'api/services/MigrationApi';
import MigrationTabs from 'components/migration/MigrationTabs';
import { STOCK_MOVEMENT_URL } from 'consts/applicationUrls';
import useTranslate from 'hooks/useTranslate';
import Translate from 'utils/Translate';

const MigrationDataQuality = () => {
  const translate = useTranslate();

  const [counts, setCounts] = useState(null);
  const [openedList, setOpenedList] = useState(null);
  const [rows, setRows] = useState([]);
  const [loadingRows, setLoadingRows] = useState(false);
  const openedListRef = useRef(null);

  useEffect(() => {
    migrationApi.getDataQuality()
      .then((response) => setCounts(response?.data?.data));
  }, []);

  const fetchRows = async (listName) => {
    if (openedList === listName) {
      openedListRef.current = null;
      setOpenedList(null);
      setRows([]);
      return;
    }
    openedListRef.current = listName;
    setOpenedList(listName);
    setRows([]);
    setLoadingRows(true);
    try {
      const fetchers = {
        receiptsWithoutTransaction: migrationApi.getReceiptsWithoutTransaction,
        shipmentsWithoutTransactions: migrationApi.getShipmentsWithoutTransactions,
        stockMovementsWithoutShipmentItems: migrationApi.getStockMovementsWithoutShipmentItems,
      };
      const response = await fetchers[listName]();
      if (openedListRef.current === listName) {
        setRows(response?.data?.data ?? []);
      }
    } finally {
      if (openedListRef.current === listName) {
        setLoadingRows(false);
      }
    }
  };

  const indicators = [
    {
      name: 'receiptsWithoutTransaction',
      description: translate(
        'react.migration.receiptsWithoutTransaction.label',
        "Receipts that have been received but don't have an inbound transaction associated with them",
      ),
      count: counts?.receiptsWithoutTransactionCount,
      columns: [
        ['shipmentNumber', 'Shipment Number'],
        ['shipmentStatus', 'Shipment Status'],
        ['shipmentName', 'Shipment Name'],
        ['receiptNumber', 'Receipt Number'],
        ['receiptStatus', 'Receipt Status'],
      ],
      link: (row) => (row.shipmentId ? STOCK_MOVEMENT_URL.show(row.shipmentId) : null),
      linkColumn: 'shipmentNumber',
    },
    {
      name: 'shipmentsWithoutTransactions',
      description: translate(
        'react.migration.shipmentsWithoutTransactions.label',
        "Shipments with status shipped but don't have an outbound transaction associated with them",
      ),
      count: counts?.shipmentsWithoutTransactionsCount,
      columns: [
        ['shipmentNumber', 'Shipment Number'],
        ['shipmentStatus', 'Shipment Status'],
        ['origin', 'Origin'],
        ['destination', 'Destination'],
      ],
      link: (row) => (row.shipmentId ? STOCK_MOVEMENT_URL.show(row.shipmentId) : null),
      linkColumn: 'shipmentNumber',
    },
    {
      name: 'stockMovementsWithoutShipmentItems',
      description: translate(
        'react.migration.stockMovementsWithoutShipmentItems.label',
        'Stock movements with status issued without shipment items',
      ),
      count: counts?.stockMovementsWithoutShipmentItemsCount,
      columns: [
        ['identifier', 'Identifier'],
        ['status', 'Status'],
        ['dateCreated', 'Date Created'],
        ['origin', 'Origin'],
        ['requested', 'Requested'],
        ['picked', 'Picked'],
        ['shipped', 'Shipped'],
        ['issued', 'Issued'],
      ],
      link: (row) => (row.id ? STOCK_MOVEMENT_URL.show(row.id) : null),
      linkColumn: 'identifier',
    },
  ];

  const openedIndicator = indicators.find((indicator) => indicator.name === openedList);

  return (
    <MigrationTabs activeTab="dataQuality">
      <h2 className="font-weight-bold">
        <Translate id="react.migration.dataQuality.label" defaultMessage="Data Quality" />
      </h2>
      <table className="table table-sm" data-testid="data-quality-table">
        <thead>
          <tr>
            <th>{translate('react.migration.column.indicator.label', 'Indicator')}</th>
            <th>{translate('react.migration.column.count.label', 'Count')}</th>
            <th>{translate('react.migration.column.actions.label', 'Actions')}</th>
          </tr>
        </thead>
        <tbody>
          {indicators.map((indicator) => (
            <tr key={indicator.name}>
              <td>{indicator.description}</td>
              <td aria-label={indicator.name} data-testid={`${indicator.name}-count`}>
                {indicator.count ?? '...'}
              </td>
              <td>
                <button
                  type="button"
                  className="btn btn-outline-primary btn-sm"
                  onClick={() => fetchRows(indicator.name)}
                  data-testid={`${indicator.name}-list-button`}
                >
                  <Translate id="react.default.button.list.label" defaultMessage="List" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {openedIndicator && (
        <div data-testid="data-quality-details">
          <h3 className="font-weight-bold">{openedIndicator.description}</h3>
          {loadingRows
            ? <Translate id="react.default.loading.label" defaultMessage="Loading..." />
            : (
              <table className="table table-sm table-bordered">
                <thead>
                  <tr>
                    {openedIndicator.columns.map(([key, label]) => <th key={key}>{label}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 && (
                    <tr>
                      <td colSpan={openedIndicator.columns.length}>
                        <Translate id="react.default.noResultsFound.label" defaultMessage="No results found" />
                      </td>
                    </tr>
                  )}
                  {rows.map((row, index) => (
                    // eslint-disable-next-line react/no-array-index-key
                    <tr key={index}>
                      {openedIndicator.columns.map(([key]) => (
                        <td key={key}>
                          {key === openedIndicator.linkColumn && openedIndicator.link(row)
                            ? (
                              <a href={openedIndicator.link(row)} target="_blank" rel="noopener noreferrer">
                                {row[key]}
                              </a>
                            )
                            : row[key]}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
        </div>
      )}
    </MigrationTabs>
  );
};

export default MigrationDataQuality;
