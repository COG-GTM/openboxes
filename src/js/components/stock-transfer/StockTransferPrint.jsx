import React, { useEffect, useState } from 'react';

import { useParams } from 'react-router-dom';
import Alert from 'react-s-alert';

import stockTransferApi from 'api/services/StockTransferApi';
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

// Mirrors the legacy print.gsp zone ordering (named zones alphabetically,
// items without a zone last)
const compareZoneNames = (a, b) => {
  if (!a) {
    return !b ? 0 : 1;
  }
  if (!b) {
    return -1;
  }
  return a.localeCompare(b);
};

// Mirrors the legacy print.gsp buckets: an item appears in EVERY category it
// matches; only General Goods is exclusive
const GROUPS = [
  {
    key: 'coldChain',
    labelId: 'react.stockTransfer.print.coldChain.label',
    defaultMessage: 'Cold Chain',
    includes: (item) => Boolean(item.coldChain),
  },
  {
    key: 'controlledSubstance',
    labelId: 'react.stockTransfer.print.controlledSubstance.label',
    defaultMessage: 'Controlled Substance',
    includes: (item) => Boolean(item.controlledSubstance),
  },
  {
    key: 'hazardousMaterial',
    labelId: 'react.stockTransfer.print.hazardousMaterial.label',
    defaultMessage: 'Hazardous Material',
    includes: (item) => Boolean(item.hazardousMaterial),
  },
  {
    key: 'other',
    labelId: 'react.stockTransfer.print.generalGoods.label',
    defaultMessage: 'General Goods',
    includes: (item) => !item.coldChain && !item.controlledSubstance && !item.hazardousMaterial,
  },
];

