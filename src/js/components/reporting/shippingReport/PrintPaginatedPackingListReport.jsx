import React from 'react';

import PrintButtons from 'components/reporting/shippingReport/PrintButtons';
import useShippingReport, { containerLabel, groupEntriesByContainer } from 'components/reporting/shippingReport/useShippingReport';
import { BARCODE_URL } from 'consts/applicationUrls';
import useTranslate from 'hooks/useTranslate';
import useTranslation from 'hooks/useTranslation';
import Translate from 'utils/Translate';

const PrintPaginatedPackingListReport = () => {
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

  return (
    <div className="m-3" data-testid="print-paginated-packing-list-report">
      <PrintButtons />
      {groups.map((group, groupIndex) => (
        // eslint-disable-next-line react/no-array-index-key
        <div key={`${group.key}-${groupIndex}`} style={{ pageBreakAfter: 'always' }}>
          <div className="d-flex justify-content-between align-items-center mb-3">
            <div>
              <h2 className="mb-1">
                <Translate id="react.shippingReport.packingList.label" defaultMessage="Packing List" />
              </h2>
              <div>{shipment.name}</div>
            </div>
            {shipment.shipmentNumber && (
              <div className="text-center">
                <img
                  src={BARCODE_URL.render(shipment.shipmentNumber)}
                  alt={shipment.shipmentNumber}
                />
                <div>{shipment.shipmentNumber}</div>
              </div>
            )}
          </div>
          <table className="table table-sm table-borderless w-auto mx-auto" data-testid="packing-list-details">
            <tbody>
              <tr>
                <th>{translate('react.shippingReport.shipmentNumber.label', 'Shipment number')}</th>
                <td aria-label="Shipment number">{shipment.shipmentNumber}</td>
              </tr>
              <tr>
                <th>{translate('react.shippingReport.expectedShippingDate.label', 'Expected shipping date')}</th>
                <td aria-label="Expected shipping date">{shipment.expectedShippingDate}</td>
              </tr>
              <tr>
                <th>{translate('react.shippingReport.expectedDeliveryDate.label', 'Expected delivery date')}</th>
                <td aria-label="Expected delivery date">{shipment.expectedDeliveryDate}</td>
              </tr>
              <tr>
                <th>{translate('react.shippingReport.origin.label', 'Origin')}</th>
                <td aria-label="Origin">{shipment.origin?.name}</td>
              </tr>
              <tr>
                <th>{translate('react.shippingReport.destination.label', 'Destination')}</th>
                <td aria-label="Destination">{shipment.destination?.name}</td>
              </tr>
            </tbody>
          </table>
          <h4>{containerLabel(group.container, translate)}</h4>
          <table className="table table-sm table-bordered" data-testid="packing-list-items">
            <thead>
              <tr>
                <th>{translate('react.shippingReport.number.label', 'No.')}</th>
                <th aria-label="Barcode" />
                <th>{translate('react.shippingReport.productCode.label', 'Code')}</th>
                <th>{translate('react.shippingReport.productDescription.label', 'Product description')}</th>
                <th>{translate('react.shippingReport.lotNumber.label', 'Lot number')}</th>
                <th>{translate('react.shippingReport.expirationDate.label', 'Expiration date')}</th>
                <th>{translate('react.shippingReport.recipient.label', 'Recipient')}</th>
                <th className="text-center">{translate('react.shippingReport.quantityPerBox.label', 'Qty per box')}</th>
                <th className="text-center">{translate('react.shippingReport.quantityTotal.label', 'Qty')}</th>
              </tr>
            </thead>
            <tbody>
              {group.entries.map((entry, entryIndex) => (
                // eslint-disable-next-line react/no-array-index-key
                <tr key={`${group.key}-${entryIndex}`}>
                  <td className="text-center">{entryIndex + 1}</td>
                  <td>
                    {entry.productCode && (
                      <img src={BARCODE_URL.render(entry.productCode)} alt={entry.productCode} />
                    )}
                  </td>
                  <td>{entry.productCode}</td>
                  <td>{entry.productName}</td>
                  <td>{entry.lotNumber}</td>
                  <td>{entry.expirationDate}</td>
                  <td>{entry.recipient}</td>
                  <td aria-label="Qty per box" />
                  <td className="text-center">{entry.quantity}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-3">
            <div className="font-weight-bold">
              <Translate id="react.shippingReport.comments.label" defaultMessage="Comments" />
            </div>
            <div style={{ border: '1px solid lightgrey', width: '100%', height: '200px' }} />
          </div>
        </div>
      ))}
      {!entries.length && (
        <div className="text-center text-muted">
          <Translate id="react.default.noData.label" defaultMessage="No data available in table" />
        </div>
      )}
    </div>
  );
};

export default PrintPaginatedPackingListReport;
