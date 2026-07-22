import React from 'react';

import PropTypes from 'prop-types';
import { getTranslate } from 'react-localize-redux';
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';

import { CREATE_SHIPMENT_URL, SHIPMENT_SHOW_URL } from 'consts/applicationUrls';
import { translateWithDefaultMessage } from 'utils/Translate';

const STEPS = [
  { key: 'details', label: 'react.shipment.wizard.details.label', defaultLabel: 'Details' },
  { key: 'tracking', label: 'react.shipment.wizard.tracking.label', defaultLabel: 'Tracking' },
  { key: 'packing', label: 'react.shipment.wizard.packing.label', defaultLabel: 'Packing' },
  { key: 'picking', label: 'react.shipment.wizard.picking.label', defaultLabel: 'Picking' },
  { key: 'sending', label: 'react.shipment.wizard.sending.label', defaultLabel: 'Sending' },
];

const stepUrl = (step, shipmentId) => {
  switch (step) {
    case 'details': return CREATE_SHIPMENT_URL.details(shipmentId);
    case 'tracking': return CREATE_SHIPMENT_URL.tracking(shipmentId);
    case 'packing': return CREATE_SHIPMENT_URL.packing(shipmentId);
    case 'picking': return CREATE_SHIPMENT_URL.picking(shipmentId);
    case 'sending': return CREATE_SHIPMENT_URL.sending(shipmentId);
    default: return CREATE_SHIPMENT_URL.details(shipmentId);
  }
};

const ShipmentWizardHeader = ({ shipment, currentStep }) => {
  const translate = useSelector(
    (state) => translateWithDefaultMessage(getTranslate(state.localize)),
  );
  const currentIndex = STEPS.findIndex((step) => step.key === currentStep);

  return (
    <div className="mb-3" data-testid="shipment-wizard-header">
      <div className="card mb-2">
        <div className="card-body py-2">
          <h5 className="mb-1" data-testid="shipment-wizard-title">
            {shipment?.id ? (
              <>
                {shipment.shipmentNumber && <small className="text-muted mr-2">{shipment.shipmentNumber}</small>}
                <a href={SHIPMENT_SHOW_URL.show(shipment.id)}>{shipment.name}</a>
              </>
            ) : translate('react.shipment.wizard.newShipment.label', 'New Shipment')}
          </h5>
          <div className="small text-muted">
            {shipment?.shipmentType && (
              <span className="mr-3">
                {translate('react.shipment.shipmentType.label', 'Shipment type')}
                {': '}
                <strong>{shipment.shipmentType.name}</strong>
              </span>
            )}
            {shipment?.origin && (
              <span className="mr-3">
                {translate('react.shipment.origin.label', 'Origin')}
                {': '}
                <strong>{shipment.origin.name}</strong>
              </span>
            )}
            {shipment?.destination && (
              <span className="mr-3">
                {translate('react.shipment.destination.label', 'Destination')}
                {': '}
                <strong>{shipment.destination.name}</strong>
              </span>
            )}
            {shipment?.expectedShippingDate && !shipment?.hasShipped && (
              <span className="mr-3">
                {translate('react.shipment.expectedShippingDate.label', 'Expected shipping date')}
                {': '}
                <strong>{shipment.expectedShippingDate}</strong>
              </span>
            )}
            {shipment?.hasShipped && shipment?.actualShippingDate && (
              <span className="mr-3">
                {translate('react.shipment.actualShippingDate.label', 'Actual shipping date')}
                {': '}
                <strong>{shipment.actualShippingDate}</strong>
              </span>
            )}
          </div>
        </div>
      </div>
      <ul className="nav nav-pills" data-testid="shipment-wizard-steps">
        {STEPS.map((step, index) => {
          let className = 'nav-link';
          if (index === currentIndex) {
            className += ' active';
          } else if (!shipment?.id) {
            className += ' disabled';
          }
          return (
            <li className="nav-item" key={step.key}>
              {shipment?.id ? (
                <Link className={className} to={stepUrl(step.key, shipment.id)}>
                  {`${index + 1}. ${translate(step.label, step.defaultLabel)}`}
                </Link>
              ) : (
                <span className={className}>
                  {`${index + 1}. ${translate(step.label, step.defaultLabel)}`}
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default ShipmentWizardHeader;

ShipmentWizardHeader.propTypes = {
  shipment: PropTypes.shape({
    id: PropTypes.string,
    name: PropTypes.string,
    shipmentNumber: PropTypes.string,
    hasShipped: PropTypes.bool,
    expectedShippingDate: PropTypes.string,
    actualShippingDate: PropTypes.string,
    shipmentType: PropTypes.shape({ name: PropTypes.string }),
    origin: PropTypes.shape({ name: PropTypes.string }),
    destination: PropTypes.shape({ name: PropTypes.string }),
  }),
  currentStep: PropTypes.string.isRequired,
};

ShipmentWizardHeader.defaultProps = {
  shipment: null,
};
