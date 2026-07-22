import React, { useEffect, useState } from 'react';

import { getTranslate } from 'react-localize-redux';
import { useSelector } from 'react-redux';
import { useHistory, useParams } from 'react-router-dom';
import Alert from 'react-s-alert';

import shipmentApi from 'api/services/ShipmentApi';
import ShipmentWizardHeader from 'components/shipment/ShipmentWizardHeader';
import { CREATE_SHIPMENT_URL, SHIPMENT_SHOW_URL } from 'consts/applicationUrls';
import useTranslation from 'hooks/useTranslation';
import Translate, { translateWithDefaultMessage } from 'utils/Translate';

const defaultShippingDate = () => {
  const now = new Date();
  const pad = (value) => String(value).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
};

const CreateShipmentSending = () => {
  const { shipmentId } = useParams();
  const history = useHistory();
  const [data, setData] = useState(null);
  const [actualShippingDate, setActualShippingDate] = useState(defaultShippingDate());
  const [comments, setComments] = useState('');
  const [debitStockOnSend, setDebitStockOnSend] = useState(true);
  const [emailRecipients, setEmailRecipients] = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const translate = useSelector(
    (state) => translateWithDefaultMessage(getTranslate(state.localize)),
  );

  useTranslation('shipment', 'default');

  useEffect(() => {
    shipmentApi.getShipmentPicklist(shipmentId)
      .then((response) => setData(response.data?.data))
      .catch((err) => {
        setError(err?.response?.data?.errorMessage
          || translate('react.default.errors.error.label', 'An error occurred'));
      });
  }, [shipmentId]);

  const send = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      await shipmentApi.sendShipment(shipmentId, {
        actualShippingDate: actualShippingDate ? actualShippingDate.replace('T', ' ') : null,
        comments: comments || null,
        debitStockOnSend,
        emailRecipientIds: Object.keys(emailRecipients).filter((id) => emailRecipients[id]),
      });
      window.location.assign(SHIPMENT_SHOW_URL.show(shipmentId));
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

  if (!data) {
    return null;
  }

  const recipients = [
    ...(data.carrier ? [data.carrier] : []),
    ...(data.recipient ? [data.recipient] : []),
    ...(data.itemRecipients ?? []),
  ].filter((person, index, all) => all.findIndex((other) => other.id === person.id) === index);

  return (
    <div className="d-flex flex-column m-3" data-testid="create-shipment-sending">
      <ShipmentWizardHeader shipment={data} currentStep="sending" />
      {data.hasShipped ? (
        <div className="alert alert-info" role="alert" data-testid="shipment-sending-shipped-notice">
          <Translate
            id="react.shipment.wizard.alreadyShipped.label"
            defaultMessage="This shipment has already been shipped."
          />
        </div>
      ) : (
        <form onSubmit={send}>
          <div className="card mb-3">
            <div className="card-header">
              <Translate id="react.shipment.wizard.sendShipment.label" defaultMessage="Send shipment" />
            </div>
            <div className="card-body">
              <div className="alert alert-warning" role="alert">
                <Translate
                  id="react.shipment.wizard.sendShipment.message"
                  defaultMessage="Once sent, the shipment will be marked as shipped and stock will be debited from the origin. This cannot be undone."
                />
              </div>
              <div className="form-group row">
                <span className="col-sm-3 col-form-label">
                  <Translate id="react.shipment.origin.label" defaultMessage="Origin" />
                </span>
                <div className="col-sm-6 col-form-label" data-testid="shipment-sending-origin">
                  {data.origin?.name}
                </div>
              </div>
              <div className="form-group row">
                <span className="col-sm-3 col-form-label">
                  <Translate id="react.shipment.destination.label" defaultMessage="Destination" />
                </span>
                <div className="col-sm-6 col-form-label" data-testid="shipment-sending-destination">
                  {data.destination?.name}
                </div>
              </div>
              <div className="form-group row">
                <span className="col-sm-3 col-form-label">
                  <Translate id="react.shipment.expectedShippingDate.label" defaultMessage="Expected shipping date" />
                </span>
                <div className="col-sm-6 col-form-label">
                  {data.expectedShippingDate}
                </div>
              </div>
              <div className="form-group row">
                <label className="col-sm-3 col-form-label" htmlFor="shipment-actual-shipping-date-input">
                  <Translate id="react.shipment.actualShippingDate.label" defaultMessage="Actual shipping date" />
                </label>
                <div className="col-sm-6">
                  <input
                    id="shipment-actual-shipping-date-input"
                    type="datetime-local"
                    className="form-control"
                    value={actualShippingDate}
                    onChange={(event) => setActualShippingDate(event.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="form-group row">
                <label className="col-sm-3 col-form-label" htmlFor="shipment-sending-comments-input">
                  <Translate id="react.shipment.comments.label" defaultMessage="Comments" />
                </label>
                <div className="col-sm-6">
                  <textarea
                    id="shipment-sending-comments-input"
                    className="form-control"
                    rows="3"
                    value={comments}
                    onChange={(event) => setComments(event.target.value)}
                  />
                </div>
              </div>
              <div className="form-group row">
                <span className="col-sm-3 col-form-label" />
                <div className="col-sm-6 col-form-label">
                  <div className="form-check">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id="shipment-debit-stock-checkbox"
                      checked={debitStockOnSend}
                      onChange={(event) => setDebitStockOnSend(event.target.checked)}
                    />
                    <label className="form-check-label" htmlFor="shipment-debit-stock-checkbox">
                      <Translate
                        id="react.shipment.wizard.debitStockOnSend.label"
                        defaultMessage="Debit stock upon sending shipment"
                      />
                    </label>
                  </div>
                </div>
              </div>
              {recipients.length > 0 && (
                <div className="form-group row">
                  <span className="col-sm-3 col-form-label">
                    <Translate id="react.shipment.wizard.emailRecipients.label" defaultMessage="Send notification email to" />
                  </span>
                  <div className="col-sm-6 col-form-label" data-testid="shipment-sending-recipients">
                    {recipients.map((person) => (
                      <div className="form-check" key={person.id}>
                        <input
                          className="form-check-input"
                          type="checkbox"
                          id={`shipment-email-recipient-${person.id}`}
                          checked={!!emailRecipients[person.id]}
                          onChange={(event) => setEmailRecipients({
                            ...emailRecipients,
                            [person.id]: event.target.checked,
                          })}
                        />
                        <label className="form-check-label" htmlFor={`shipment-email-recipient-${person.id}`}>
                          {person.name}
                          {person.email ? ` (${person.email})` : ''}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="card mb-3">
            <div className="card-header">
              <Translate id="react.shipment.wizard.packingList.label" defaultMessage="Packing list" />
            </div>
            <div className="card-body">
              <table className="table table-sm table-bordered mb-0" data-testid="shipment-sending-items">
                <thead>
                  <tr>
                    <th>{translate('react.shipment.container.label', 'Container')}</th>
                    <th>{translate('react.shipment.item.product.label', 'Product')}</th>
                    <th>{translate('react.shipment.item.lotNumber.label', 'Lot')}</th>
                    <th>{translate('react.shipment.item.expirationDate.label', 'Expires')}</th>
                    <th className="text-right">{translate('react.shipment.item.quantity.label', 'Quantity')}</th>
                    <th>{translate('react.shipment.item.uom.label', 'UOM')}</th>
                  </tr>
                </thead>
                <tbody>
                  {!(data.shipmentItems ?? []).length && (
                    <tr>
                      <td colSpan="6" className="text-center text-muted">
                        {translate('react.default.none.label', 'None')}
                      </td>
                    </tr>
                  )}
                  {(data.shipmentItems ?? []).map((item) => (
                    <tr key={item.id}>
                      <td>{item.container?.name}</td>
                      <td>
                        {item.product?.productCode}
                        {' '}
                        {item.product?.name}
                      </td>
                      <td>{item.inventoryItem?.lotNumber}</td>
                      <td>{item.inventoryItem?.expirationDate}</td>
                      <td className="text-right">{item.quantity}</td>
                      <td>{item.product?.unitOfMeasure || 'EA'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div className="d-flex">
            <button
              type="button"
              className="btn btn-outline-secondary mr-2"
              disabled={saving}
              onClick={() => history.push(CREATE_SHIPMENT_URL.picking(shipmentId))}
            >
              <Translate id="react.default.button.back.label" defaultMessage="Back" />
            </button>
            <button type="submit" className="btn btn-primary mr-2" disabled={saving} data-testid="shipment-sending-send-button">
              <Translate id="react.shipment.wizard.sendShipmentButton.label" defaultMessage="Send shipment" />
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
      )}
    </div>
  );
};

export default CreateShipmentSending;
