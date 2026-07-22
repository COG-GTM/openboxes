import React, { useEffect, useMemo, useState } from 'react';

import { useParams } from 'react-router-dom';
import Alert from 'react-s-alert';

import requisitionApi from 'api/services/RequisitionApi';
import RequisitionSummary from 'components/requisition/RequisitionSummary';
import { REQUISITION_URL } from 'consts/applicationUrls';
import useTranslation from 'hooks/useTranslation';
import { debounceLocationsFetch, debouncePeopleFetch } from 'utils/option-utils';
import Select from 'utils/Select';
import Translate from 'utils/Translate';

const REQUISITION_TYPES = ['STOCK', 'NON_STOCK', 'ADHOC', 'DEFAULT'];

const COMMODITY_CLASSES = [
  'CONSUMABLES', 'MEDICATION', 'MIXED', 'COLD_CHAIN',
  'CONTROLLED_SUBSTANCE', 'HAZARDOUS_MATERIAL', 'DURABLE', 'NONE',
];

const RequisitionEditHeader = () => {
  const { requisitionId } = useParams();
  const [requisition, setRequisition] = useState(null);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useTranslation('requisition', 'default');

  const debouncedPeopleFetch = useMemo(() => debouncePeopleFetch(500, 2), []);
  const debouncedLocationsFetch = useMemo(() => debounceLocationsFetch(500, 2, null, true), []);

  useEffect(() => {
    requisitionApi.getRequisition(requisitionId)
      .then(({ data }) => {
        const fetched = data?.data;
        setRequisition(fetched);
        setForm({
          requestNumber: fetched?.requestNumber ?? '',
          name: fetched?.name ?? '',
          type: fetched?.type ?? null,
          commodityClass: fetched?.commodityClass ?? null,
          origin: fetched?.origin ?? null,
          destination: fetched?.destination ?? null,
          requestedBy: fetched?.requestedBy ?? null,
          verifiedBy: fetched?.verifiedBy ?? null,
          checkedBy: fetched?.checkedBy ?? null,
          dateRequested: fetched?.dateRequested ?? '',
          requestedDeliveryDate: fetched?.requestedDeliveryDate ?? '',
          description: fetched?.description ?? '',
        });
      })
      .catch((err) => {
        setError(err?.response?.data?.errorMessage || 'An error occurred while loading the requisition');
      });
  }, [requisitionId]);

  const setField = (field, value) => setForm((previous) => ({ ...previous, [field]: value }));

  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      await requisitionApi.updateRequisitionHeader(requisitionId, {
        requestNumber: form.requestNumber || null,
        name: form.name || null,
        type: form.type || null,
        commodityClass: form.commodityClass || null,
        originId: form.origin?.id || null,
        destinationId: form.destination?.id || null,
        requestedById: form.requestedBy?.id || null,
        verifiedById: form.verifiedBy?.id || null,
        checkedById: form.checkedBy?.id || null,
        dateRequested: form.dateRequested || null,
        requestedDeliveryDate: form.requestedDeliveryDate || null,
        description: form.description || null,
      });
      window.location = REQUISITION_URL.edit(requisitionId);
    } catch (err) {
      const message = err?.response?.data?.errors?.join('; ')
        || err?.response?.data?.errorMessage;
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

  return (
    <div className="d-flex flex-column m-3">
      <RequisitionSummary requisition={requisition} currentStep="edit" />
      <div className="card">
        <div className="card-header d-flex justify-content-between align-items-center">
          <Translate id="react.requisition.editHeader.label" defaultMessage="Edit requisition header" />
          <a className="btn btn-sm btn-outline-secondary" href={REQUISITION_URL.edit(requisitionId)}>
            <Translate id="react.default.button.cancel.label" defaultMessage="Cancel" />
          </a>
        </div>
        <form className="card-body" onSubmit={submit}>
          <div className="form-group row">
            <label className="col-sm-3 col-form-label" htmlFor="requisition-request-number">
              <Translate id="react.requisition.requisitionNumber.label" defaultMessage="Requisition number" />
            </label>
            <div className="col-sm-6">
              <input
                id="requisition-request-number"
                className="form-control"
                value={form.requestNumber || ''}
                onChange={(event) => setField('requestNumber', event.target.value)}
                data-testid="requisition-request-number"
              />
            </div>
          </div>
          <div className="form-group row">
            <label className="col-sm-3 col-form-label" htmlFor="requisition-name">
              <Translate id="react.default.name.label" defaultMessage="Name" />
            </label>
            <div className="col-sm-6">
              <input
                id="requisition-name"
                className="form-control"
                value={form.name || ''}
                onChange={(event) => setField('name', event.target.value)}
                data-testid="requisition-name"
              />
            </div>
          </div>
          <div className="form-group row">
            <label className="col-sm-3 col-form-label" htmlFor="requisition-type-select">
              <Translate id="react.requisition.requisitionType.label" defaultMessage="Requisition type" />
            </label>
            <div className="col-sm-6">
              <Select
                options={REQUISITION_TYPES.map((value) => ({ value, label: value }))}
                value={form.type ? { value: form.type, label: form.type } : null}
                onChange={(value) => setField('type', value?.value ?? value ?? null)}
                id="requisition-type-select"
              />
            </div>
          </div>
          <div className="form-group row">
            <label className="col-sm-3 col-form-label" htmlFor="requisition-origin-select">
              <Translate id="react.requisition.origin.label" defaultMessage="Origin" />
            </label>
            <div className="col-sm-6">
              <Select
                async
                loadOptions={debouncedLocationsFetch}
                value={form.origin}
                onChange={(value) => setField('origin', value)}
                valueKey="id"
                labelKey="name"
                id="requisition-origin-select"
              />
            </div>
          </div>
          <div className="form-group row">
            <label className="col-sm-3 col-form-label" htmlFor="requisition-destination-select">
              <Translate id="react.requisition.destination.label" defaultMessage="Destination" />
            </label>
            <div className="col-sm-6">
              <Select
                async
                loadOptions={debouncedLocationsFetch}
                value={form.destination}
                onChange={(value) => setField('destination', value)}
                valueKey="id"
                labelKey="name"
                id="requisition-destination-select"
              />
            </div>
          </div>
          <div className="form-group row">
            <label className="col-sm-3 col-form-label" htmlFor="requisition-commodity-class-select">
              <Translate id="react.requisition.commodityClass.label" defaultMessage="Commodity class" />
            </label>
            <div className="col-sm-6">
              <Select
                options={COMMODITY_CLASSES.map((value) => ({ value, label: value }))}
                value={form.commodityClass
                  ? { value: form.commodityClass, label: form.commodityClass } : null}
                onChange={(value) => setField('commodityClass', value?.value ?? value ?? null)}
                id="requisition-commodity-class-select"
              />
            </div>
          </div>
          <div className="form-group row">
            <label className="col-sm-3 col-form-label" htmlFor="requisition-requested-by-select">
              <Translate id="react.requisition.requestedBy.label" defaultMessage="Requested by" />
            </label>
            <div className="col-sm-6">
              <Select
                async
                loadOptions={debouncedPeopleFetch}
                value={form.requestedBy}
                onChange={(value) => setField('requestedBy', value)}
                valueKey="id"
                labelKey="name"
                id="requisition-requested-by-select"
              />
            </div>
          </div>
          <div className="form-group row">
            <label className="col-sm-3 col-form-label" htmlFor="requisition-verified-by-select">
              <Translate id="react.requisition.verifiedBy.label" defaultMessage="Verified by" />
            </label>
            <div className="col-sm-6">
              <Select
                async
                loadOptions={debouncedPeopleFetch}
                value={form.verifiedBy}
                onChange={(value) => setField('verifiedBy', value)}
                valueKey="id"
                labelKey="name"
                id="requisition-verified-by-select"
              />
            </div>
          </div>
          <div className="form-group row">
            <label className="col-sm-3 col-form-label" htmlFor="requisition-checked-by-select">
              <Translate id="react.requisition.checkedBy.label" defaultMessage="Checked by" />
            </label>
            <div className="col-sm-6">
              <Select
                async
                loadOptions={debouncedPeopleFetch}
                value={form.checkedBy}
                onChange={(value) => setField('checkedBy', value)}
                valueKey="id"
                labelKey="name"
                id="requisition-checked-by-select"
              />
            </div>
          </div>
          <div className="form-group row">
            <label className="col-sm-3 col-form-label" htmlFor="requisition-date-requested">
              <Translate id="react.requisition.dateRequested.label" defaultMessage="Date requested" />
            </label>
            <div className="col-sm-6">
              <input
                type="date"
                id="requisition-date-requested"
                className="form-control"
                value={form.dateRequested || ''}
                onChange={(event) => setField('dateRequested', event.target.value)}
                data-testid="requisition-date-requested"
              />
            </div>
          </div>
          <div className="form-group row">
            <label className="col-sm-3 col-form-label" htmlFor="requisition-requested-delivery-date">
              <Translate id="react.requisition.requestedDeliveryDate.label" defaultMessage="Requested delivery date" />
            </label>
            <div className="col-sm-6">
              <input
                type="date"
                id="requisition-requested-delivery-date"
                className="form-control"
                value={form.requestedDeliveryDate || ''}
                onChange={(event) => setField('requestedDeliveryDate', event.target.value)}
                data-testid="requisition-requested-delivery-date"
              />
            </div>
          </div>
          <div className="form-group row">
            <label className="col-sm-3 col-form-label" htmlFor="requisition-description">
              <Translate id="react.default.comments.label" defaultMessage="Comments" />
            </label>
            <div className="col-sm-6">
              <textarea
                id="requisition-description"
                className="form-control"
                rows="3"
                value={form.description || ''}
                onChange={(event) => setField('description', event.target.value)}
                data-testid="requisition-description"
              />
            </div>
          </div>
          <div className="d-flex justify-content-center">
            <a className="btn btn-outline-secondary mr-2" href={REQUISITION_URL.show(requisitionId)}>
              <Translate id="react.default.button.back.label" defaultMessage="Back" />
            </a>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={saving}
              data-testid="requisition-save-header-button"
            >
              <Translate id="react.default.button.next.label" defaultMessage="Next" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RequisitionEditHeader;
