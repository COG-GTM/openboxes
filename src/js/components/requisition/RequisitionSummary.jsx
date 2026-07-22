import React from 'react';

import PropTypes from 'prop-types';

import { BARCODE_URL, REQUISITION_URL } from 'consts/applicationUrls';
import Translate from 'utils/Translate';

const WIZARD_STEPS = ['show', 'edit', 'review', 'pick', 'confirm', 'transfer'];

const RequisitionSummary = ({ requisition, currentStep }) => {
  if (!requisition?.id) {
    return null;
  }
  const currentIndex = WIZARD_STEPS.indexOf(currentStep);
  return (
    <div className="requisition-summary">
      <div className="d-flex align-items-center p-3 bg-white border rounded mb-2">
        <div className="text-center mr-3">
          {requisition.requestNumber && (
            <div>
              <img
                src={BARCODE_URL.render(requisition.requestNumber)}
                alt={requisition.requestNumber}
              />
              <div className="small">{requisition.requestNumber}</div>
            </div>
          )}
        </div>
        <div className="flex-grow-1">
          <h5 className="mb-0">{requisition.name}</h5>
        </div>
        <div>
          <span className="badge badge-info p-2">{requisition.status}</span>
        </div>
      </div>
      <div className="d-flex align-items-center mb-3">
        {WIZARD_STEPS.map((step, index) => {
          let variant = 'btn-outline-secondary';
          if (index === currentIndex) {
            variant = 'btn-primary';
          } else if (currentIndex > -1 && index < currentIndex) {
            variant = 'btn-outline-primary';
          }
          return (
            <a
              key={step}
              className={`btn btn-sm ${variant} mr-1`}
              href={`${REQUISITION_URL.base}/${step}/${requisition.id}`}
            >
              {`${index + 1}. `}
              <Translate id={`react.requisition.wizard.${step}.label`} defaultMessage={step} />
            </a>
          );
        })}
      </div>
    </div>
  );
};

export default RequisitionSummary;

RequisitionSummary.propTypes = {
  requisition: PropTypes.shape({
    id: PropTypes.string,
    name: PropTypes.string,
    status: PropTypes.string,
    requestNumber: PropTypes.string,
  }),
  currentStep: PropTypes.string,
};

RequisitionSummary.defaultProps = {
  requisition: null,
  currentStep: null,
};
