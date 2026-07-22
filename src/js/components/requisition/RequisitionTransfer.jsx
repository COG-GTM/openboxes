import React, { useEffect, useMemo, useState } from 'react';

import { getTranslate } from 'react-localize-redux';
import { useSelector } from 'react-redux';
import { useParams } from 'react-router-dom';
import Alert from 'react-s-alert';

import requisitionApi from 'api/services/RequisitionApi';
import RequisitionSummary from 'components/requisition/RequisitionSummary';
import { REQUISITION_URL } from 'consts/applicationUrls';
import useTranslation from 'hooks/useTranslation';
import { debouncePeopleFetch } from 'utils/option-utils';
import Select from 'utils/Select';
import Translate, { translateWithDefaultMessage } from 'utils/Translate';

const RequisitionTransfer = () => {
  const { requisitionId } = useParams();
  const [requisition, setRequisition] = useState(null);
  const [issuedBy, setIssuedBy] = useState(null);
  const [deliveredBy, setDeliveredBy] = useState(null);
  const [comments, setComments] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const translate = useSelector(
    (state) => translateWithDefaultMessage(getTranslate(state.localize)),
  );

  useTranslation('requisition', 'default');

  const debouncedPeopleFetch = useMemo(() => debouncePeopleFetch(500, 2), []);

  useEffect(() => {
    requisitionApi.getRequisition(requisitionId)
      .then(({ data }) => setRequisition(data?.data))
      .catch((err) => {
        setError(err?.response?.data?.errorMessage
          || translate('react.default.errors.error.label', 'An error occurred'));
      });
  }, [requisitionId]);

  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      await requisitionApi.issueRequisition(requisitionId, {
        issuedById: issuedBy?.id || null,
        deliveredById: deliveredBy?.id || null,
        comments: comments || null,
      });
      window.location.assign(REQUISITION_URL.show(requisitionId));
    } catch (err) {
      const message = err?.response?.data?.errorMessage;
      if (message) {
        Alert.error(message);
      }
      setSaving(false);
    }
  };

  if (error) {
    return <div className="alert alert-danger m-3" role="alert">{error}</div>;
  }

  if (!requisition) {
    return null;
  }

  const alreadyIssued = requisition.status === 'ISSUED' || requisition.status === 'CANCELED';
  const pickedItems = requisition.requisitionItems
    ?.flatMap((item) => (item.picklistItems ?? []).map((picklistItem) => ({
      ...picklistItem,
      product: item.product,
    }))) ?? [];

  return (
    <div className="d-flex flex-column m-3">
      <RequisitionSummary requisition={requisition} currentStep="transfer" />
      {alreadyIssued ? (
        <div className="alert alert-info" role="alert" data-testid="requisition-transfer-issued-notice">
          <Translate
            id="react.requisition.transfer.alreadyIssued.label"
            defaultMessage="This requisition has already been issued or canceled."
          />
        </div>
      ) : (
        <div className="card mb-3">
          <div className="card-header">
            <Translate id="react.requisition.transfer.label" defaultMessage="Transfer stock" />
          </div>
          <form className="card-body" onSubmit={submit}>
            <div className="form-group row">
              <label className="col-sm-3 col-form-label" htmlFor="requisition-issued-by-select">
                <Translate id="react.requisition.issuedBy.label" defaultMessage="Issued by" />
              </label>
              <div className="col-sm-6">
                <Select
                  async
                  loadOptions={debouncedPeopleFetch}
                  value={issuedBy}
                  onChange={(value) => setIssuedBy(value)}
                  valueKey="id"
                  labelKey="name"
                  placeholder="Search person..."
                  id="requisition-issued-by-select"
                />
              </div>
            </div>
            <div className="form-group row">
              <label className="col-sm-3 col-form-label" htmlFor="requisition-delivered-by-select">
                <Translate id="react.requisition.deliveredBy.label" defaultMessage="Delivered by" />
              </label>
              <div className="col-sm-6">
                <Select
                  async
                  loadOptions={debouncedPeopleFetch}
                  value={deliveredBy}
                  onChange={(value) => setDeliveredBy(value)}
                  valueKey="id"
                  labelKey="name"
                  placeholder="Search person..."
                  id="requisition-delivered-by-select"
                />
              </div>
            </div>
            <div className="form-group row">
              <label className="col-sm-3 col-form-label" htmlFor="requisition-transfer-comments">
                <Translate id="react.requisition.comments.label" defaultMessage="Comments" />
              </label>
              <div className="col-sm-6">
                <textarea
                  id="requisition-transfer-comments"
                  className="form-control"
                  value={comments}
                  onChange={(event) => setComments(event.target.value)}
                  data-testid="requisition-transfer-comments"
                />
              </div>
            </div>
            <div className="d-flex justify-content-center">
              <a className="btn btn-outline-secondary mr-2" href={REQUISITION_URL.confirm(requisitionId)}>
                <Translate id="react.default.button.back.label" defaultMessage="Back" />
              </a>
              <button type="submit" className="btn btn-primary" disabled={saving} data-testid="requisition-transfer-finish-button">
                <Translate id="react.requisition.transfer.finish.label" defaultMessage="Finish" />
              </button>
            </div>
          </form>
        </div>
      )}
      <div className="card">
        <div className="card-header">
          <Translate id="react.requisition.pickedItems.label" defaultMessage="Picked items" />
        </div>
        <table className="table table-sm table-striped mb-0" data-testid="requisition-transfer-items">
          <thead>
            <tr>
              <th>{translate('react.requisition.item.product.label', 'Product')}</th>
              <th>{translate('react.requisition.item.binLocation.label', 'Bin')}</th>
              <th>{translate('react.requisition.item.lotNumber.label', 'Lot')}</th>
              <th className="text-right">{translate('react.default.quantity.label', 'Quantity')}</th>
              <th>{translate('react.requisition.item.uom.label', 'UOM')}</th>
            </tr>
          </thead>
          <tbody>
            {pickedItems.map((picklistItem) => (
              <tr key={picklistItem.id}>
                <td>
                  {picklistItem.product?.productCode}
                  {' '}
                  {picklistItem.product?.name}
                </td>
                <td>{picklistItem.binLocation?.name}</td>
                <td>{picklistItem.lotNumber}</td>
                <td className="text-right">{picklistItem.quantity}</td>
                <td>{picklistItem.product?.unitOfMeasure || 'EA'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default RequisitionTransfer;
