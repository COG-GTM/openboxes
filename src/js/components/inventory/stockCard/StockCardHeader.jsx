import React, { useEffect, useState } from 'react';

import PropTypes from 'prop-types';
import { useSelector } from 'react-redux';

import { STOCK_CARD_SUMMARY } from 'api/urls';
import { INVENTORY_ITEM_URL } from 'consts/applicationUrls';
import apiClient from 'utils/apiClient';
import Translate from 'utils/Translate';

const StockCardHeader = ({ productId, activeScreen, onSummaryLoaded }) => {
  const [summary, setSummary] = useState(null);
  const currentLocationId = useSelector((state) => state.session.currentLocation?.id);

  useEffect(() => {
    if (!productId) {
      return;
    }
    apiClient.get(STOCK_CARD_SUMMARY(productId))
      .then((response) => {
        setSummary(response.data.data);
        onSummaryLoaded?.(response.data.data);
      });
  }, [productId, currentLocationId]);

  const product = summary?.product;

  const screens = [
    { key: 'stockCard', label: { id: 'react.stockCard.tab.stockCard.label', defaultMessage: 'Stock Card' }, url: INVENTORY_ITEM_URL.showStockCard(productId) },
    { key: 'lotNumbers', label: { id: 'react.stockCard.tab.lotNumbers.label', defaultMessage: 'Lot Numbers' }, url: INVENTORY_ITEM_URL.showLotNumbers(productId) },
    { key: 'recordStock', label: { id: 'react.stockCard.tab.recordStock.label', defaultMessage: 'Record Stock' }, url: INVENTORY_ITEM_URL.showRecordInventory(productId) },
    { key: 'graph', label: { id: 'react.stockCard.tab.graph.label', defaultMessage: 'Graph' }, url: INVENTORY_ITEM_URL.showGraph(productId) },
    { key: 'transactionLog', label: { id: 'react.stockCard.tab.transactionLog.label', defaultMessage: 'Transaction Log' }, url: INVENTORY_ITEM_URL.showTransactionLog(productId) },
  ];

  return (
    <div className="stock-card-header">
      <div className="list-page-header p-3 d-flex align-items-center justify-content-between">
        <div>
          <h5 className="m-0">
            {product ? `${product.productCode} ${product.displayNameOrDefaultName || product.name}` : ''}
          </h5>
          {product && (
            <div className="text-muted">
              {product.category}
              {product.unitOfMeasure ? ` | ${product.unitOfMeasure}` : ''}
              {product.active === false && (
                <span className="badge badge-danger ml-2">
                  <Translate id="react.stockCard.inactive.label" defaultMessage="Inactive" />
                </span>
              )}
            </div>
          )}
        </div>
        {summary && (
          <div className="text-right">
            <div>
              <Translate id="react.stockCard.quantityOnHand.label" defaultMessage="Quantity on Hand" />
              {': '}
              <strong>{summary.totalQuantityOnHand}</strong>
            </div>
            <div>
              <Translate id="react.stockCard.quantityAvailableToPromise.label" defaultMessage="Quantity Available" />
              {': '}
              <strong>{summary.totalQuantityAvailableToPromise}</strong>
            </div>
            {summary.inventoryLevel && (
              <div className="text-muted">
                <Translate id="react.stockCard.inventoryLevel.label" defaultMessage="Min | Reorder | Max" />
                {`: ${summary.inventoryLevel.minQuantity ?? '-'} | ${summary.inventoryLevel.reorderQuantity ?? '-'} | ${summary.inventoryLevel.maxQuantity ?? '-'}`}
              </div>
            )}
          </div>
        )}
      </div>
      <div className="tabs d-flex align-items-center px-3">
        {screens.map((screen) => (
          <span key={screen.key} className={activeScreen === screen.key ? 'active-tab' : ''}>
            <a href={screen.url}>
              <Translate id={screen.label.id} defaultMessage={screen.label.defaultMessage} />
            </a>
          </span>
        ))}
        <span className="ml-auto">
          <a href={INVENTORY_ITEM_URL.editInventoryLevel(productId)}>
            <Translate id="react.stockCard.editInventoryLevel.label" defaultMessage="Edit Inventory Level" />
          </a>
        </span>
      </div>
    </div>
  );
};

export default StockCardHeader;

StockCardHeader.propTypes = {
  productId: PropTypes.string.isRequired,
  activeScreen: PropTypes.string.isRequired,
  onSummaryLoaded: PropTypes.func,
};

StockCardHeader.defaultProps = {
  onSummaryLoaded: null,
};
