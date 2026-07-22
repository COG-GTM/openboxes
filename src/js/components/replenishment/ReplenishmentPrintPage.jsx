import React, { useEffect, useState } from 'react';

import PropTypes from 'prop-types';
import { getTranslate } from 'react-localize-redux';
import { useSelector } from 'react-redux';
import { useParams } from 'react-router-dom';

import { REPLENISHMENT_PRINT } from 'api/urls';
import useTranslation from 'hooks/useTranslation';
import apiClient from 'utils/apiClient';
import Translate, { translateWithDefaultMessage } from 'utils/Translate';

const GROUP_KEYS = [
  { key: 'coldChain', labelId: 'react.replenishment.print.coldChain.label', defaultLabel: 'Cold chain' },
  { key: 'controlledSubstance', labelId: 'react.replenishment.print.controlledSubstance.label', defaultLabel: 'Controlled substance' },
  { key: 'hazardousMaterial', labelId: 'react.replenishment.print.hazardousMaterial.label', defaultLabel: 'Hazardous material' },
  { key: 'generalGoods', labelId: 'react.replenishment.print.generalGoods.label', defaultLabel: 'General goods' },
];

const GroupTable = ({ groupName, lineItems, translate }) => (
  <table className="table table-sm table-bordered replenishment-print-items" data-testid="replenishment-print-items">
    <thead>
      <tr>
        <th colSpan={10}><h6 className="m-0">{groupName}</h6></th>
      </tr>
      <tr>
        <th>{translate('react.replenishment.print.number.label', '#')}</th>
        <th>{translate('react.replenishment.print.currentBin.label', 'Current bin')}</th>
        <th>{translate('react.replenishment.print.productCode.label', 'Code')}</th>
        <th>{translate('react.replenishment.print.product.label', 'Product')}</th>
        <th>{translate('react.replenishment.print.lotSerialNo.label', 'Lot/Serial No.')}</th>
        <th>{translate('react.replenishment.print.expiry.label', 'Expiry')}</th>
        <th>{translate('react.replenishment.print.transferToBin.label', 'Transfer to bin')}</th>
        <th>{translate('react.replenishment.print.qtyToTransfer.label', 'Qty to transfer')}</th>
        <th>{translate('react.replenishment.print.suggestedPick.label', 'Suggested pick')}</th>
        <th>{translate('react.replenishment.print.notes.label', 'Notes')}</th>
      </tr>
    </thead>
    <tbody>
      {!lineItems.length && (
        <tr>
          <td colSpan={10} className="text-center text-muted">
            <Translate id="react.default.none.label" defaultMessage="None" />
          </td>
        </tr>
      )}
      {lineItems.map((lineItem, i) => {
        const picklistItems = lineItem.picklistItems?.length
          ? lineItem.picklistItems
          : [null];
        return picklistItems.map((picklistItem, j) => (
          <tr key={picklistItem?.id || lineItem.id}>
            {j === 0 && (
              <td rowSpan={picklistItems.length} className="text-center">{i + 1}</td>
            )}
            <td className="text-center">{picklistItem?.binLocation?.name}</td>
            {j === 0 && (
              <>
                <td rowSpan={picklistItems.length} className="text-center">{lineItem.product?.productCode}</td>
                <td rowSpan={picklistItems.length}>{lineItem.product?.name}</td>
              </>
            )}
            <td className="text-center">{picklistItem?.inventoryItem?.lotNumber}</td>
            <td className="text-center">{picklistItem?.inventoryItem?.expirationDate}</td>
            {j === 0 && (
              <>
                <td rowSpan={picklistItems.length} className="text-center">{lineItem.destinationBinLocation?.name}</td>
                <td rowSpan={picklistItems.length} className="text-center">{lineItem.quantity}</td>
              </>
            )}
            <td className="text-center">
              {picklistItem && `${picklistItem.quantity || 0} ${lineItem.product?.unitOfMeasure || 'EA'}`}
            </td>
            <td />
          </tr>
        ));
      })}
    </tbody>
  </table>
);

