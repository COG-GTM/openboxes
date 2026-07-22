import React, { useEffect, useState } from 'react';

import { getTranslate } from 'react-localize-redux';
import { useSelector } from 'react-redux';
import { useParams } from 'react-router-dom';

import requisitionApi from 'api/services/RequisitionApi';
import RequisitionSummary from 'components/requisition/RequisitionSummary';
import { REQUISITION_URL } from 'consts/applicationUrls';
import useTranslation from 'hooks/useTranslation';
import Translate, { translateWithDefaultMessage } from 'utils/Translate';

const RequisitionShow = () => {
  const { requisitionId } = useParams();
  const [requisition, setRequisition] = useState(null);
  const [error, setError] = useState(null);
  const translate = useSelector(
    (state) => translateWithDefaultMessage(getTranslate(state.localize)),
  );

  useTranslation('requisition', 'default');

  useEffect(() => {
    requisitionApi.getRequisition(requisitionId)
      .then(({ data }) => setRequisition(data?.data))
      .catch((err) => {
        setError(err?.response?.data?.errorMessage
          || translate('react.default.errors.error.label', 'An error occurred'));
      });
  }, [requisitionId]);

  if (error) {
    return <div className="alert alert-danger m-3" role="alert">{error}</div>;
  }

  if (!requisition) {
    return null;
  }

  const originalItems = requisition.requisitionItems?.filter((item) => item.isOriginal) ?? [];

  return (
    <div className="d-flex flex-column m-3">
      <RequisitionSummary requisition={requisition} currentStep="show" />
      <div className="card">
        <div className="card-header">
          <Translate id="react.requisition.requisitionItems.label" defaultMessage="Requisition items" />
        </div>
        <table className="table table-sm table-striped mb-0" data-testid="requisition-show-items">
          <thead>
            <tr>
              <th>{translate('react.requisition.item.status.label', 'Status')}</th>
              <th>{translate('react.requisition.item.product.label', 'Product')}</th>
              <th>{translate('react.requisition.item.uom.label', 'UOM')}</th>
              <th className="text-right">{translate('react.requisition.item.requested.label', 'Requested')}</th>
              <th className="text-right">{translate('react.requisition.item.approved.label', 'Approved')}</th>
              <th className="text-right">{translate('react.requisition.item.picked.label', 'Picked')}</th>
              <th className="text-right">{translate('react.requisition.item.remaining.label', 'Remaining')}</th>
            </tr>
          </thead>
          <tbody>
            {originalItems.map((item) => (
              <tr key={item.id}>
                <td>{item.status}</td>
                <td>
                  {item.product?.productCode}
                  {' '}
                  {item.product?.name}
                </td>
                <td>{item.product?.unitOfMeasure || 'EA'}</td>
                <td className="text-right">{item.quantity}</td>
                <td className="text-right">{item.quantityApproved}</td>
                <td className="text-right">{item.quantityPicked}</td>
                <td className="text-right">{item.quantityRemaining}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="d-flex justify-content-center mt-3">
        <a className="btn btn-outline-secondary mr-2" href={REQUISITION_URL.list()}>
          <Translate id="react.default.button.back.label" defaultMessage="Back" />
        </a>
        <a className="btn btn-primary" href={REQUISITION_URL.edit(requisitionId)} data-testid="requisition-show-next">
          <Translate id="react.default.button.next.label" defaultMessage="Next" />
        </a>
      </div>
    </div>
  );
};

export default RequisitionShow;
