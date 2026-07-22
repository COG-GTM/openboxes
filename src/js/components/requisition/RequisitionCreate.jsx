import React, { useMemo, useState } from 'react';

import queryString from 'query-string';
import { useSelector } from 'react-redux';
import { useLocation } from 'react-router-dom';
import Alert from 'react-s-alert';

import requisitionApi from 'api/services/RequisitionApi';
import { REQUISITION_TEMPLATE_URL, REQUISITION_URL } from 'consts/applicationUrls';
import useTranslation from 'hooks/useTranslation';
import { debounceLocationsFetch, debouncePeopleFetch } from 'utils/option-utils';
import Select from 'utils/Select';
import Translate from 'utils/Translate';

const COMMODITY_CLASSES = [
  { value: 'CONSUMABLES', label: 'Consumables' },
  { value: 'MEDICATION', label: 'Medication' },
  { value: 'MIXED', label: 'Mixed' },
  { value: 'COLD_CHAIN', label: 'Cold Chain' },
  { value: 'CONTROLLED_SUBSTANCE', label: 'Controlled Substance' },
  { value: 'HAZARDOUS_MATERIAL', label: 'Hazardous Material' },
  { value: 'DURABLE', label: 'Durable' },
  { value: 'NONE', label: 'None' },
];

const RequisitionCreate = () => {
  const location = useLocation();
  const type = queryString.parse(location.search)?.type || 'ADHOC';
  const currentLocation = useSelector((state) => state.session.currentLocation);

  const [destination, setDestination] = useState(null);
  const [requestedBy, setRequestedBy] = useState(null);
  const [commodityClass, setCommodityClass] = useState(null);
  const [dateRequested, setDateRequested] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  useTranslation('requisition', 'default');

  const debouncedPeopleFetch = useMemo(() => debouncePeopleFetch(500, 2), []);
  const debouncedLocationsFetch = useMemo(() => debounceLocationsFetch(500, 2, null, true), []);

  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      const { data } = await requisitionApi.createRequisition({
        type,
        originId: currentLocation?.id,
        destinationId: destination?.id || null,
        requestedById: requestedBy?.id || null,
        commodityClass: commodityClass?.value || null,
        dateRequested: dateRequested || null,
        description: description || null,
      });
      window.location = REQUISITION_URL.edit(data?.data?.id);
    } catch (error) {
      const message = error?.response?.data?.errors?.join('; ')
        || error?.response?.data?.errorMessage;
      if (message) {
        Alert.error(message);
      }
      setSaving(false);
    }
  };

  return (
    <div className="d-flex flex-column m-3">
      <div className="card">
        <div className="card-header">
          <Translate id="react.requisition.new.label" defaultMessage="New Requisition" />
        </div>
        <form className="card-body" onSubmit={submit}>
          <div className="form-group row">
            <span className="col-sm-3 col-form-label font-weight-bold">
              <Translate id="react.requisition.requisitionType.label" defaultMessage="Requisition type" />
            </span>
            <div className="col-sm-6 col-form-label">{type}</div>
          </div>
          <div className="form-group row">
            <span className="col-sm-3 col-form-label font-weight-bold">
              <Translate id="react.requisition.origin.label" defaultMessage="Origin" />
            </span>
            <div className="col-sm-6 col-form-label">{currentLocation?.name}</div>
          </div>
          <div className="form-group row">
            <label className="col-sm-3 col-form-label" htmlFor="requisition-destination-select">
              <Translate id="react.requisition.destination.label" defaultMessage="Destination" />
            </label>
            <div className="col-sm-6">
              <Select
                async
                loadOptions={debouncedLocationsFetch}
                value={destination}
                onChange={(value) => setDestination(value)}
                valueKey="id"
                labelKey="name"
                placeholder="Select destination"
                id="requisition-destination-select"
                dataTestId="requisition-destination-select"
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
                value={requestedBy}
                onChange={(value) => setRequestedBy(value)}
                valueKey="id"
                labelKey="name"
                placeholder="Search person..."
                id="requisition-requested-by-select"
                dataTestId="requisition-requested-by-select"
              />
            </div>
          </div>
          <div className="form-group row">
            <label className="col-sm-3 col-form-label" htmlFor="requisition-commodity-class-select">
              <Translate id="react.requisition.commodityClass.label" defaultMessage="Commodity class" />
            </label>
            <div className="col-sm-6">
              <Select
                options={COMMODITY_CLASSES}
                value={commodityClass}
                onChange={(value) => setCommodityClass(value)}
                id="requisition-commodity-class-select"
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
                value={dateRequested}
                onChange={(event) => setDateRequested(event.target.value)}
                data-testid="requisition-date-requested"
              />
            </div>
          </div>
          <div className="form-group row">
            <label className="col-sm-3 col-form-label" htmlFor="requisition-description">
              <Translate id="react.requisition.description.label" defaultMessage="Description" />
            </label>
            <div className="col-sm-6">
              <textarea
                id="requisition-description"
                className="form-control"
                rows="2"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                data-testid="requisition-description"
              />
            </div>
          </div>
          <div className="d-flex justify-content-center">
            <button type="submit" className="btn btn-primary mr-2" disabled={saving} data-testid="requisition-save-button">
              <Translate id="react.default.button.save.label" defaultMessage="Save" />
            </button>
            <a className="btn btn-outline-secondary" href={`${REQUISITION_TEMPLATE_URL.base}/list`}>
              <Translate id="react.default.button.cancel.label" defaultMessage="Cancel" />
            </a>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RequisitionCreate;
