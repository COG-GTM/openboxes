import React from 'react';

import PropTypes from 'prop-types';

import { SHIPMENT_SHOW_URL } from 'consts/applicationUrls';
import Translate from 'utils/Translate';

// Mirrors the legacy shipment/_summary.gsp header shown on the classic
// shipping screens (showDetails, receiveShipment, sendShipment).
const ShipmentSummaryHeader = ({ shipment }) => (
  <div className="card mb-3" data-testid="shipment-summary-header">
    <div className="card-body d-flex align-items-center justify-content-between py-2">
      <div>
        <h5 className="mb-1">
          <small className="text-muted mr-2">{shipment.shipmentNumber}</small>
          <a href={SHIPMENT_SHOW_URL.show(shipment.id)}>{shipment.name}</a>
        </h5>
        <div className="text-muted small">
          <span className="mr-3">
            <Translate id="react.shipment.shipmentType.label" defaultMessage="Shipment type" />
            {': '}
            <b>{shipment.shipmentType?.name}</b>
          </span>
          <span className="mr-3">
            <Translate id="react.shipment.origin.label" defaultMessage="Origin" />
            {': '}
            <b>{shipment.origin?.name}</b>
          </span>
          <span className="mr-3">
            <Translate id="react.shipment.destination.label" defaultMessage="Destination" />
            {': '}
            <b>{shipment.destination?.name}</b>
          </span>
          <span className="mr-3">
            <Translate id="react.shipment.numItems.label" defaultMessage="Number of items" />
            {': '}
            <b>{shipment.shipmentItemCount}</b>
          </span>
        </div>
      </div>
      <span className="badge badge-secondary" data-testid="shipment-status-badge">
        {shipment.status}
      </span>
    </div>
  </div>
);

ShipmentSummaryHeader.propTypes = {
  shipment: PropTypes.shape({
    id: PropTypes.string,
    name: PropTypes.string,
    shipmentNumber: PropTypes.string,
    status: PropTypes.string,
    shipmentItemCount: PropTypes.number,
    shipmentType: PropTypes.shape({ name: PropTypes.string }),
    origin: PropTypes.shape({ name: PropTypes.string }),
    destination: PropTypes.shape({ name: PropTypes.string }),
  }).isRequired,
};

export default ShipmentSummaryHeader;
