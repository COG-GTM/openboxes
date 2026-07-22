import React, { useEffect, useState } from 'react';

import { getTranslate } from 'react-localize-redux';
import { useSelector } from 'react-redux';
import { useHistory, useLocation, useParams } from 'react-router-dom';
import Alert from 'react-s-alert';

import shipmentApi from 'api/services/ShipmentApi';
import ShipmentWizardHeader from 'components/shipment/ShipmentWizardHeader';
import { CREATE_SHIPMENT_URL, SHIPMENT_SHOW_URL } from 'consts/applicationUrls';
import useTranslation from 'hooks/useTranslation';
import Select from 'utils/Select';
import Translate, { translateWithDefaultMessage } from 'utils/Translate';

const isExcluded = (shipment, field) =>
  shipment?.workflow?.excludedFields?.some(
    (excluded) => excluded.toLowerCase() === field.toLowerCase(),
  );

const CreateShipmentDetails = () => {
  const { shipmentId } = useParams();
  const history = useHistory();
  const { search } = useLocation();
  const [shipment, setShipment] = useState(null);
  const [options, setOptions] = useState(null);
  const [name, setName] = useState('');
  const [shipmentType, setShipmentType] = useState(null);
  const [origin, setOrigin] = useState(null);
  const [destination, setDestination] = useState(null);
  const [expectedShippingDate, setExpectedShippingDate] = useState('');
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const currentLocation = useSelector((state) => state.session.currentLocation);
  const translate = useSelector(
    (state) => translateWithDefaultMessage(getTranslate(state.localize)),
  );

  useTranslation('shipment', 'default');

  useEffect(() => {
    shipmentApi.getWizardOptions()
      .then((response) => setOptions(response.data?.data))
      .catch(() => setOptions({}));
  }, []);

  useEffect(() => {
    if (shipmentId) {
      return;
    }
    const type = new URLSearchParams(search).get('type');
    // mirror the legacy default: outbound starts at the current warehouse,
    // inbound is destined for the current warehouse
    if (type === 'OUTGOING' && currentLocation?.id) {
      setOrigin((prev) => prev ?? { id: currentLocation.id, name: currentLocation.name });
    }
    if (type === 'INCOMING' && currentLocation?.id) {
      setDestination((prev) => prev ?? { id: currentLocation.id, name: currentLocation.name });
    }
  }, [shipmentId, currentLocation?.id, search]);

  useEffect(() => {
    if (!shipmentId) {
      return;
    }
    shipmentApi.getShipment(shipmentId)
      .then((response) => {
        const data = response.data?.data;
        setShipment(data);
        setName(data?.name ?? '');
        setShipmentType(data?.shipmentType ?? null);
        setOrigin(data?.origin ?? null);
        setDestination(data?.destination ?? null);
        setExpectedShippingDate(data?.expectedShippingDate ?? '');
        setExpectedDeliveryDate(data?.expectedDeliveryDate ?? '');
      })
      .catch((err) => {
        setError(err?.response?.data?.errorMessage
          || translate('react.default.errors.error.label', 'An error occurred'));
      });
  }, [shipmentId]);

  const save = async (nextStep) => {
    setSaving(true);
    try {
      const payload = {
        name,
        shipmentTypeId: shipmentType?.id || null,
        originId: origin?.id || null,
        destinationId: destination?.id || null,
        expectedShippingDate: expectedShippingDate || null,
        expectedDeliveryDate: expectedDeliveryDate || null,
      };
      const response = shipmentId
        ? await shipmentApi.saveShipmentDetails(shipmentId, payload)
        : await shipmentApi.createShipment(payload);
      const savedId = response.data?.data?.id;
      if (nextStep === 'tracking') {
        history.push(CREATE_SHIPMENT_URL.tracking(savedId));
      } else {
        window.location.assign(SHIPMENT_SHOW_URL.show(savedId));
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

  if (shipmentId && !shipment) {
    return null;
  }

  return (
    <div className="d-flex flex-column m-3" data-testid="create-shipment-details">
      <ShipmentWizardHeader shipment={shipment} currentStep="details" />
      <div className="card">
        <div className="card-header">
          <Translate id="react.shipment.wizard.enterShipmentDetails.label" defaultMessage="Enter shipment details" />
        </div>
        <form
          className="card-body"
          onSubmit={(event) => {
            event.preventDefault();
            save('tracking');
          }}
        >
          <div className="form-group row">
            <label className="col-sm-3 col-form-label" htmlFor="shipment-name-input">
              <Translate id="react.shipment.shipmentName.label" defaultMessage="Shipment name" />
            </label>
            <div className="col-sm-6">
              <input
                id="shipment-name-input"
                type="text"
                className="form-control"
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </div>
          </div>
          {!isExcluded(shipment, 'shipmentType') && (
            <div className="form-group row">
              <label className="col-sm-3 col-form-label" htmlFor="shipment-type-select">
                <Translate id="react.shipment.shipmentType.label" defaultMessage="Shipment type" />
              </label>
              <div className="col-sm-6">
                <Select
                  id="shipment-type-select"
                  options={options?.shipmentTypes ?? []}
                  value={shipmentType}
                  onChange={(value) => setShipmentType(value)}
                  valueKey="id"
                  labelKey="name"
                />
              </div>
            </div>
          )}
          <div className="form-group row">
            <label className="col-sm-3 col-form-label" htmlFor="shipment-origin-select">
              <Translate id="react.shipment.origin.label" defaultMessage="Origin" />
            </label>
            <div className="col-sm-6">
              <Select
                id="shipment-origin-select"
                options={options?.origins ?? []}
                value={origin}
                onChange={(value) => setOrigin(value)}
                valueKey="id"
                labelKey="name"
              />
            </div>
          </div>
          <div className="form-group row">
            <label className="col-sm-3 col-form-label" htmlFor="shipment-destination-select">
              <Translate id="react.shipment.destination.label" defaultMessage="Destination" />
            </label>
            <div className="col-sm-6">
              <Select
                id="shipment-destination-select"
                options={options?.destinations ?? []}
                value={destination}
                onChange={(value) => setDestination(value)}
                valueKey="id"
                labelKey="name"
              />
            </div>
          </div>
          <div className="form-group row">
            <label className="col-sm-3 col-form-label" htmlFor="shipment-expected-shipping-date-input">
              <Translate id="react.shipment.expectedShippingDate.label" defaultMessage="Expected shipping date" />
            </label>
            <div className="col-sm-6">
              <input
                id="shipment-expected-shipping-date-input"
                type="date"
                className="form-control"
                value={expectedShippingDate}
                onChange={(event) => setExpectedShippingDate(event.target.value)}
              />
            </div>
          </div>
          {!isExcluded(shipment, 'expectedDeliveryDate') && (
            <div className="form-group row">
              <label className="col-sm-3 col-form-label" htmlFor="shipment-expected-delivery-date-input">
                <Translate id="react.shipment.expectedDeliveryDate.label" defaultMessage="Expected delivery date" />
              </label>
              <div className="col-sm-6">
                <input
                  id="shipment-expected-delivery-date-input"
                  type="date"
                  className="form-control"
                  value={expectedDeliveryDate}
                  onChange={(event) => setExpectedDeliveryDate(event.target.value)}
                />
              </div>
            </div>
          )}
          <div className="d-flex">
            <button type="submit" className="btn btn-primary mr-2" disabled={saving} data-testid="shipment-details-next-button">
              <Translate id="react.default.button.next.label" defaultMessage="Next" />
            </button>
            {shipmentId && (
              <button
                type="button"
                className="btn btn-outline-secondary mr-2"
                disabled={saving}
                onClick={() => save('exit')}
                data-testid="shipment-details-save-button"
              >
                <Translate id="react.shipment.wizard.saveAndExit.label" defaultMessage="Save and exit" />
              </button>
            )}
            <button
              type="button"
              className="btn btn-outline-secondary"
              disabled={saving}
              onClick={() => window.location.assign(shipmentId
                ? SHIPMENT_SHOW_URL.show(shipmentId) : SHIPMENT_SHOW_URL.list())}
            >
              <Translate id="react.default.button.cancel.label" defaultMessage="Cancel" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateShipmentDetails;
