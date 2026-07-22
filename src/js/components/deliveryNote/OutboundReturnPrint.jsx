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
const formatExpiry = (value) => {
  if (!value) {
    return '';
  }
  const date = new Date(value);
  return `${String(date.getUTCMonth() + 1).padStart(2, '0')}/${date.getUTCFullYear()}`;
};

const formatDateTime = (value) => {
  if (!value) {
    return '';
  }
  const date = new Date(value);
  return `${date.getUTCDate()} ${MONTHS[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
};

const Address = ({ location }) => (
  <div>
    <div><strong>{location?.name}</strong></div>
    {location?.address?.address && <div>{location.address.address}</div>}
    {location?.address?.address2 && <div>{location.address.address2}</div>}
    {(location?.address?.city
      || location?.address?.stateOrProvince
      || location?.address?.postalCode) && (
      <div>
        {[location.address.city, location.address.stateOrProvince, location.address.postalCode]
          .filter(Boolean).join(' ')}
      </div>
    )}
    {location?.address?.country && <div>{location.address.country}</div>}
  </div>
);

// Rows for a single shipment item: if any receipt item differs from the
// shipped item (product, lot or expiry), show the original struck through
// followed by one row per receipt item (mirrors the legacy
// _printOutboundReturnTable.gsp behavior).
const ShipmentItemRows = ({ item, index }) => {
  const receiptItems = item.receiptItems ?? [];
  const anyChanged = receiptItems.some((ri) => ri.productId !== item.productId
    || (ri.lotNumber ?? '') !== (item.lotNumber ?? '')
    || (ri.expirationDate ?? null) !== (item.expirationDate ?? null));

  if (!anyChanged) {
    const quantityReceived = receiptItems.reduce((sum, ri) => sum + (ri.quantityReceived ?? 0), 0);
    const comments = receiptItems.map((ri) => ri.comment).filter(Boolean).join(', ');
    return (
      <tr data-testid="outbound-return-print-item-row">
        <td className="text-center">{index + 1}</td>
        <td>{item.productCode}</td>
        <td>{item.productName}</td>
        <td>{item.lotNumber ?? ''}</td>
        <td className="text-nowrap">{formatExpiry(item.expirationDate)}</td>
        <td className="text-center">{item.quantity}</td>
        <td className="text-center">{quantityReceived || ''}</td>
        <td>{comments}</td>
      </tr>
    );
  }

  return (
    <>
      <tr data-testid="outbound-return-print-item-row">
        <td className="text-center" rowSpan={receiptItems.length + 1}>{index + 1}</td>
        <td><del>{item.productCode}</del></td>
        <td><del>{item.productName}</del></td>
        <td><del>{item.lotNumber ?? ''}</del></td>
        <td className="text-nowrap"><del>{formatExpiry(item.expirationDate)}</del></td>
        <td className="text-center"><del>{item.quantity}</del></td>
        <td />
        <td />
      </tr>
      {receiptItems.map((ri) => (
        <tr key={ri.id} data-testid="outbound-return-print-receipt-row">
          <td>{ri.productCode}</td>
          <td>{ri.productName}</td>
          <td>{ri.lotNumber ?? ''}</td>
          <td className="text-nowrap">{formatExpiry(ri.expirationDate)}</td>
          <td />
          <td className="text-center">{ri.quantityReceived || ''}</td>
          <td>{ri.comment ?? ''}</td>
        </tr>
      ))}
    </>
  );
};

const OutboundReturnPrint = () => {
  const { id } = useParams();

  useTranslation('deliveryNote', 'default');
  const translate = useTranslate();

  const [shipment, setShipment] = useState(null);
  const [loadError, setLoadError] = useState(null);

  useEffect(() => {
    if (!id) {
      return;
    }
    setShipment(null);
    setLoadError(null);
    shipmentApi.getOutboundReturnPrintData(id)
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
      <div className="d-flex flex-column m-3" data-testid="outbound-return-print-error">
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

  return (
    <div className="d-flex flex-column m-3" data-testid="outbound-return-print-page">
      <div className="d-flex justify-content-end mb-2 d-print-none">
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => window.print()}
          data-testid="outbound-return-print-button"
        >
          <Translate id="react.default.button.print.label" defaultMessage="Print" />
        </button>
      </div>
      <div className="card">
        <div className="card-body">
          <div className="row mb-3">
            <div className="col-8">
              <h2><Translate id="react.deliveryNote.label" defaultMessage="Delivery Note" /></h2>
              <div className="h5" data-testid="outbound-return-print-shipment-number">
                {shipment.shipmentNumber}
                {' '}
                {shipment.name}
              </div>
            </div>
            <div className="col-4">
              <table className="table table-sm table-borderless mb-0">
                <tbody>
                  <tr>
                    <td className="text-right font-weight-bold">
                      {translate('react.deliveryNote.origin.label', 'Origin')}
                      :
                    </td>
                    <td data-testid="outbound-return-print-origin">{shipment.origin?.name}</td>
                  </tr>
                  <tr>
                    <td className="text-right font-weight-bold">
                      {translate('react.deliveryNote.destination.label', 'Destination')}
                      :
                    </td>
                    <td data-testid="outbound-return-print-destination">{shipment.destination?.name}</td>
                  </tr>
                  <tr>
                    <td className="text-right font-weight-bold">
                      {translate('react.deliveryNote.shipDate.label', 'Ship date')}
                      :
                    </td>
                    <td>{formatDateTime(shipment.expectedShippingDate)}</td>
                  </tr>
                  <tr>
                    <td className="text-right font-weight-bold">
                      {translate('react.deliveryNote.receivedDate.label', 'Received date')}
                      :
                    </td>
                    <td>{formatDateTime(shipment.receivedDate)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          {(shipment.origin?.address || shipment.destination?.address) && (
            <div className="row mb-3">
              <div className="col-6">
                <h5><Translate id="react.deliveryNote.receivedFrom.label" defaultMessage="Received From" /></h5>
                <Address location={shipment.origin} />
              </div>
              <div className="col-6">
                <h5><Translate id="react.deliveryNote.deliveredTo.label" defaultMessage="Delivered To" /></h5>
                <Address location={shipment.destination} />
              </div>
            </div>
          )}
          <table className="table table-sm table-bordered" data-testid="outbound-return-print-items-table">
            <thead>
              <tr>
                <th className="text-center">{translate('react.deliveryNote.number.label', 'No.')}</th>
                <th>{translate('react.deliveryNote.productCode.label', 'Code')}</th>
                <th>{translate('react.deliveryNote.product.label', 'Product')}</th>
                <th>{translate('react.deliveryNote.lotNumber.label', 'Lot')}</th>
                <th>{translate('react.deliveryNote.expirationDate.label', 'Expiry')}</th>
                <th className="text-center">{translate('react.deliveryNote.quantityDelivered.label', 'Qty Delivered')}</th>
                <th className="text-center">{translate('react.deliveryNote.quantityReceived.label', 'Qty Received')}</th>
                <th>{translate('react.deliveryNote.comment.label', 'Comment')}</th>
              </tr>
            </thead>
            <tbody>
              {(shipment.shipmentItems ?? []).map((item, index) => (
                <ShipmentItemRows key={item.id} item={item} index={index} />
              ))}
            </tbody>
          </table>
          <div className="mt-4">
            <h5><Translate id="react.deliveryNote.notes.label" defaultMessage="Notes" /></h5>
            <div>
              <strong>
                {translate('react.deliveryNote.trackingNumber.label', 'Tracking number')}
                :
                {' '}
              </strong>
              {shipment.referenceNumber ?? ''}
            </div>
            <div>
              <strong>
                {translate('react.deliveryNote.driverName.label', 'Driver name')}
                :
                {' '}
              </strong>
              {shipment.driverName ?? ''}
            </div>
            <div>
              <strong>
                {translate('react.deliveryNote.comments.label', 'Comments')}
                :
                {' '}
              </strong>
              {shipment.additionalInformation ?? ''}
            </div>
          </div>
          <table className="table table-sm table-borderless mt-5" data-testid="outbound-return-print-signatures">
            <tbody>
              {['sentBy', 'approvedBy', 'deliveredBy', 'receivedBy', 'checkedBy'].map((role) => (
                <tr key={role} className="border-top">
                  <td width="33%">{translate(`react.deliveryNote.${role}.label`, role)}</td>
                  <td width="33%" className="text-center">{translate('react.deliveryNote.signature.label', 'Signature')}</td>
                  <td width="33%" className="text-right">{translate('react.deliveryNote.date.label', 'Date')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default OutboundReturnPrint;
