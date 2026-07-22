import React, { useEffect, useState } from 'react';

import { useParams } from 'react-router-dom';
import Alert from 'react-s-alert';

import stockTransferApi from 'api/services/StockTransferApi';
import {
  INVENTORY_ITEM_URL,
  REPLENISHMENT_URL,
  STOCK_TRANSFER_URL,
} from 'consts/applicationUrls';
import useTranslate from 'hooks/useTranslate';
import useTranslation from 'hooks/useTranslation';
import Translate from 'utils/Translate';

// Formats the server-provided date components (mirrors the legacy
// server-side g:formatDate output regardless of the browser timezone)
const formatDate = (value) => {
  if (!value) {
    return '';
  }
  const isoMatch = typeof value === 'string' && value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    return `${isoMatch[2]}/${isoMatch[3]}/${isoMatch[1]}`;
  }
  const date = new Date(value);
  const pad = (part) => `${part}`.padStart(2, '0');
  return `${pad(date.getMonth() + 1)}/${pad(date.getDate())}/${date.getFullYear()}`;
};

const StockTransferShow = () => {
  const { stockTransferId } = useParams();

  useTranslation('stockTransfer', 'default');

  const translate = useTranslate();

  const [stockTransfer, setStockTransfer] = useState(null);
  const [loadError, setLoadError] = useState(null);

  useEffect(() => {
    if (!stockTransferId) {
      return;
    }
    setStockTransfer(null);
    setLoadError(null);
    stockTransferApi.getStockTransferDetails(stockTransferId)
      .then(({ data }) => setStockTransfer(data?.data))
      .catch((err) => {
        const message = err?.response?.data?.errorMessage;
        setLoadError(message || 'Unable to load stock transfer');
        if (message) {
          Alert.error(message);
        }
      });
  }, [stockTransferId]);

  if (loadError) {
    return (
      <div className="d-flex flex-column m-3" data-testid="stock-transfer-show-error">
        <div className="alert alert-danger">{loadError}</div>
      </div>
    );
  }

  if (!stockTransfer) {
    return (
      <div className="d-flex flex-column m-3">
        <Translate id="react.default.loading.label" defaultMessage="Loading..." />
      </div>
    );
  }

  // Same edit target rules as the legacy _summary.gsp button bar
  const editUrl = (() => {
    if (stockTransfer.isOutbound) {
      return STOCK_TRANSFER_URL.editOutbound(stockTransfer.id);
    }
    if (stockTransfer.isInbound) {
      return STOCK_TRANSFER_URL.editInbound(stockTransfer.id);
    }
    if (stockTransfer.isBinReplenishment) {
      return REPLENISHMENT_URL.edit(stockTransfer.id);
    }
    return STOCK_TRANSFER_URL.createById(stockTransfer.id);
  })();

  const onDelete = () => {
    // eslint-disable-next-line no-alert
    if (window.confirm(translate('react.default.button.delete.confirm.message', 'Are you sure?'))) {
      window.location = STOCK_TRANSFER_URL.erase(stockTransfer.id);
    }
  };

  return (
    <div className="d-flex flex-column m-3" data-testid="stock-transfer-show-page">
      <div className="card mb-3">
        <div className="card-header d-flex justify-content-between align-items-center">
          <span data-testid="stock-transfer-show-header">
            <strong>{stockTransfer.orderNumber}</strong>
            {stockTransfer.dateCreated && ` · ${formatDate(stockTransfer.dateCreated)}`}
            {stockTransfer.statusLabel && (
              <span className="badge badge-secondary ml-2" data-testid="stock-transfer-show-status">
                {stockTransfer.statusLabel}
              </span>
            )}
          </span>
          <div className="btn-group">
            <a className="btn btn-outline-secondary btn-sm" href={STOCK_TRANSFER_URL.list()}>
              <Translate id="react.stockTransfer.show.listStockTransfers.label" defaultMessage="List Stock Transfers" />
            </a>
            {stockTransfer.canEdit
              ? (
                <a
                  className="btn btn-outline-secondary btn-sm"
                  href={editUrl}
                  data-testid="stock-transfer-show-edit-button"
                >
                  <Translate id="react.stockTransfer.show.editStockTransfer.label" defaultMessage="Edit Stock Transfer" />
                </a>
              )
              : (
                <button
                  type="button"
                  className="btn btn-outline-secondary btn-sm"
                  disabled
                  title={translate('react.stockTransfer.show.editCompleted.label', 'Cannot edit completed order')}
                  data-testid="stock-transfer-show-edit-button"
                >
                  <Translate id="react.stockTransfer.show.editStockTransfer.label" defaultMessage="Edit Stock Transfer" />
                </button>
              )}
            {stockTransfer.canDelete && (
              <button
                type="button"
                className="btn btn-outline-danger btn-sm"
                onClick={onDelete}
                data-testid="stock-transfer-show-delete-button"
              >
                <Translate id="react.default.button.delete.label" defaultMessage="Delete" />
              </button>
            )}
            <a
              className="btn btn-outline-secondary btn-sm"
              href={STOCK_TRANSFER_URL.print(stockTransfer.id)}
              target="_blank"
              rel="noopener noreferrer"
              data-testid="stock-transfer-show-print-button"
            >
              <Translate id="react.stockTransfer.show.printStockTransfer.label" defaultMessage="Print Stock Transfer" />
            </a>
          </div>
        </div>
        <div className="card-body">
          <div className="row">
            <div className="col-md-6">
              <h5><Translate id="react.stockTransfer.show.orderHeader.label" defaultMessage="Order Header" /></h5>
              <dl className="mb-0">
                <dt><Translate id="react.stockTransfer.show.orderNumber.label" defaultMessage="Order Number" /></dt>
                <dd data-testid="stock-transfer-show-order-number">{stockTransfer.orderNumber}</dd>
                <dt><Translate id="react.stockTransfer.show.status.label" defaultMessage="Status" /></dt>
                <dd>{stockTransfer.statusLabel}</dd>
                <dt><Translate id="react.stockTransfer.show.location.label" defaultMessage="Location" /></dt>
                <dd data-testid="stock-transfer-show-location">{stockTransfer.origin?.name}</dd>
              </dl>
            </div>
            <div className="col-md-6">
              <h5><Translate id="react.stockTransfer.show.auditing.label" defaultMessage="Auditing" /></h5>
              <dl className="mb-0">
                <dt><Translate id="react.stockTransfer.show.createdBy.label" defaultMessage="Created by" /></dt>
                <dd>
                  {stockTransfer.createdBy?.name}
                  {stockTransfer.dateCreated && <small className="d-block text-muted">{formatDate(stockTransfer.dateCreated)}</small>}
                </dd>
                <dt><Translate id="react.stockTransfer.show.updatedBy.label" defaultMessage="Updated by" /></dt>
                <dd>
                  {stockTransfer.updatedBy?.name}
                  {stockTransfer.lastUpdated && <small className="d-block text-muted">{formatDate(stockTransfer.lastUpdated)}</small>}
                </dd>
                <dt><Translate id="react.stockTransfer.show.completedBy.label" defaultMessage="Completed by" /></dt>
                <dd>
                  {stockTransfer.completedBy
                    ? (
                      <>
                        {stockTransfer.completedBy.name}
                        {stockTransfer.dateCompleted && <small className="d-block text-muted">{formatDate(stockTransfer.dateCompleted)}</small>}
                      </>
                    )
                    : <Translate id="react.default.none.label" defaultMessage="None" />}
                </dd>
              </dl>
            </div>
          </div>
        </div>
      </div>
      <div className="card">
        <div className="card-header">
          <Translate id="react.stockTransfer.show.summary.label" defaultMessage="Summary" />
        </div>
        <div className="card-body p-0">
          {(stockTransfer.orderItems ?? []).length === 0
            ? (
              <div className="text-center text-muted p-3">
                <Translate id="react.stockTransfer.show.noItems.label" defaultMessage="There are no items" />
              </div>
            )
            : (
              <table className="table table-sm table-bordered mb-0" data-testid="stock-transfer-show-items-table">
                <thead>
                  <tr>
                    <th>{translate('react.stockTransfer.show.column.productCode.label', 'Code')}</th>
                    <th>{translate('react.stockTransfer.show.column.product.label', 'Product')}</th>
                    <th>{translate('react.stockTransfer.show.column.lotNumber.label', 'Lot')}</th>
                    <th>{translate('react.stockTransfer.show.column.expirationDate.label', 'Expires')}</th>
                    <th>{translate('react.stockTransfer.show.column.qtyTransferred.label', 'Qty transferred')}</th>
                    <th>{translate('react.stockTransfer.show.column.transferredFrom.label', 'Transferred From')}</th>
                    <th>{translate('react.stockTransfer.show.column.transferredTo.label', 'Transferred To')}</th>
                  </tr>
                </thead>
                <tbody>
                  {(stockTransfer.orderItems ?? []).map((item) => (
                    <tr key={item.id}>
                      <td style={item.product?.color ? { color: item.product.color } : undefined}>
                        {item.product?.productCode}
                      </td>
                      <td>
                        <a
                          href={INVENTORY_ITEM_URL.showStockCard(item.product?.id)}
                          style={item.product?.color ? { color: item.product.color } : undefined}
                        >
                          {item.product?.name}
                        </a>
                      </td>
                      <td>{item.lotNumber}</td>
                      <td>{formatDate(item.expirationDate)}</td>
                      <td>{item.quantity}</td>
                      <td>{item.originBinLocation}</td>
                      <td>{item.destinationBinLocation}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
        </div>
      </div>
    </div>
  );
};

export default StockTransferShow;
