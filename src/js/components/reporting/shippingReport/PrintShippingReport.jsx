import React from 'react';

import PrintButtons from 'components/reporting/shippingReport/PrintButtons';
import useShippingReport, { containerLabel, groupEntriesByContainer } from 'components/reporting/shippingReport/useShippingReport';
import { BARCODE_URL } from 'consts/applicationUrls';
import useTranslate from 'hooks/useTranslate';
import useTranslation from 'hooks/useTranslation';
import Translate from 'utils/Translate';

const SIGNATURE_ROWS = [
  [
    { label: 'react.shippingReport.preparedBy.label', defaultLabel: 'Prepared by' },
    { label: 'react.shippingReport.receivedBy.label', defaultLabel: 'Received by' },
  ],
  [
    { label: 'react.shippingReport.deliveredBy.label', defaultLabel: 'Delivered by' },
    { label: 'react.shippingReport.receivedOn.label', defaultLabel: 'Received on' },
  ],
  [
    { label: 'react.shippingReport.deliveredOn.label', defaultLabel: 'Delivered on' },
    { label: 'react.shippingReport.verifiedOn.label', defaultLabel: 'Verified on' },
  ],
  [
    { label: 'react.shippingReport.transportedBy.label', defaultLabel: 'Carrier' },
    { label: 'react.shippingReport.verifiedBy.label', defaultLabel: 'Verified by' },
  ],
];

const PrintShippingReport = () => {
  useTranslation('shippingReport', 'default');
  const translate = useTranslate();
  const { data, error } = useShippingReport();

  if (error) {
    return <div className="alert alert-danger m-3" role="alert">{translate('react.shippingReport.fetchError.label', 'Unable to load shipping report')}</div>;
  }

  if (!data) {
    return null;
  }

  const { shipment, entries } = data;
  const groups = groupEntriesByContainer(entries);
  let rowNumber = 0;

  return (
    <div className="m-3" data-testid="print-shipping-report">
      <PrintButtons />
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h2 className="mb-1">
            <Translate id="react.shippingReport.title.label" defaultMessage="Shipping Report" />
          </h2>
          <div>{shipment.name}</div>
        </div>
        {shipment.shipmentNumber && (
          <div className="text-center">
            <img src={BARCODE_URL.render(shipment.shipmentNumber)} alt={shipment.shipmentNumber} />
            <div>{shipment.shipmentNumber}</div>
          </div>
        )}
      </div>
      <table className="table table-sm table-borderless w-auto" data-testid="shipping-report-details">
        <tbody>
          <tr>
            <th>{translate('react.shippingReport.containerNumber.label', 'Container number')}</th>
            <td aria-label="Container number">{shipment.name}</td>
            <th>{translate('react.shippingReport.plate.label', 'License plate number')}</th>
            <td aria-label="License plate number">{shipment.licensePlateNumber}</td>
          </tr>
          <tr>
            <th>{translate('react.shippingReport.origin.label', 'Origin')}</th>
            <td aria-label="Origin">{shipment.origin?.name}</td>
            <th>{translate('react.shippingReport.destination.label', 'Destination')}</th>
            <td aria-label="Destination">{shipment.destination?.name}</td>
          </tr>
        </tbody>
      </table>
      <table className="table table-sm table-bordered" data-testid="shipping-report-items">
        <thead>
          <tr>
            <th rowSpan={2}>{translate('react.shippingReport.number.label', 'No.')}</th>
            <th rowSpan={2}>{translate('react.shippingReport.container.label', 'Container')}</th>
            <th rowSpan={2}>{translate('react.shippingReport.productCode.label', 'Code')}</th>
            <th rowSpan={2}>{translate('react.shippingReport.productDescription.label', 'Product description')}</th>
            <th rowSpan={2}>{translate('react.shippingReport.lotNumber.label', 'Lot number')}</th>
            <th rowSpan={2}>{translate('react.shippingReport.expirationDate.label', 'Expiration date')}</th>
            <th colSpan={2} className="text-center">{translate('react.shippingReport.quantityDelivered.label', 'Delivered')}</th>
            <th colSpan={2} className="text-center">{translate('react.shippingReport.quantityReceived.label', 'Received')}</th>
          </tr>
          <tr>
            <th className="text-center">{translate('react.shippingReport.quantityPerBox.label', 'Qty per box')}</th>
            <th className="text-center">{translate('react.shippingReport.quantityTotal.label', 'Qty')}</th>
            <th className="text-center">{translate('react.shippingReport.quantityPerBox.label', 'Qty per box')}</th>
            <th className="text-center">{translate('react.shippingReport.quantityTotal.label', 'Qty')}</th>
          </tr>
        </thead>
        <tbody>
          {groups.map((group) => group.entries.map((entry, entryIndex) => {
            rowNumber += 1;
            return (
              // eslint-disable-next-line react/no-array-index-key
              <tr key={`${group.key}-${entryIndex}`} style={entryIndex === 0 ? { borderTop: '3px solid lightgrey' } : undefined}>
                <td className="text-center">{rowNumber}</td>
                <td>{entryIndex === 0 ? containerLabel(group.container, translate) : ''}</td>
                <td>{entry.productCode}</td>
                <td>{entry.productName}</td>
                <td>{entry.lotNumber}</td>
                <td>{entry.expirationDate}</td>
                <td aria-label="Qty per box delivered" />
                <td className="text-center">{entry.quantity}</td>
                <td aria-label="Qty per box received" />
                <td className="text-center">{entry.quantity}</td>
              </tr>
            );
          }))}
          {!entries.length && (
            <tr>
              <td colSpan={10} className="text-center text-muted">
                <Translate id="react.default.noData.label" defaultMessage="No data available in table" />
              </td>
            </tr>
          )}
        </tbody>
      </table>
      <table className="table table-sm table-borderless mt-4" data-testid="shipping-report-signatures">
        <tbody>
          {SIGNATURE_ROWS.map((row) => (
            <tr key={row[0].label}>
              <td width="15%">{translate(row[0].label, row[0].defaultLabel)}</td>
              <td width="30%" style={{ borderBottom: '1px solid black' }} aria-label="Signature" />
              <td width="10%" />
              <td width="15%">{translate(row[1].label, row[1].defaultLabel)}</td>
              <td width="30%" style={{ borderBottom: '1px solid black' }} aria-label="Signature" />
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default PrintShippingReport;
