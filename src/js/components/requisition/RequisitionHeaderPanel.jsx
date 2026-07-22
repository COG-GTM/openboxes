import React from 'react';

import PropTypes from 'prop-types';

import { REQUISITION_URL } from 'consts/applicationUrls';
import Translate from 'utils/Translate';

const groupItemsByStatus = (requisitionItems) => (requisitionItems || [])
  .reduce((acc, item) => ({ ...acc, [item.status]: (acc[item.status] || 0) + 1 }), {});

const RequisitionHeaderPanel = ({ requisition }) => {
  if (!requisition?.id) {
    return null;
  }
  const itemsByStatus = groupItemsByStatus(requisition.requisitionItems);
  const rows = [
    ['react.requisition.requisitionNumber.label', 'Requisition number', requisition.requestNumber],
    ['react.requisition.status.label', 'Status', requisition.status],
    ['react.requisition.requisitionType.label', 'Requisition type', requisition.type],
    ['react.requisition.commodityClass.label', 'Commodity class', requisition.commodityClass],
    ['react.requisition.origin.label', 'Origin', requisition.origin?.name],
    ['react.requisition.destination.label', 'Destination', requisition.destination?.name],
    ['react.requisition.requestedBy.label', 'Requested by', requisition.requestedBy?.name],
    ['react.requisition.verifiedBy.label', 'Verified by', requisition.verifiedBy?.name],
    ['react.requisition.dateRequested.label', 'Date requested', requisition.dateRequested],
    ['react.default.description.label', 'Description', requisition.description],
  ];
  return (
    <div className="card" data-testid="requisition-header-panel">
      <div className="card-header d-flex justify-content-between align-items-center">
        <Translate id="react.requisition.label" defaultMessage="Requisition" />
        <a className="btn btn-sm btn-outline-primary" href={REQUISITION_URL.editHeader(requisition.id)}>
          <Translate id="react.requisition.button.editHeader.label" defaultMessage="Edit header" />
        </a>
      </div>
      <table className="table table-sm mb-0">
        <tbody>
          {rows.map(([id, defaultMessage, value]) => (
            <tr key={id}>
              <td className="font-weight-bold">
                <Translate id={id} defaultMessage={defaultMessage} />
              </td>
              <td>{value || <span className="text-muted">-</span>}</td>
            </tr>
          ))}
          <tr>
            <td className="font-weight-bold">
              <Translate id="react.requisition.itemStatus.label" defaultMessage="Item status" />
            </td>
            <td>
              {Object.entries(itemsByStatus).map(([status, count]) => (
                <div key={status}>{`${status} (${count})`}</div>
              ))}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
};

export default RequisitionHeaderPanel;

RequisitionHeaderPanel.propTypes = {
  requisition: PropTypes.shape({
    id: PropTypes.string,
    requestNumber: PropTypes.string,
    status: PropTypes.string,
    type: PropTypes.string,
    commodityClass: PropTypes.string,
    description: PropTypes.string,
    dateRequested: PropTypes.string,
    origin: PropTypes.shape({ name: PropTypes.string }),
    destination: PropTypes.shape({ name: PropTypes.string }),
    requestedBy: PropTypes.shape({ name: PropTypes.string }),
    verifiedBy: PropTypes.shape({ name: PropTypes.string }),
    requisitionItems: PropTypes.arrayOf(PropTypes.shape({})),
  }),
};

RequisitionHeaderPanel.defaultProps = {
  requisition: null,
};
