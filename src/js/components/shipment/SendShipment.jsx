import React, { useEffect, useState } from 'react';

import { getTranslate } from 'react-localize-redux';
import { useSelector } from 'react-redux';
import { useParams } from 'react-router-dom';
import Alert from 'react-s-alert';

import shipmentApi from 'api/services/ShipmentApi';
import ShipmentSummaryHeader from 'components/shipment/ShipmentSummaryHeader';
import { SHIPMENT_SHOW_URL } from 'consts/applicationUrls';
import useTranslation from 'hooks/useTranslation';
import Translate, { translateWithDefaultMessage } from 'utils/Translate';

const defaultShippingDate = () => {
  const now = new Date();
  const pad = (value) => String(value).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
};

// appends the browser's UTC offset (e.g. "+02:00") so the server can
// validate the shipping date against "now" timezone-aware, like the legacy
// sendShipment form did
const withTimezoneOffset = (value) => {
  const offsetMinutes = -new Date(value).getTimezoneOffset();
  const sign = offsetMinutes >= 0 ? '+' : '-';
  const pad = (num) => String(Math.abs(num)).padStart(2, '0');
  const hours = pad(Math.trunc(offsetMinutes / 60));
  const minutes = pad(offsetMinutes % 60);
  return `${value.replace('T', ' ')} ${sign}${hours}:${minutes}`;
};

// React version of the legacy shipment/sendShipment GSP (standalone screen
// reached from showDetails, distinct from the create-shipment wizard step).
const SendShipment = () => {
  const { shipmentId } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [actualShippingDate, setActualShippingDate] = useState(defaultShippingDate());
  const [comments, setComments] = useState('');
  const [emailRecipients, setEmailRecipients] = useState({});
  const [saving, setSaving] = useState(false);
  const translate = useSelector(
    (state) => translateWithDefaultMessage(getTranslate(state.localize)),
  );

  useTranslation('shipment', 'default');

  useEffect(() => {
    shipmentApi.getShowDetails(shipmentId)
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
        actualShippingDate: actualShippingDate ? withTimezoneOffset(actualShippingDate) : null,
        comments: comments || null,
        debitStockOnSend: true,
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
  ].filter((person, index, all) => all.findIndex((other) => other.id === person.id) === index);

  return (
    <div className="d-flex flex-column m-3" data-testid="send-shipment">
      <ShipmentSummaryHeader shipment={data} />
      {data.hasShipped ? (
        <div className="alert alert-info" role="alert" data-testid="send-shipment-shipped-notice">
          <Translate
            id="react.shipment.alreadyShipped.label"
            defaultMessage="This shipment has already been shipped."
          />
        </div>
      ) : (
        <form onSubmit={send}>
          <div className="card mb-3">
            <div className="card-header">
              <Translate id="react.shipment.sendShipment.label" defaultMessage="Send shipment" />
            </div>
            <div className="card-body">
              <div className="form-group row">
                <span className="col-sm-3 col-form-label">
                  <Translate id="react.shipment.origin.label" defaultMessage="Origin" />
                </span>
                <div className="col-sm-6 col-form-label" data-testid="send-shipment-origin">
                  {data.origin?.name}
                </div>
              </div>
              <div className="form-group row">
                <span className="col-sm-3 col-form-label">
                  <Translate id="react.shipment.destination.label" defaultMessage="Destination" />
                </span>
                <div className="col-sm-6 col-form-label" data-testid="send-shipment-destination">
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
                <label className="col-sm-3 col-form-label" htmlFor="send-shipment-date-input">
                  <Translate id="react.shipment.actualShippingDate.label" defaultMessage="Actual shipping date" />
                </label>
                <div className="col-sm-6">
                  <input
                    id="send-shipment-date-input"
                    type="datetime-local"
                    className="form-control"
                    value={actualShippingDate}
                    onChange={(event) => setActualShippingDate(event.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="form-group row">
                <label className="col-sm-3 col-form-label" htmlFor="send-shipment-comments-input">
                  <Translate id="react.shipment.comments.label" defaultMessage="Comments" />
                </label>
                <div className="col-sm-6">
                  <textarea
                    id="send-shipment-comments-input"
                    className="form-control"
                    rows="3"
                    value={comments}
                    onChange={(event) => setComments(event.target.value)}
                  />
                </div>
              </div>
              {recipients.length > 0 && (
                <div className="form-group row">
                  <span className="col-sm-3 col-form-label">
                    <Translate id="react.shipment.emailRecipients.label" defaultMessage="Send notification email to" />
                  </span>
                  <div className="col-sm-6 col-form-label" data-testid="send-shipment-recipients">
                    {recipients.map((person) => (
                      <div className="form-check" key={person.id}>
                        <input
                          className="form-check-input"
                          type="checkbox"
                          id={`send-shipment-recipient-${person.id}`}
                          checked={!!emailRecipients[person.id]}
                          onChange={(event) => setEmailRecipients({
                            ...emailRecipients,
                            [person.id]: event.target.checked,
                          })}
                        />
                        <label className="form-check-label" htmlFor={`send-shipment-recipient-${person.id}`}>
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
              <Translate id="react.shipment.packingList.label" defaultMessage="Packing list" />
            </div>
            <div className="card-body">
              <table className="table table-sm table-bordered mb-0" data-testid="send-shipment-items">
                <thead>
                  <tr>
                    <th>{translate('react.shipment.container.label', 'Container')}</th>
                    <th>{translate('react.shipment.item.product.label', 'Product')}</th>
                    <th>{translate('react.shipment.item.lotNumber.label', 'Lot')}</th>
                    <th>{translate('react.shipment.item.expirationDate.label', 'Expires')}</th>
                    <th className="text-right">{translate('react.shipment.item.quantity.label', 'Quantity')}</th>
                  </tr>
                </thead>
                <tbody>
                  {!(data.shipmentItems ?? []).length && (
                    <tr>
                      <td colSpan="5" className="text-center text-muted">
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
                      <td>{item.inventoryItem?.lotNumber ?? item.lotNumber}</td>
                      <td>{item.inventoryItem?.expirationDate ?? item.expirationDate}</td>
                      <td className="text-right">{item.quantity}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div className="d-flex">
            <button type="submit" className="btn btn-primary mr-2" disabled={saving} data-testid="send-shipment-send-button">
              <Translate id="react.shipment.sendShipmentButton.label" defaultMessage="Send shipment" />
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

export default SendShipment;
