import React, { useEffect, useState } from 'react';

import { useLocation, useParams } from 'react-router-dom';
import Alert from 'react-s-alert';

import shipmentApi from 'api/services/ShipmentApi';
import { SHIPMENT_SHOW_URL } from 'consts/applicationUrls';
import useTranslation from 'hooks/useTranslation';
import Select from 'utils/Select';
import Translate from 'utils/Translate';

// Handles both the legacy addEvent (no eventId) and editEvent screens.
const ShipmentEditEvent = () => {
  const { shipmentId: shipmentIdParam, eventId } = useParams();
  const location = useLocation();
  const shipmentId = shipmentIdParam
    ?? new URLSearchParams(location.search).get('shipmentId');
  const [shipment, setShipment] = useState(null);
  const [eventTypes, setEventTypes] = useState([]);
  const [locations, setLocations] = useState([]);
  const [existingEventType, setExistingEventType] = useState(null);
  const [eventType, setEventType] = useState(null);
  const [eventDate, setEventDate] = useState('');
  const [eventLocation, setEventLocation] = useState(null);
  const [saving, setSaving] = useState(false);

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
    shipmentApi.getEventOptions()
      .then(({ data }) => {
        setEventTypes((data?.data?.eventTypes ?? [])
          .map((it) => ({ ...it, value: it.id, label: it.name })));
        setLocations((data?.data?.locations ?? [])
          .map((it) => ({ ...it, value: it.id, label: it.name })));
      })
      .catch((err) => {
        const message = err?.response?.data?.errorMessage;
        if (message) {
          Alert.error(message);
        }
      });
  }, [shipmentId]);

  useEffect(() => {
    if (!eventId) {
      return;
    }
    shipmentApi.getEvent(shipmentId, eventId)
      .then(({ data }) => {
        const event = data?.data;
        setExistingEventType(event?.eventType ?? null);
        setEventDate(event?.eventDate ? event.eventDate.replace(' ', 'T') : '');
        setEventLocation(event?.eventLocation
          ? {
            ...event.eventLocation,
            value: event.eventLocation.id,
            label: event.eventLocation.name,
          }
          : null);
      })
      .catch((err) => {
        const message = err?.response?.data?.errorMessage;
        if (message) {
          Alert.error(message);
        }
      });
  }, [shipmentId, eventId]);

  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    const payload = {
      eventTypeId: existingEventType ? existingEventType.id : eventType?.id ?? null,
      eventDate: eventDate ? eventDate.replace('T', ' ') : null,
      eventLocationId: eventLocation?.id ?? null,
    };
    try {
      if (eventId) {
        await shipmentApi.updateEvent(shipmentId, eventId, payload);
      } else {
        await shipmentApi.createEvent(shipmentId, payload);
      }
      window.location = SHIPMENT_SHOW_URL.show(shipmentId);
    } catch (error) {
      const message = error?.response?.data?.errors?.join('; ')
        || error?.response?.data?.errorMessage;
      if (message) {
        Alert.error(message);
      }
      setSaving(false);
    }
  };

  const deleteEvent = async () => {
    setSaving(true);
    try {
      await shipmentApi.deleteEvent(shipmentId, eventId);
      window.location = SHIPMENT_SHOW_URL.show(shipmentId);
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
          {eventId
            ? <Translate id="react.shipment.editEvent.label" defaultMessage="Edit Event" />
            : <Translate id="react.shipment.addEvent.label" defaultMessage="Add Event" />}
          {shipment?.shipmentNumber && ` · ${shipment.shipmentNumber}`}
          {shipment?.name && ` · ${shipment.name}`}
        </div>
        <form className="card-body" onSubmit={submit}>
          <div className="form-group row">
            <label className="col-sm-3 col-form-label" htmlFor="event-type-select">
              <Translate id="react.shipment.eventType.label" defaultMessage="Event type" />
            </label>
            <div className="col-sm-6">
              {existingEventType
                ? (
                  <input
                    type="text"
                    id="event-type-select"
                    className="form-control"
                    value={existingEventType.name}
                    disabled
                    data-testid="event-type-display"
                  />
                )
                : (
                  <Select
                    options={eventTypes}
                    value={eventType}
                    onChange={(value) => setEventType(value)}
                    id="event-type-select"
                  />
                )}
            </div>
          </div>
          <div className="form-group row">
            <label className="col-sm-3 col-form-label" htmlFor="event-date-input">
              <Translate id="react.shipment.eventDate.label" defaultMessage="Event date" />
            </label>
            <div className="col-sm-6">
              <input
                type="datetime-local"
                id="event-date-input"
                className="form-control"
                value={eventDate}
                onChange={(event) => setEventDate(event.target.value)}
                data-testid="event-date-input"
              />
            </div>
          </div>
          <div className="form-group row">
            <label className="col-sm-3 col-form-label" htmlFor="event-location-select">
              <Translate id="react.shipment.eventLocation.label" defaultMessage="Event location" />
            </label>
            <div className="col-sm-6">
              <Select
                options={locations}
                value={eventLocation}
                onChange={(value) => setEventLocation(value)}
                id="event-location-select"
              />
            </div>
          </div>
          <div className="d-flex justify-content-center">
            <button type="submit" className="btn btn-primary mr-2" disabled={saving} data-testid="event-save-button">
              <Translate id="react.default.button.save.label" defaultMessage="Save" />
            </button>
            {eventId && (
              <button type="button" className="btn btn-outline-danger mr-2" disabled={saving} onClick={deleteEvent} data-testid="event-delete-button">
                <Translate id="react.default.button.delete.label" defaultMessage="Delete" />
              </button>
            )}
            <a className="btn btn-outline-secondary" href={SHIPMENT_SHOW_URL.show(shipmentId)}>
              <Translate id="react.default.button.cancel.label" defaultMessage="Cancel" />
            </a>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ShipmentEditEvent;
