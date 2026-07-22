import React, { useEffect, useState } from 'react';

import { useParams } from 'react-router-dom';
import Alert from 'react-s-alert';

import shipmentApi from 'api/services/ShipmentApi';
import { DASHBOARD_URL, SHIPMENT_SHOW_URL } from 'consts/applicationUrls';
import useTranslation from 'hooks/useTranslation';
import Translate from 'utils/Translate';

const ShipmentDelete = () => {
  const { shipmentId } = useParams();
  const [shipment, setShipment] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useTranslation('shipping', 'default');

  useEffect(() => {
    shipmentApi.getShipment(shipmentId)
      .then(({ data }) => {
        setShipment(data?.data);
      })
      .catch((err) => {
        const message = err?.response?.data?.errorMessage;
        if (message) {
          Alert.error(message);
        }
      });
  }, [shipmentId]);

  const submit = async (event) => {
    event.preventDefault();
    setDeleting(true);
    try {
      await shipmentApi.deleteShipment(shipmentId);
      window.location = DASHBOARD_URL.base;
    } catch (error) {
      const message = error?.response?.data?.errors?.join('; ')
        || error?.response?.data?.errorMessage;
      if (message) {
        Alert.error(message);
      }
      setDeleting(false);
    }
  };

  return (
    <div className="d-flex flex-column m-3">
      <div className="card">
        <div className="card-header">
          <Translate id="react.shipment.deleteShipment.label" defaultMessage="Delete Shipment" />
          {shipment?.shipmentNumber && ` · ${shipment.shipmentNumber}`}
          {shipment?.name && ` · ${shipment.name}`}
        </div>
        <form className="card-body" onSubmit={submit}>
          <div className="form-group row">
            <span className="col-sm-3 col-form-label">
              <Translate id="react.shipment.shipmentType.label" defaultMessage="Shipment type" />
            </span>
            <div className="col-sm-6 col-form-label" data-testid="shipment-type">
              {shipment?.shipmentType?.name}
            </div>
          </div>
          <div className="form-group row">
            <span className="col-sm-3 col-form-label">
              <Translate id="react.shipment.name.label" defaultMessage="Shipment name" />
            </span>
            <div className="col-sm-6 col-form-label" data-testid="shipment-name">
              {shipment?.name}
            </div>
          </div>
          <div className="form-group row">
            <div className="col-sm-9" data-testid="delete-confirm-message">
              <Translate
                id="react.shipment.confirm.deleteShipment.message"
                defaultMessage="Are you sure you want to delete this shipment?"
              />
            </div>
          </div>
          <div className="d-flex justify-content-center">
            <button type="submit" className="btn btn-danger mr-2" disabled={deleting} data-testid="delete-shipment-button">
              <Translate id="react.default.button.delete.label" defaultMessage="Delete" />
            </button>
            <a className="btn btn-outline-secondary" href={SHIPMENT_SHOW_URL.show(shipmentId)}>
              <Translate id="react.default.button.cancel.label" defaultMessage="Cancel" />
            </a>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ShipmentDelete;
