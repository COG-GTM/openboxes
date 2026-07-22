import React, { useEffect, useState } from 'react';

import { useParams } from 'react-router-dom';
import Alert from 'react-s-alert';

import shipmentApi from 'api/services/ShipmentApi';
import useTranslate from 'hooks/useTranslate';
import useTranslation from 'hooks/useTranslation';
import Translate from 'utils/Translate';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Grails serializes dates as UTC ISO strings; format them in UTC so the
// rendered day/month cannot shift with the client timezone.
const formatDate = (value) => {
  if (!value) {
    return '';
  }
  const date = new Date(value);
  return `${String(date.getUTCDate()).padStart(2, '0')}/${MONTHS[date.getUTCMonth()]}/${date.getUTCFullYear()}`;
};

const formatDateTime = (value) => {
  if (!value) {
    return '';
  }
  const date = new Date(value);
  const hours = date.getUTCHours();
  const meridiem = hours >= 12 ? 'PM' : 'AM';
  const hour12 = hours % 12 || 12;
  const minutes = String(date.getUTCMinutes()).padStart(2, '0');
  return `${date.getUTCDate()} ${MONTHS[date.getUTCMonth()]} ${date.getUTCFullYear()} ${hour12}:${minutes} ${meridiem}`;
};

// The print timestamp reflects the user's local wall clock, like the legacy
// server-rendered "date printed".
const formatLocalDateTime = (date) => {
  const hours = date.getHours();
  const meridiem = hours >= 12 ? 'PM' : 'AM';
  const hour12 = hours % 12 || 12;
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()} ${hour12}:${minutes} ${meridiem}`;
};

// Rows for a single shipment item: an optional struck-through original row
// when the item was split during receiving, then one row per receipt item
// (mirrors the legacy goodsReceiptNote/_body.gsp behavior).
const ShipmentItemRows = ({
  item, index, receipts, translate,
}) => (
  <>
    {item.hasSplit && (
      <tr data-testid="grn-print-split-row">
        <td>{index + 1}</td>
        <td><del>{item.productCode}</del></td>
        <td className="product-name"><del>{item.productName}</del></td>
        <td><del>{item.lotNumber ?? ''}</del></td>
        <td><del>{formatDate(item.expirationDate)}</del></td>
        <td><del>{item.unitOfMeasure || translate('react.default.each.label', 'each')}</del></td>
        <td><del>{item.quantityShipped}</del></td>
        {receipts.map((receipt) => <td key={receipt.id} />)}
        <td />
        <td />
      </tr>
    )}
    {(item.receiptItems ?? []).map((receiptItem, j) => (
      <tr key={receiptItem.id} data-testid="grn-print-item-row">
        <td>{!item.hasSplit && j === 0 ? index + 1 : ''}</td>
        <td>{item.productCode}</td>
        <td className="product-name">{item.productName}</td>
        <td>{receiptItem.lotNumber ?? ''}</td>
        <td>{formatDate(receiptItem.expirationDate)}</td>
        <td>{!item.hasSplit && j === 0 ? (item.unitOfMeasure || translate('react.default.each.label', 'each')) : ''}</td>
        <td>{receiptItem.quantityShipped}</td>
        {receipts.map((receipt) => (
          <td key={receipt.id}>
            {receiptItem.receiptId === receipt.id ? receiptItem.quantityReceived : 0}
          </td>
        ))}
        <td className="text-center">
          {receiptItem.quantityShipped - receiptItem.quantityReceived}
        </td>
        <td>{receiptItem.comment ?? ''}</td>
      </tr>
    ))}
  </>
);

const GoodsReceiptNotePrint = () => {
  const { id } = useParams();

  useTranslation('goodsReceiptNote', 'default');
  const translate = useTranslate();

  const [shipment, setShipment] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [datePrinted] = useState(() => new Date());

  useEffect(() => {
    if (!id) {
      return;
    }
    setShipment(null);
    setLoadError(null);
    shipmentApi.getGoodsReceiptNotePrintData(id)
      .then(({ data }) => setShipment(data?.data))
      .catch((err) => {
        const message = err?.response?.data?.errorMessage;
        setLoadError(message || 'Unable to load shipment');
        if (message) {
          Alert.error(message);
        }
      });
  }, [id]);

  if (loadError) {
    return (
      <div className="d-flex flex-column m-3" data-testid="grn-print-error">
        <div className="alert alert-danger">{loadError}</div>
      </div>
    );
  }

  if (!shipment) {
    return (
      <div className="d-flex flex-column m-3">
        <Translate id="react.default.loading.label" defaultMessage="Loading..." />
      </div>
    );
  }

  const receipts = shipment.receipts ?? [];

  return (
    <div className="d-flex flex-column m-3" data-testid="grn-print-page">
      <div className="d-flex justify-content-between align-items-center mb-2 d-print-none">
        <span className="h5 mb-0">
          <Translate id="react.goodsReceiptNote.label" defaultMessage="Goods Receipt Note" />
        </span>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => window.print()}
          data-testid="grn-print-button"
        >
          <Translate id="react.default.button.print.label" defaultMessage="Print" />
        </button>
      </div>
      <div className="card">
        <div className="card-body">
          <div className="row mb-3">
            <div className="col-8">
              <div className="h5" data-testid="grn-print-status">{shipment.status}</div>
              <h2><Translate id="react.goodsReceiptNote.label" defaultMessage="Goods Receipt Note" /></h2>
              <h5 data-testid="grn-print-shipment-number">
                {shipment.shipmentNumber}
                {' - '}
                {shipment.name}
              </h5>
            </div>
            <div className="col-4">
              <table className="table table-sm table-borderless mb-0">
                <tbody>
                  <tr>
                    <td className="text-right font-weight-bold">
                      {translate('react.goodsReceiptNote.origin.label', 'Origin')}
                      :
                    </td>
                    <td data-testid="grn-print-origin">{shipment.origin?.name}</td>
                  </tr>
                  <tr>
                    <td className="text-right font-weight-bold">
                      {translate('react.goodsReceiptNote.destination.label', 'Destination')}
                      :
                    </td>
                    <td data-testid="grn-print-destination">{shipment.destination?.name}</td>
                  </tr>
                  <tr>
                    <td className="text-right font-weight-bold">
                      {translate('react.goodsReceiptNote.dateShipped.label', 'Date shipped')}
                      :
                    </td>
                    <td>{formatDateTime(shipment.actualShippingDate)}</td>
                  </tr>
                  <tr>
                    <td className="text-right font-weight-bold">
                      {translate('react.goodsReceiptNote.datePrinted.label', 'Date printed')}
                      :
                    </td>
                    <td>{formatLocalDateTime(datePrinted)}</td>
                  </tr>
                  <tr>
                    <td className="text-right font-weight-bold">
                      {translate('react.goodsReceiptNote.lastReceipt.label', 'Last receipt')}
                      :
                    </td>
                    <td>{formatDateTime(shipment.lastReceiptDate)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          <table className="table table-sm table-bordered" data-testid="grn-print-items-table">
            <thead>
              <tr>
                <th aria-label="Row number" />
                <th>{translate('react.goodsReceiptNote.productCode.label', 'Code')}</th>
                <th>{translate('react.goodsReceiptNote.product.label', 'Product')}</th>
                <th>{translate('react.goodsReceiptNote.lotNumber.label', 'Lot number')}</th>
                <th>{translate('react.goodsReceiptNote.expirationDate.label', 'Expiration date')}</th>
                <th>{translate('react.goodsReceiptNote.uom.label', 'UoM')}</th>
                <th>{translate('react.goodsReceiptNote.quantityShipped.label', 'Quantity shipped')}</th>
                {receipts.map((receipt) => (
                  <th key={receipt.id}>
                    {translate('react.goodsReceiptNote.receipt.label', 'Receipt')}
                    {' '}
                    {receipt.receiptNumber}
                  </th>
                ))}
                <th className="text-center">{translate('react.goodsReceiptNote.discrepancy.label', 'Discrepancy')}</th>
                <th>{translate('react.goodsReceiptNote.comment.label', 'Comment')}</th>
              </tr>
            </thead>
            <tbody>
              {(shipment.shipmentItems ?? []).map((item, index) => (
                <ShipmentItemRows
                  key={item.id}
                  item={item}
                  index={index}
                  receipts={receipts}
                  translate={translate}
                />
              ))}
            </tbody>
          </table>
          <table className="table table-sm table-borderless mt-5" data-testid="grn-print-signatures">
            <tbody>
              {['deliveredBy', 'receivedBy', 'checkedBy'].map((role) => (
                <tr key={role} className="border-top">
                  <td width="40%">{translate(`react.goodsReceiptNote.${role}.label`, role)}</td>
                  <td>{translate('react.goodsReceiptNote.signature.label', 'Signature')}</td>
                  <td className="text-right">{translate('react.goodsReceiptNote.date.label', 'Date')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default GoodsReceiptNotePrint;
