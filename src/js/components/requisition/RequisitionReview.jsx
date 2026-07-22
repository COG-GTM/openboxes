import React, {
  useCallback, useEffect, useMemo, useState,
} from 'react';

import { getTranslate } from 'react-localize-redux';
import { useSelector } from 'react-redux';
import { useParams } from 'react-router-dom';
import Alert from 'react-s-alert';

import requisitionApi from 'api/services/RequisitionApi';
import RequisitionSummary from 'components/requisition/RequisitionSummary';
import { REQUISITION_ITEM_URL, REQUISITION_URL } from 'consts/applicationUrls';
import useTranslation from 'hooks/useTranslation';
import { debouncePeopleFetch } from 'utils/option-utils';
import Select from 'utils/Select';
import Translate, { translateWithDefaultMessage } from 'utils/Translate';

const approvedQuantity = (item) => {
  if (item.isChanged && item.modificationItem) {
    return item.modificationItem.quantityApproved;
  }
  if (item.isSubstituted && item.substitutionItem) {
    return item.substitutionItem.quantityApproved;
  }
  return item.quantityApproved;
};

const RequisitionReview = () => {
  const { requisitionId } = useParams();
  const [requisition, setRequisition] = useState(null);
  const [verifiedBy, setVerifiedBy] = useState(null);
  const [dateVerified, setDateVerified] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const translate = useSelector(
    (state) => translateWithDefaultMessage(getTranslate(state.localize)),
  );

  useTranslation('requisition', 'default');

  const debouncedPeopleFetch = useMemo(() => debouncePeopleFetch(500, 2), []);

  const fetchRequisition = useCallback(() => {
    requisitionApi.reviewRequisition(requisitionId)
      .then(({ data }) => {
        const fetched = data?.data;
        setRequisition(fetched);
        setVerifiedBy(fetched?.verifiedBy ?? null);
        setDateVerified(fetched?.dateVerified ?? '');
      })
      .catch((err) => {
        setError(err?.response?.data?.errorMessage
          || translate('react.default.errors.error.label', 'An error occurred'));
      });
  }, [requisitionId]);

  useEffect(() => {
    fetchRequisition();
  }, [fetchRequisition]);

  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      const { data } = await requisitionApi.saveRequisitionDetails(requisitionId, {
        verifiedById: verifiedBy?.id || null,
        dateVerified: dateVerified || null,
      });
      const saved = data?.data;
      setRequisition((previous) => ({
        ...previous,
        verifiedBy: saved?.verifiedBy ?? null,
        dateVerified: saved?.dateVerified ?? null,
      }));
      Alert.success(translate('react.default.alert.saveSuccess.label', 'Saved successfully'));
    } catch (err) {
      const message = err?.response?.data?.errorMessage;
      if (message) {
        Alert.error(message);
      }
    } finally {
      setSaving(false);
    }
  };

  const undoChanges = async (itemId) => {
    try {
      await requisitionApi.undoRequisitionItemChanges(itemId);
      fetchRequisition();
    } catch (err) {
      const message = err?.response?.data?.errorMessage;
      if (message) {
        Alert.error(message);
      }
    }
  };

  if (error) {
    return <div className="alert alert-danger m-3" role="alert">{error}</div>;
  }

  if (!requisition) {
    return null;
  }

  const originalItems = requisition.requisitionItems?.filter((item) => item.isOriginal) ?? [];

  return (
    <div className="d-flex flex-column m-3">
      <RequisitionSummary requisition={requisition} currentStep="review" />
      <div className="card mb-3">
        <div className="card-header">
          <Translate id="react.requisition.review.label" defaultMessage="Review requisition" />
        </div>
        <form className="card-body" onSubmit={submit}>
          <div className="form-group row">
            <label className="col-sm-3 col-form-label" htmlFor="requisition-verified-by-select">
              <Translate id="react.requisition.verifiedBy.label" defaultMessage="Verified by" />
            </label>
            <div className="col-sm-6">
              <Select
                async
                loadOptions={debouncedPeopleFetch}
                value={verifiedBy}
                onChange={(value) => setVerifiedBy(value)}
                valueKey="id"
                labelKey="name"
                placeholder="Search person..."
                id="requisition-verified-by-select"
              />
            </div>
          </div>
          <div className="form-group row">
            <label className="col-sm-3 col-form-label" htmlFor="requisition-date-verified">
              <Translate id="react.requisition.dateVerified.label" defaultMessage="Date verified" />
            </label>
            <div className="col-sm-6">
              <input
                type="date"
                id="requisition-date-verified"
                className="form-control"
                value={dateVerified || ''}
                onChange={(event) => setDateVerified(event.target.value)}
                data-testid="requisition-date-verified"
              />
            </div>
          </div>
          <div className="d-flex justify-content-center">
            <a className="btn btn-outline-secondary mr-2" href={REQUISITION_URL.edit(requisitionId)}>
              <Translate id="react.default.button.back.label" defaultMessage="Back" />
            </a>
            <button type="submit" className="btn btn-primary mr-2" disabled={saving} data-testid="requisition-review-save-button">
              <Translate id="react.default.button.save.label" defaultMessage="Save" />
            </button>
            <a className="btn btn-outline-primary" href={REQUISITION_URL.pick(requisitionId)} data-testid="requisition-review-next">
              <Translate id="react.default.button.next.label" defaultMessage="Next" />
            </a>
          </div>
        </form>
      </div>
      <div className="card">
        <div className="card-header">
          <Translate id="react.requisition.requisitionItems.label" defaultMessage="Requisition items" />
        </div>
        <table className="table table-sm table-striped mb-0" data-testid="requisition-review-items">
          <thead>
            <tr>
              <th>{translate('react.default.actions.label', 'Actions')}</th>
              <th>{translate('react.requisition.item.status.label', 'Status')}</th>
              <th>{translate('react.requisition.item.product.label', 'Product')}</th>
              <th className="text-right">{translate('react.requisition.item.requested.label', 'Requested')}</th>
              <th className="text-right">{translate('react.requisition.item.approved.label', 'Approved')}</th>
              <th className="text-right">{translate('react.requisition.item.available.label', 'Available')}</th>
              <th>{translate('react.requisition.item.reasonCode.label', 'Reason code')}</th>
            </tr>
          </thead>
          <tbody>
            {originalItems.map((item) => (
              <tr key={item.id}>
                <td>
                  {item.canEdit && (
                    <a className="btn btn-sm btn-outline-primary mr-1" href={REQUISITION_ITEM_URL.change(item.id)}>
                      <Translate id="react.default.button.edit.label" defaultMessage="Edit" />
                    </a>
                  )}
                  {item.canUndoChanges && (
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-secondary"
                      onClick={() => undoChanges(item.id)}
                    >
                      <Translate id="react.requisition.undo.label" defaultMessage="Undo" />
                    </button>
                  )}
                </td>
                <td>{item.status}</td>
                <td>
                  <div>
                    {item.product?.productCode}
                    {' '}
                    {item.product?.name}
                  </div>
                  {item.isSubstituted && item.substitutionItem && (
                    <div className="small text-muted">
                      &rarr;
                      {' '}
                      {item.substitutionItem.product?.productCode}
                      {' '}
                      {item.substitutionItem.product?.name}
                    </div>
                  )}
                  {item.isChanged && item.modificationItem && (
                    <div className="small text-muted">
                      &rarr;
                      {' '}
                      {item.modificationItem.product?.productCode}
                      {' '}
                      {item.modificationItem.product?.name}
                    </div>
                  )}
                </td>
                <td className="text-right">{item.quantity}</td>
                <td className="text-right">
                  {approvedQuantity(item)}
                </td>
                <td className="text-right">
                  {requisition.quantityOnHandMap?.[item.product?.id] ?? 0}
                </td>
                <td>{item.cancelReasonCode}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default RequisitionReview;
