import React from 'react';

import { useSelector } from 'react-redux';

import PrintButtons from 'components/reporting/shippingReport/PrintButtons';
import useShippingReport, { containerLabel, groupEntriesByContainer } from 'components/reporting/shippingReport/useShippingReport';
import { BARCODE_URL } from 'consts/applicationUrls';
import useTranslate from 'hooks/useTranslate';
import useTranslation from 'hooks/useTranslation';
import Translate from 'utils/Translate';

const PrintPickListReport = () => {
  useTranslation('shippingReport', 'default');
  const translate = useTranslate();
  const { data, error } = useShippingReport();
  const userName = useSelector((state) => state.session.user?.name);

  if (error) {
    return <div className="alert alert-danger m-3" role="alert">{translate('react.shippingReport.fetchError.label', 'Unable to load shipping report')}</div>;
  }

  if (!data) {
    return null;
  }

  const { shipment, entries } = data;
  const groups = groupEntriesByContainer(entries);

  return (
    <div className="m-3" data-testid="print-pick-list-report">
      <PrintButtons />
      {groups.map((group, groupIndex) => (
        // eslint-disable-next-line react/no-array-index-key
        <div key={`${group.key}-${groupIndex}`} style={{ pageBreakAfter: 'always' }}>
          <div className="d-flex justify-content-between align-items-center mb-3">
            <div>
              <h2 className="mb-1">
                <Translate id="react.shippingReport.pickList.label" defaultMessage="Pick List" />
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
          <div className="d-flex justify-content-between mb-3">
            <table className="table table-sm table-borderless w-auto" data-testid="pick-list-details">
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
            <table className="table table-sm table-borderless w-auto">
              <tbody>
                <tr>
                  <th>{translate('react.shippingReport.pickedBy.label', 'Picked by')}</th>
                  <td aria-label="Picked by" />
                </tr>
                <tr>
                  <th>{translate('react.shippingReport.verifiedBy.label', 'Verified by')}</th>
                  <td aria-label="Verified by" />
                </tr>
                <tr>
                  <th>{translate('react.shippingReport.printedBy.label', 'Printed by')}</th>
                  <td aria-label="Printed by">{userName}</td>
                </tr>
                <tr>
                  <th>{translate('react.shippingReport.printedOn.label', 'Printed on')}</th>
                  <td aria-label="Printed on">{new Date().toLocaleString()}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <h4>{containerLabel(group.container, translate)}</h4>
          <table className="table table-sm table-bordered" data-testid="pick-list-items">
            <thead>
              <tr>
                <th>{translate('react.shippingReport.number.label', 'No.')}</th>
                <th>{translate('react.shippingReport.productCode.label', 'Code')}</th>
                <th>{translate('react.shippingReport.productDescription.label', 'Product description')}</th>
                <th>{translate('react.shippingReport.lotNumber.label', 'Lot number')}</th>
                <th>{translate('react.shippingReport.expirationDate.label', 'Expiration date')}</th>
                <th className="text-center">{translate('react.shippingReport.quantityTotal.label', 'Qty')}</th>
                <th>{translate('react.shippingReport.uom.label', 'UoM')}</th>
                <th>{translate('react.shippingReport.bins.label', 'Bins')}</th>
                <th>{translate('react.shippingReport.binPicked.label', 'Bin Picked')}</th>
                <th>{translate('react.shippingReport.lotPicked.label', 'Lot Picked')}</th>
                <th>{translate('react.shippingReport.quantityPicked.label', 'Qty Picked')}</th>
              </tr>
            </thead>
            <tbody>
              {group.entries.map((entry, entryIndex) => (
                // eslint-disable-next-line react/no-array-index-key
                <tr key={`${group.key}-${entryIndex}`}>
                  <td className="text-center">{entryIndex + 1}</td>
                  <td>
                    {entry.productCode && (
                      <div>
                        <img src={BARCODE_URL.render(entry.productCode)} alt={entry.productCode} />
                        <div>{entry.productCode}</div>
                      </div>
                    )}
                  </td>
                  <td>
                    {entry.productName}
                    {entry.coldChain && (
                      <span className="badge badge-info ml-1">
                        {translate('react.shippingReport.coldChain.label', 'Cold chain')}
                      </span>
                    )}
                  </td>
                  <td>{entry.lotNumber}</td>
                  <td>{entry.expirationDate}</td>
                  <td className="text-center">{entry.quantity}</td>
                  <td>{entry.unitOfMeasure}</td>
                  <td>
                    {(entry.binLocations ?? []).map((binLocationEntry, binIndex) => (
                      // eslint-disable-next-line react/no-array-index-key
                      <div key={binIndex}>
                        {`${binLocationEntry.binLocation ?? translate('react.default.label', 'Default')}: ${binLocationEntry.quantity}`}
                      </div>
                    ))}
                  </td>
                  <td>{entry.binLocationPicked}</td>
                  <td aria-label="Lot Picked" />
                  <td aria-label="Qty Picked" />
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

export default PrintPickListReport;
