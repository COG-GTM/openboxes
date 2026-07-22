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

const RequisitionConfirm = () => {
  const { requisitionId } = useParams();
  const [requisition, setRequisition] = useState(null);
  const [checkedBy, setCheckedBy] = useState(null);
  const [dateChecked, setDateChecked] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const translate = useSelector(
    (state) => translateWithDefaultMessage(getTranslate(state.localize)),
  );

  useTranslation('requisition', 'default');

  const debouncedPeopleFetch = useMemo(() => debouncePeopleFetch(500, 2), []);

  useEffect(() => {
    requisitionApi.confirmRequisition(requisitionId)
      .then(({ data }) => {
        const fetched = data?.data;
        setRequisition(fetched);
        setCheckedBy(fetched?.checkedBy ?? null);
        setDateChecked(fetched?.dateChecked ?? '');
      })
      .catch((err) => {
        setError(err?.response?.data?.errorMessage
          || translate('react.default.errors.error.label', 'An error occurred'));
      });
  }, [requisitionId]);

  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      const { data } = await requisitionApi.saveRequisitionDetails(requisitionId, {
        checkedById: checkedBy?.id || null,
        dateChecked: dateChecked || null,
      });
      const saved = data?.data;
      setRequisition((previous) => ({
        ...previous,
        checkedBy: saved?.checkedBy ?? null,
        dateChecked: saved?.dateChecked ?? null,
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

  if (error) {
    return <div className="alert alert-danger m-3" role="alert">{error}</div>;
  }

  if (!requisition) {
    return null;
  }

  return (
    <div className="d-flex flex-column m-3">
      <RequisitionSummary requisition={requisition} currentStep="confirm" />
      <div className="card mb-3">
        <div className="card-header">
          <Translate id="react.requisition.confirm.label" defaultMessage="Confirm requisition" />
        </div>
        <form className="card-body" onSubmit={submit}>
          <div className="form-group row">
            <label className="col-sm-3 col-form-label" htmlFor="requisition-checked-by-select">
              <Translate id="react.requisition.checkedBy.label" defaultMessage="Checked by" />
            </label>
            <div className="col-sm-6">
              <Select
                async
                loadOptions={debouncedPeopleFetch}
                value={checkedBy}
                onChange={(value) => setCheckedBy(value)}
                valueKey="id"
                labelKey="name"
                placeholder="Search person..."
                id="requisition-checked-by-select"
              />
            </div>
          </div>
          <div className="form-group row">
            <label className="col-sm-3 col-form-label" htmlFor="requisition-date-checked">
              <Translate id="react.requisition.dateChecked.label" defaultMessage="Date checked" />
            </label>
            <div className="col-sm-6">
              <input
                type="date"
                id="requisition-date-checked"
                className="form-control"
                value={dateChecked || ''}
                onChange={(event) => setDateChecked(event.target.value)}
                data-testid="requisition-date-checked"
              />
            </div>
          </div>
          <div className="d-flex justify-content-center">
            <a className="btn btn-outline-secondary mr-2" href={REQUISITION_URL.pick(requisitionId)}>
              <Translate id="react.default.button.back.label" defaultMessage="Back" />
            </a>
            <button type="submit" className="btn btn-primary" disabled={saving} data-testid="requisition-confirm-button">
              <Translate id="react.default.button.save.label" defaultMessage="Save" />
            </button>
          </div>
        </form>
      </div>
      <div className="card">
        <div className="card-header">
          <Translate id="react.requisition.requisitionItems.label" defaultMessage="Requisition items" />
        </div>
        <table className="table table-sm table-striped mb-0" data-testid="requisition-confirm-items">
          <thead>
            <tr>
              <th>{translate('react.requisition.item.status.label', 'Status')}</th>
              <th>{translate('react.requisition.item.product.label', 'Product')}</th>
              <th>{translate('react.requisition.item.binLocation.label', 'Bin')}</th>
              <th>{translate('react.requisition.item.lotNumber.label', 'Lot')}</th>
              <th className="text-right">{translate('react.requisition.item.requested.label', 'Requested')}</th>
              <th className="text-right">{translate('react.requisition.item.picked.label', 'Picked')}</th>
              <th className="text-right">{translate('react.requisition.item.canceled.label', 'Canceled')}</th>
              <th className="text-right">{translate('react.requisition.item.remaining.label', 'Remaining')}</th>
              <th>{translate('react.requisition.item.uom.label', 'UOM')}</th>
              <th>{translate('react.requisition.item.reasonCode.label', 'Reason code')}</th>
            </tr>
          </thead>
          <tbody>
            {requisition.requisitionItems?.map((item) => (
              <tr key={item.id}>
                <td>{item.status}</td>
                <td>
                  {item.product?.productCode}
                  {' '}
                  {item.product?.name}
                </td>
                <td>
                  {item.picklistItems?.map((picklistItem) => (
                    <div key={picklistItem.id}>{picklistItem.binLocation?.name}</div>
                  ))}
                </td>
                <td>
                  {item.picklistItems?.map((picklistItem) => (
                    <div key={picklistItem.id}>{picklistItem.lotNumber}</div>
                  ))}
                </td>
                <td className="text-right">{item.quantity}</td>
                <td className="text-right">{item.quantityPicked}</td>
                <td className="text-right">{item.quantityCanceled}</td>
                <td className="text-right">{item.quantityRemaining}</td>
                <td>{item.product?.unitOfMeasure || 'EA'}</td>
                <td>{item.cancelReasonCode}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default RequisitionConfirm;
