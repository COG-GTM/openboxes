import React, { useEffect, useState } from 'react';

import { getTranslate } from 'react-localize-redux';
import { useSelector } from 'react-redux';
import { useLocation } from 'react-router-dom';
import Alert from 'react-s-alert';

import shipmentApi from 'api/services/ShipmentApi';
import { SHIPMENT_SHOW_URL } from 'consts/applicationUrls';
import useTranslation from 'hooks/useTranslation';
import Translate, { translateWithDefaultMessage } from 'utils/Translate';

// React version of the legacy scaffolded shipmentItem/create GSP: add a
// shipment item (product, lot number, quantity, recipient) to a shipment.
const ShipmentItemCreate = () => {
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const [options, setOptions] = useState(null);
  const [error, setError] = useState(null);
  const [form, setForm] = useState({
    shipmentId: queryParams.get('shipment.id') || queryParams.get('shipmentId') || '',
    containerId: '',
    productId: '',
    lotNumber: '',
    quantity: '',
    recipientId: '',
  });
  const [saving, setSaving] = useState(false);
  const translate = useSelector(
    (state) => translateWithDefaultMessage(getTranslate(state.localize)),
  );

  useTranslation('shipment', 'default');

  useEffect(() => {
    shipmentApi.getItemCreateOptions()
      .then((response) => setOptions(response.data?.data))
      .catch((err) => {
        setError(err?.response?.data?.errorMessage
          || translate('react.default.errors.error.label', 'An error occurred'));
      });
  }, []);

  const save = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      await shipmentApi.createStandaloneItem({
        shipmentId: form.shipmentId,
        containerId: form.containerId || null,
        productId: form.productId,
        lotNumber: form.lotNumber || null,
        quantity: Number(form.quantity),
        recipientId: form.recipientId || null,
      });
      window.location.assign(SHIPMENT_SHOW_URL.show(form.shipmentId));
    } catch (err) {
      const errorData = err?.response?.data;
      Alert.error(errorData?.errors?.join('<br/>') || errorData?.errorMessage
        || translate('react.default.errors.error.label', 'An error occurred'));
      setSaving(false);
    }
  };

  if (error) {
    return <div className="alert alert-danger m-3" role="alert">{error}</div>;
  }

  if (!options) {
    return null;
  }

  return (
    <div className="d-flex flex-column m-3" data-testid="shipment-item-create">
      <h4>
        <Translate id="react.shipmentItem.create.label" defaultMessage="Create shipment item" />
      </h4>
      <form onSubmit={save}>
        <div className="card mb-3">
          <div className="card-body">
            <div className="form-group row">
              <label className="col-sm-3 col-form-label" htmlFor="shipment-item-shipment">
                <Translate id="react.shipment.label" defaultMessage="Shipment" />
              </label>
              <div className="col-sm-6">
                <select
                  id="shipment-item-shipment"
                  className="form-control"
                  value={form.shipmentId}
                  onChange={(event) => setForm({ ...form, shipmentId: event.target.value })}
                  required
                  data-testid="shipment-item-shipment-select"
                >
                  <option value="">{translate('react.default.selectOne.label', 'Select one')}</option>
                  {(options.shipments ?? []).map((shipment) => (
                    <option key={shipment.id} value={shipment.id}>
                      {shipment.shipmentNumber}
                      {' - '}
                      {shipment.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="form-group row">
              <label className="col-sm-3 col-form-label" htmlFor="shipment-item-product">
                <Translate id="react.shipment.item.product.label" defaultMessage="Product" />
              </label>
              <div className="col-sm-6">
                <select
                  id="shipment-item-product"
                  className="form-control"
                  value={form.productId}
                  onChange={(event) => setForm({ ...form, productId: event.target.value })}
                  required
                  data-testid="shipment-item-product-select"
                >
                  <option value="">{translate('react.default.selectOne.label', 'Select one')}</option>
                  {(options.products ?? []).map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.productCode}
                      {' '}
                      {product.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="form-group row">
              <label className="col-sm-3 col-form-label" htmlFor="shipment-item-lot-number">
                <Translate id="react.shipment.item.lotNumber.label" defaultMessage="Lot number" />
              </label>
              <div className="col-sm-6">
                <input
                  id="shipment-item-lot-number"
                  className="form-control"
                  value={form.lotNumber}
                  onChange={(event) => setForm({ ...form, lotNumber: event.target.value })}
                />
              </div>
            </div>
            <div className="form-group row">
              <label className="col-sm-3 col-form-label" htmlFor="shipment-item-quantity">
                <Translate id="react.shipment.item.quantity.label" defaultMessage="Quantity" />
              </label>
              <div className="col-sm-6">
                <input
                  id="shipment-item-quantity"
                  type="number"
                  min="1"
                  className="form-control"
                  value={form.quantity}
                  onChange={(event) => setForm({ ...form, quantity: event.target.value })}
                  required
                  data-testid="shipment-item-quantity-input"
                />
              </div>
            </div>
            <div className="form-group row">
              <label className="col-sm-3 col-form-label" htmlFor="shipment-item-recipient">
                <Translate id="react.shipment.recipient.label" defaultMessage="Recipient" />
              </label>
              <div className="col-sm-6">
                <select
                  id="shipment-item-recipient"
                  className="form-control"
                  value={form.recipientId}
                  onChange={(event) => setForm({ ...form, recipientId: event.target.value })}
                >
                  <option value="">{translate('react.default.selectOne.label', 'Select one')}</option>
                  {(options.recipients ?? []).map((person) => (
                    <option key={person.id} value={person.id}>{person.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>
        <div className="d-flex">
          <button type="submit" className="btn btn-primary mr-2" disabled={saving} data-testid="shipment-item-create-button">
            <Translate id="react.default.button.create.label" defaultMessage="Create" />
          </button>
          <button
            type="button"
            className="btn btn-outline-secondary"
            disabled={saving}
            onClick={() => window.history.back()}
          >
            <Translate id="react.default.button.cancel.label" defaultMessage="Cancel" />
          </button>
        </div>
      </form>
    </div>
  );
};

export default ShipmentItemCreate;