GroupTable.propTypes = {
  groupName: PropTypes.string.isRequired,
  lineItems: PropTypes.arrayOf(PropTypes.shape({})).isRequired,
  translate: PropTypes.func.isRequired,
};

const ReplenishmentPrintPage = () => {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [pageBreak, setPageBreak] = useState(false);

  const translate = useSelector(
    (state) => translateWithDefaultMessage(getTranslate(state.localize)),
  );

  useTranslation('replenishment', 'default');

  useEffect(() => {
    apiClient.get(REPLENISHMENT_PRINT(id))
      .then((response) => setData(response.data?.data))
      .catch((err) => setError(err?.response?.data?.errorMessage
        || translate('react.default.errors.error.label', 'An error occurred')));
  }, [id]);

  if (error) {
    return <div className="alert alert-danger m-3" role="alert">{error}</div>;
  }

  if (!data) {
    return null;
  }

  const { order, zones } = data;
  const showZoneNames = zones.length > 1 || zones.some((zone) => zone.zoneName);

  return (
    <div className="replenishment-print m-3">
      <div className="d-flex mb-3 d-print-none">
        <button type="button" className="btn btn-primary mr-2" onClick={() => window.print()}>
          <Translate id="react.default.button.print.label" defaultMessage="Print" />
        </button>
        <button type="button" className="btn btn-outline-secondary mr-2" onClick={() => window.close()}>
          <Translate id="react.default.button.close.label" defaultMessage="Close" />
        </button>
        <div className="form-check align-self-center ml-2">
          <input
            id="page-break-checkbox"
            className="form-check-input"
            type="checkbox"
            checked={pageBreak}
            onChange={(e) => setPageBreak(e.target.checked)}
          />
          <label className="form-check-label" htmlFor="page-break-checkbox">
            <Translate id="react.replenishment.print.pageBreak.label" defaultMessage="Page break per zone" />
          </label>
        </div>
      </div>
      <h3>
        <Translate id="react.replenishment.print.title.label" defaultMessage="Transfer Order" />
      </h3>
      <table className="table table-sm table-bordered w-auto" data-testid="replenishment-print-header">
        <tbody>
          <tr>
            <th>{translate('react.replenishment.print.orderNumber.label', 'Order number')}</th>
            <td>{order.orderNumber}</td>
          </tr>
          <tr>
            <th>{translate('react.replenishment.print.createdBy.label', 'Created by')}</th>
            <td>{order.createdBy?.name}</td>
          </tr>
          <tr>
            <th>{translate('react.replenishment.print.dateCreated.label', 'Date created')}</th>
            <td>{order.dateCreated}</td>
          </tr>
        </tbody>
      </table>
      {zones.map((zone) => (
        <div
          key={zone.zoneName || 'no-zone'}
          style={pageBreak ? { pageBreakAfter: 'always' } : undefined}
        >
          {showZoneNames && (
            <h5 className="mt-3">
              {zone.zoneName
                || translate('react.replenishment.print.noZone.label', 'No zone')}
            </h5>
          )}
          {GROUP_KEYS.map(({ key, labelId, defaultLabel }) => (
            zone.lineItems[key]?.length > 0 && (
              <GroupTable
                key={key}
                groupName={translate(labelId, defaultLabel)}
                lineItems={zone.lineItems[key]}
                translate={translate}
              />
            )
          ))}
        </div>
      ))}
      <table className="table table-sm table-bordered mt-4 w-auto" data-testid="replenishment-print-signature">
        <thead>
          <tr>
            <th aria-label="empty" />
            <th>{translate('react.default.name.label', 'Name')}</th>
            <th style={{ minWidth: '250px' }}>{translate('react.default.signature.label', 'Signature')}</th>
            <th>{translate('react.default.date.label', 'Date')}</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <th>{translate('react.replenishment.print.completedBy.label', 'Completed by')}</th>
            <td />
            <td />
            <td />
          </tr>
        </tbody>
      </table>
    </div>
  );
};

export default ReplenishmentPrintPage;
