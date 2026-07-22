import React, { useEffect, useState } from 'react';

import { getTranslate } from 'react-localize-redux';
import { useSelector } from 'react-redux';
import { useParams } from 'react-router-dom';

import requisitionApi from 'api/services/RequisitionApi';
import { BARCODE_URL } from 'consts/applicationUrls';
import useTranslation from 'hooks/useTranslation';
import Translate, { translateWithDefaultMessage } from 'utils/Translate';

const RequisitionPrintDraft = () => {
  const { requisitionId } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const translate = useSelector(
    (state) => translateWithDefaultMessage(getTranslate(state.localize)),
  );

  useTranslation('requisition', 'default');

  useEffect(() => {
    requisitionApi.getRequisitionPrintDraft(requisitionId)
      .then((response) => setData(response.data?.data))
      .catch((err) => {
        setError(err?.response?.data?.errorMessage
          || translate('react.default.errors.error.label', 'An error occurred'));
      });
  }, [requisitionId]);

  if (error) {
    return <div className="alert alert-danger m-3" role="alert">{error}</div>;
  }

  if (!data) {
    return null;
  }

  return (
    <div className="requisition-print-draft m-3">
      <div className="d-flex mb-3 d-print-none">
        <button type="button" className="btn btn-primary mr-2" onClick={() => window.print()}>
          <Translate id="react.default.button.print.label" defaultMessage="Print" />
        </button>
        <button type="button" className="btn btn-outline-secondary" onClick={() => window.close()}>
          <Translate id="react.default.button.close.label" defaultMessage="Close" />
        </button>
      </div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h3>{data.name}</h3>
        {data.requestNumber && (
          <div className="text-center">
            <img
              src={BARCODE_URL.render(data.requestNumber)}
              alt={data.requestNumber}
            />
            <div className="small">{data.requestNumber}</div>
          </div>
        )}
      </div>
      <table className="table table-sm table-bordered w-auto" data-testid="requisition-print-draft-summary">
        <tbody>
          <tr>
            <th>{translate('react.requisition.origin.label', 'Origin')}</th>
            <td>{data.origin?.name}</td>
          </tr>
          <tr>
            <th>{translate('react.requisition.destination.label', 'Destination')}</th>
            <td>{data.destination?.name}</td>
          </tr>
          <tr>
            <th>{translate('react.requisition.dateRequested.label', 'Date requested')}</th>
            <td>{data.dateRequested}</td>
          </tr>
          <tr>
            <th>{translate('react.requisition.requestedBy.label', 'Requested by')}</th>
            <td>{data.requestedBy?.name}</td>
          </tr>
        </tbody>
      </table>
      <table className="table table-sm table-bordered" data-testid="requisition-print-draft-items">
        <thead>
          <tr>
            <th>{translate('react.requisition.item.product.label', 'Product')}</th>
            <th className="text-right">{translate('react.requisition.item.requested.label', 'Requested')}</th>
            <th>{translate('react.requisition.item.uom.label', 'UOM')}</th>
            <th>{translate('react.requisition.item.binLocation.label', 'Bin')}</th>
            <th>{translate('react.requisition.item.lotNumber.label', 'Lot')}</th>
            <th>{translate('react.requisition.item.expirationDate.label', 'Expires')}</th>
            <th className="text-right">{translate('react.requisition.item.picked.label', 'Picked')}</th>
          </tr>
        </thead>
        <tbody>
          {data.requisitionItems?.map((item) => {
            const picklistItems = item.picklistItems ?? [];
            if (!picklistItems.length) {
              return (
                <tr key={item.id}>
                  <td>
                    {item.product?.productCode}
                    {' '}
                    {item.product?.name}
                  </td>
                  <td className="text-right">{item.quantity}</td>
                  <td>{item.product?.unitOfMeasure || 'EA'}</td>
                  <td>{item.binLocation || 'N/A'}</td>
                  <td />
                  <td />
                  <td className="text-right" />
                </tr>
              );
            }
            return picklistItems.map((picklistItem, index) => (
              <tr key={picklistItem.id}>
                {index === 0 && (
                  <>
                    <td rowSpan={picklistItems.length}>
                      {item.product?.productCode}
                      {' '}
                      {item.product?.name}
                    </td>
                    <td className="text-right" rowSpan={picklistItems.length}>{item.quantity}</td>
                    <td rowSpan={picklistItems.length}>{item.product?.unitOfMeasure || 'EA'}</td>
                    <td rowSpan={picklistItems.length}>{item.binLocation || 'N/A'}</td>
                  </>
                )}
                <td>{picklistItem.lotNumber}</td>
                <td>{picklistItem.expirationDate}</td>
                <td className="text-right">{picklistItem.quantity}</td>
              </tr>
            ));
          })}
        </tbody>
      </table>
      <table className="table table-sm table-bordered mt-4" data-testid="requisition-print-draft-signatures">
        <thead>
          <tr>
            <th aria-label="empty" />
            <th>{translate('react.requisition.signature.name.label', 'Name')}</th>
            <th>{translate('react.requisition.signature.signature.label', 'Signature')}</th>
            <th>{translate('react.requisition.signature.date.label', 'Date')}</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <th>{translate('react.requisition.requestedBy.label', 'Requested by')}</th>
            <td>{data.requestedBy?.name}</td>
            <td />
            <td>{data.dateRequested}</td>
          </tr>
          <tr>
            <th>{translate('react.requisition.fulfilledBy.label', 'Fulfilled by')}</th>
            <td />
            <td />
            <td />
          </tr>
        </tbody>
      </table>
    </div>
  );
};

export default RequisitionPrintDraft;
