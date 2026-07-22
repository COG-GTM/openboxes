import React, { useEffect, useMemo, useState } from 'react';

import { getTranslate } from 'react-localize-redux';
import { useSelector } from 'react-redux';
import { useHistory, useParams } from 'react-router-dom';
import Alert from 'react-s-alert';

import shipmentApi from 'api/services/ShipmentApi';
import ShipmentWizardHeader from 'components/shipment/ShipmentWizardHeader';
import { CREATE_SHIPMENT_URL, SHIPMENT_SHOW_URL } from 'consts/applicationUrls';
import useTranslation from 'hooks/useTranslation';
import { debouncePeopleFetch } from 'utils/option-utils';
import Select from 'utils/Select';
import Translate, { translateWithDefaultMessage } from 'utils/Translate';

const isExcluded = (shipment, field) =>
  shipment?.workflow?.excludedFields?.some(
    (excluded) => excluded.toLowerCase() === field.toLowerCase(),
  );

const CreateShipmentTracking = () => {
  const { shipmentId } = useParams();
  const history = useHistory();
  const [shipment, setShipment] = useState(null);
  const [options, setOptions] = useState(null);
  const [carrier, setCarrier] = useState(null);
  const [shipper, setShipper] = useState(null);
  const [trackingNumber, setTrackingNumber] = useState('');
  const [recipient, setRecipient] = useState(null);
  const [referenceNumbers, setReferenceNumbers] = useState({});
  const [statedValue, setStatedValue] = useState('');
  const [totalValue, setTotalValue] = useState('');
  const [additionalInformation, setAdditionalInformation] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const translate = useSelector(
    (state) => translateWithDefaultMessage(getTranslate(state.localize)),
  );

  useTranslation('shipment', 'default');

  const debouncedPeopleFetch = useMemo(() => debouncePeopleFetch(500, 2), []);

  useEffect(() => {
    shipmentApi.getWizardOptions()
      .then((response) => setOptions(response.data?.data))
      .catch(() => setOptions({}));
  }, []);

  useEffect(() => {
    shipmentApi.getShipment(shipmentId)
      .then((response) => {
        const data = response.data?.data;
        setShipment(data);
        setCarrier(data?.carrier ?? null);
        setShipper(data?.shipper ?? null);
        setTrackingNumber(data?.trackingNumber ?? '');
        setRecipient(data?.recipient ?? null);
        setStatedValue(data?.statedValue ?? '');
        setTotalValue(data?.totalValue ?? '');
        setAdditionalInformation(data?.additionalInformation ?? '');
        setReferenceNumbers((data?.referenceNumbers ?? []).reduce((acc, referenceNumber) => ({
          ...acc,
          [referenceNumber.referenceNumberType?.id]: referenceNumber.identifier,
        }), {}));
      })
      .catch((err) => {
        setError(err?.response?.data?.errorMessage
          || translate('react.default.errors.error.label', 'An error occurred'));
      });
  }, [shipmentId]);

  const save = async (nextStep) => {
    setSaving(true);
    try {
      await shipmentApi.saveShipmentTracking(shipmentId, {
        carrierId: carrier?.id || null,
        shipperId: shipper?.id || null,
        trackingNumber: trackingNumber || null,
        recipientId: recipient?.id || null,
        referenceNumbers,
        statedValue: statedValue === '' ? null : statedValue,
        totalValue: totalValue === '' ? null : totalValue,
        additionalInformation: additionalInformation || null,
      });
      if (nextStep === 'packing') {
        history.push(CREATE_SHIPMENT_URL.packing(shipmentId));
      } else {
        window.location.assign(SHIPMENT_SHOW_URL.show(shipmentId));
      }
    } catch (err) {
      const data = err?.response?.data;
      Alert.error(data?.errors?.join('<br/>') || data?.errorMessage
        || translate('react.default.errors.error.label', 'An error occurred'));
      setSaving(false);
    }
  };

  if (error) {
    return <div className="alert alert-danger m-3" role="alert">{error}</div>;
  }

  if (!shipment) {
    return null;
  }

  return (
    <div className="d-flex flex-column m-3" data-testid="create-shipment-tracking">
      <ShipmentWizardHeader shipment={shipment} currentStep="tracking" />
      <div className="card">
        <div className="card-header">
          <Translate id="react.shipment.wizard.enterTrackingDetails.label" defaultMessage="Enter tracking details" />
        </div>
        <form
          className="card-body"
          onSubmit={(event) => {
            event.preventDefault();
            save('packing');
          }}
        >
          {!isExcluded(shipment, 'carrier') && (
            <div className="form-group row">
              <label className="col-sm-3 col-form-label" htmlFor="shipment-carrier-select">
                <Translate id="react.shipment.carrier.label" defaultMessage="Traveler / Carrier" />
              </label>
              <div className="col-sm-6">
                <Select
                  async
                  id="shipment-carrier-select"
                  loadOptions={debouncedPeopleFetch}
                  value={carrier}
                  onChange={(value) => setCarrier(value)}
                  valueKey="id"
                  labelKey="name"
                  placeholder="Search person..."
                />
              </div>
            </div>
          )}
          {!isExcluded(shipment, 'shipmentMethod.shipper') && (
            <div className="form-group row">
              <label className="col-sm-3 col-form-label" htmlFor="shipment-shipper-select">
                <Translate id="react.shipment.shipper.label" defaultMessage="Shipper" />
              </label>
              <div className="col-sm-3">
                <Select
                  id="shipment-shipper-select"
                  options={options?.shippers ?? []}
                  value={shipper}
                  onChange={(value) => setShipper(value)}
                  valueKey="id"
                  labelKey="name"
                />
              </div>
              <label className="col-sm-2 col-form-label" htmlFor="shipment-tracking-number-input">
                <Translate id="react.shipment.trackingNumber.label" defaultMessage="Tracking number" />
              </label>
              <div className="col-sm-3">
                <input
                  id="shipment-tracking-number-input"
                  type="text"
                  className="form-control"
                  value={trackingNumber}
                  onChange={(event) => setTrackingNumber(event.target.value)}
                />
              </div>
            </div>
          )}
          {!isExcluded(shipment, 'recipient') && (
            <div className="form-group row">
              <label className="col-sm-3 col-form-label" htmlFor="shipment-recipient-select">
                <Translate id="react.shipment.recipient.label" defaultMessage="Recipient" />
              </label>
              <div className="col-sm-6">
                <Select
                  async
                  id="shipment-recipient-select"
                  loadOptions={debouncedPeopleFetch}
                  value={recipient}
                  onChange={(value) => setRecipient(value)}
                  valueKey="id"
                  labelKey="name"
                  placeholder="Search person..."
                />
              </div>
            </div>
          )}
          {shipment?.workflow?.referenceNumberTypes?.map((referenceNumberType) => (
            <div className="form-group row" key={referenceNumberType.id}>
              <label className="col-sm-3 col-form-label" htmlFor={`shipment-reference-number-${referenceNumberType.id}`}>
                {referenceNumberType.name}
              </label>
              <div className="col-sm-6">
                <input
                  id={`shipment-reference-number-${referenceNumberType.id}`}
                  type="text"
                  className="form-control"
                  value={referenceNumbers[referenceNumberType.id] ?? ''}
                  onChange={(event) => setReferenceNumbers({
                    ...referenceNumbers,
                    [referenceNumberType.id]: event.target.value,
                  })}
                />
              </div>
            </div>
          ))}
          {!isExcluded(shipment, 'statedValue') && (
            <div className="form-group row">
              <label className="col-sm-3 col-form-label" htmlFor="shipment-stated-value-input">
                <Translate id="react.shipment.statedValue.label" defaultMessage="Stated value" />
              </label>
              <div className="col-sm-3">
                <input
                  id="shipment-stated-value-input"
                  type="number"
                  step="any"
                  className="form-control"
                  value={statedValue}
                  onChange={(event) => setStatedValue(event.target.value)}
                />
              </div>
            </div>
          )}
          {!isExcluded(shipment, 'totalValue') && (
            <div className="form-group row">
              <label className="col-sm-3 col-form-label" htmlFor="shipment-total-value-input">
                <Translate id="react.shipment.totalValue.label" defaultMessage="Total value" />
              </label>
              <div className="col-sm-3">
                <input
                  id="shipment-total-value-input"
                  type="number"
                  step="any"
                  className="form-control"
                  value={totalValue}
                  onChange={(event) => setTotalValue(event.target.value)}
                />
              </div>
            </div>
          )}
          {!isExcluded(shipment, 'additionalInformation') && (
            <div className="form-group row">
              <label className="col-sm-3 col-form-label" htmlFor="shipment-additional-information-input">
                <Translate id="react.shipment.additionalInformation.label" defaultMessage="Additional information" />
              </label>
              <div className="col-sm-6">
                <textarea
                  id="shipment-additional-information-input"
                  className="form-control"
                  rows="3"
                  value={additionalInformation}
                  onChange={(event) => setAdditionalInformation(event.target.value)}
                />
              </div>
            </div>
          )}
          <div className="d-flex">
            <button
              type="button"
              className="btn btn-outline-secondary mr-2"
              disabled={saving}
              onClick={() => history.push(CREATE_SHIPMENT_URL.details(shipmentId))}
            >
              <Translate id="react.default.button.back.label" defaultMessage="Back" />
            </button>
            <button type="submit" className="btn btn-primary mr-2" disabled={saving} data-testid="shipment-tracking-next-button">
              <Translate id="react.default.button.next.label" defaultMessage="Next" />
            </button>
            <button
              type="button"
              className="btn btn-outline-secondary mr-2"
              disabled={saving}
              onClick={() => save('exit')}
              data-testid="shipment-tracking-save-button"
            >
              <Translate id="react.shipment.wizard.saveAndExit.label" defaultMessage="Save and exit" />
            </button>
            <button
              type="button"
              className="btn btn-outline-secondary"
              disabled={saving}
              onClick={() => window.location.assign(SHIPMENT_SHOW_URL.show(shipmentId))}
            >
              <Translate id="react.default.button.cancel.label" defaultMessage="Cancel" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateShipmentTracking;