const StockTransferPrint = () => {
  const { stockTransferId } = useParams();

  useTranslation('stockTransfer', 'default');

  const translate = useTranslate();

  const [stockTransfer, setStockTransfer] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [pageBreak, setPageBreak] = useState('');

  useEffect(() => {
    if (!stockTransferId) {
      return;
    }
    setStockTransfer(null);
    setLoadError(null);
    stockTransferApi.getStockTransferPrintData(stockTransferId)
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
      <div className="d-flex flex-column m-3" data-testid="stock-transfer-print-error">
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

  const enablePageBreak = pageBreak === 'Enable page break';
  const items = stockTransfer.orderItems ?? [];
  const zoneNames = [...new Set(items.map((item) => item.zoneName ?? null))]
    .sort(compareZoneNames);

  const renderGroupTable = (groupItems, groupLabel, pageBreakAfter) => (
    <div className="mb-3" style={{ pageBreakAfter }} key={groupLabel}>
      <h5>{groupLabel}</h5>
      <table className="table table-sm table-bordered mb-0" data-testid="stock-transfer-print-items-table">
        <thead>
          <tr>
            <th>{translate('react.stockTransfer.print.number.label', '#')}</th>
            <th>{translate('react.stockTransfer.print.currentBin.label', 'Current bin')}</th>
            <th>{translate('react.stockTransfer.show.column.productCode.label', 'Code')}</th>
            <th>{translate('react.stockTransfer.show.column.product.label', 'Product')}</th>
            <th>{translate('react.stockTransfer.print.lotSerialNo.label', 'Lot/Serial No.')}</th>
            <th>{translate('react.stockTransfer.print.expiry.label', 'Expiry')}</th>
            <th>{translate('react.stockTransfer.print.transferToBin.label', 'Transfer to bin')}</th>
            <th>{translate('react.stockTransfer.print.qtyToTransfer.label', 'Qty to transfer')}</th>
            <th>{translate('react.stockTransfer.print.notes.label', 'Notes')}</th>
          </tr>
        </thead>
        <tbody>
          {groupItems.length === 0 && (
            <tr>
              <td colSpan={9} className="text-center text-muted">
                <Translate id="react.default.none.label" defaultMessage="None" />
              </td>
            </tr>
          )}
          {groupItems.map((item, index) => {
            const splitItems = item.splitItems?.length
              ? item.splitItems
              : [{
                id: item.id,
                destinationBinLocation: item.destinationBinLocation,
                quantity: item.quantity,
              }];
            return splitItems.map((splitItem, splitIndex) => (
              <tr key={splitItem.id} style={{ backgroundColor: index % 2 === 0 ? '#fff' : '#f7f7f7' }}>
                {splitIndex === 0 && (
                  <>
                    <td rowSpan={splitItems.length} className="text-center">{index + 1}</td>
                    <td rowSpan={splitItems.length} className="text-center">{item.originBinLocation}</td>
                    <td rowSpan={splitItems.length} className="text-center">{item.productCode}</td>
                    <td rowSpan={splitItems.length}>{item.productName}</td>
                    <td rowSpan={splitItems.length} className="text-center">{item.lotNumber}</td>
                    <td rowSpan={splitItems.length} className="text-center">{formatDate(item.expirationDate)}</td>
                  </>
                )}
                <td className="text-center">{splitItem.destinationBinLocation}</td>
                <td className="text-center">{splitItem.quantity}</td>
                <td />
              </tr>
            ));
          })}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="d-flex flex-column m-3" data-testid="stock-transfer-print-page">
      <div className="d-flex justify-content-between align-items-center mb-2 d-print-none">
        <h4 className="mb-0">
          <Translate id="react.stockTransfer.print.title.label" defaultMessage="Print Stock Transfer" />
        </h4>
        <div className="d-flex align-items-center">
          <select
            className="form-control form-control-sm mr-2"
            value={pageBreak}
            onChange={(event) => setPageBreak(event.target.value)}
            data-testid="stock-transfer-print-page-break-select"
          >
            <option value="">{translate('react.stockTransfer.print.pageBreak.label', 'Page break')}</option>
            <option value="Disable page break">Disable page break</option>
            <option value="Enable page break">Enable page break</option>
          </select>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => window.print()}
            data-testid="stock-transfer-print-button"
          >
            <Translate id="react.default.button.print.label" defaultMessage="Print" />
          </button>
        </div>
      </div>
      <div className="card">
        <div className="card-body">
          <div className="row mb-3">
            <div className="col-6">
              <h4><Translate id="react.stockTransfer.print.transferOrder.label" defaultMessage="Transfer Order" /></h4>
            </div>
            <div className="col-6 text-right">
              <div>
                <Translate id="react.stockTransfer.show.orderNumber.label" defaultMessage="Order Number" />
                {': '}
                <span data-testid="stock-transfer-print-order-number">{stockTransfer.orderNumber}</span>
              </div>
              <div>
                <Translate id="react.stockTransfer.show.createdBy.label" defaultMessage="Created by" />
                {': '}
                {stockTransfer.createdBy}
              </div>
              <div>
                <Translate id="react.stockTransfer.print.dateCreated.label" defaultMessage="Date created" />
                {': '}
                {formatDate(stockTransfer.dateCreated)}
              </div>
            </div>
          </div>
          {zoneNames.map((zoneName, zoneIndex) => {
            const zoneItems = items.filter((item) => (item.zoneName ?? null) === zoneName);
            const itemsByGroup = GROUPS.map((group) => ({
              ...group,
              items: zoneItems.filter(group.includes),
            })).filter((group) => group.items.length > 0);
            const showZoneName = Boolean(zoneName) || zoneNames.length > 1;
            return (
              <div
                key={zoneName ?? 'no-zone'}
                style={{
                  pageBreakAfter:
                    enablePageBreak && showZoneName && zoneIndex < zoneNames.length - 1
                      ? 'always'
                      : 'avoid',
                }}
                data-testid="stock-transfer-print-zone"
              >
                {showZoneName && (
                  <h4>{zoneName ?? translate('react.stockTransfer.print.noZone.label', 'No zone')}</h4>
                )}
                {itemsByGroup.map((group, index) => renderGroupTable(
                  group.items,
                  translate(group.labelId, group.defaultMessage),
                  enablePageBreak && !showZoneName
                    && (group.key === 'other' || index < itemsByGroup.length - 1)
                    ? 'always' : 'avoid',
                ))}
              </div>
            );
          })}
          <table className="table table-sm mt-4" style={{ maxWidth: '600px' }}>
            <thead>
              <tr>
                <th style={{ width: '15%' }} aria-label="signature role" />
                <th style={{ width: '20%' }}>{translate('react.stockTransfer.print.name.label', 'Name')}</th>
                <th style={{ width: '40%' }}>{translate('react.stockTransfer.print.signature.label', 'Signature')}</th>
                <th style={{ width: '15%' }} className="text-center">{translate('react.stockTransfer.print.date.label', 'Date')}</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><Translate id="react.stockTransfer.show.completedBy.label" defaultMessage="Completed by" /></td>
                <td />
                <td />
                <td />
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default StockTransferPrint;
