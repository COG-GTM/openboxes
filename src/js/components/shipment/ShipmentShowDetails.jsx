import React, { useCallback, useEffect, useState } from 'react';

import { getTranslate } from 'react-localize-redux';
import { useSelector } from 'react-redux';
import { useParams } from 'react-router-dom';
import Alert from 'react-s-alert';

import shipmentApi from 'api/services/ShipmentApi';
import ShipmentSummaryHeader from 'components/shipment/ShipmentSummaryHeader';
import { CONTEXT_PATH, CREATE_SHIPMENT_URL, SHIPMENT_SHOW_URL } from 'consts/applicationUrls';
import useTranslation from 'hooks/useTranslation';
import Translate, { translateWithDefaultMessage } from 'utils/Translate';

// React version of the legacy shipment/showDetails GSP: shipment overview
// plus contents / receipt / documents / comments / events / transactions /
// tracking tabs.
const ShipmentShowDetails = () => {
  const { shipmentId } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('contents');
  const [newComment, setNewComment] = useState('');
  const [newEvent, setNewEvent] = useState({ eventTypeId: '', eventLocationId: '', eventDate: '' });
  const [saving, setSaving] = useState(false);
  const translate = useSelector(
    (state) => translateWithDefaultMessage(getTranslate(state.localize)),
  );

  useTranslation('shipment', 'default');

  const fetchDetails = useCallback(() => {
    shipmentApi.getShowDetails(shipmentId)
      .then((response) => setData(response.data?.data))
      .catch((err) => {
        setError(err?.response?.data?.errorMessage
          || translate('react.default.errors.error.label', 'An error occurred'));
      });
  }, [shipmentId]);

  useEffect(() => {
    fetchDetails();
  }, [fetchDetails]);

  const saveComment = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      await shipmentApi.addComment(shipmentId, { comment: newComment });
      setNewComment('');
      fetchDetails();
    } catch (err) {
      Alert.error(err?.response?.data?.errorMessage
        || translate('react.default.errors.error.label', 'An error occurred'));
    } finally {
      setSaving(false);
    }
  };

  const saveEvent = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      await shipmentApi.addEvent(shipmentId, {
        eventTypeId: newEvent.eventTypeId,
        eventLocationId: newEvent.eventLocationId || null,
        eventDate: newEvent.eventDate ? newEvent.eventDate.replace('T', ' ') : null,
      });
      setNewEvent({ eventTypeId: '', eventLocationId: '', eventDate: '' });
      fetchDetails();
    } catch (err) {
      Alert.error(err?.response?.data?.errorMessage
        || translate('react.default.errors.error.label', 'An error occurred'));
    } finally {
      setSaving(false);
    }
  };

  if (error) {
    return <div className="alert alert-danger m-3" role="alert">{error}</div>;
  }

  if (!data) {
    return null;
  }

  const tabs = [
    ['contents', translate('react.shipment.contents.label', 'Contents')],
    ['receipt', translate('react.shipment.receipt.label', 'Receipt')],
    ['documents', translate('react.shipment.documents.label', 'Documents')],
    ['comments', translate('react.shipment.comments.label', 'Comments')],
    ['events', translate('react.shipment.events.label', 'Events')],
    ['transactions', translate('react.shipment.transactions.label', 'Transactions')],
    ['tracking', translate('react.shipment.tracking.label', 'Tracking')],
  ];

  return (
    <div className="d-flex flex-column m-3" data-testid="shipment-show-details">
      <ShipmentSummaryHeader shipment={data} />
      <div className="d-flex mb-3" data-testid="shipment-show-actions">
        {!data.hasShipped && (
          <a className="btn btn-outline-secondary btn-sm mr-2" href={CREATE_SHIPMENT_URL.details(data.id)}>
            <Translate id="react.shipment.editShipment.label" defaultMessage="Edit shipment" />
          </a>
        )}
        {data.isReceiveAllowed && (
          <a className="btn btn-outline-secondary btn-sm mr-2" href={SHIPMENT_SHOW_URL.receive(data.id)} data-testid="shipment-show-receive-link">
            <Translate id="react.shipment.receiveShipment.label" defaultMessage="Receive shipment" />
          </a>
        )}
        {data.isSendAllowed && (
          <a className="btn btn-outline-secondary btn-sm mr-2" href={SHIPMENT_SHOW_URL.send(data.id)} data-testid="shipment-show-send-link">
            <Translate id="react.shipment.sendShipment.label" defaultMessage="Send shipment" />
          </a>
        )}
        <a className="btn btn-outline-secondary btn-sm mr-2" href={SHIPMENT_SHOW_URL.packingList(data.id)} data-testid="shipment-show-packing-list-link">
          <Translate id="react.shipment.showPackingList.label" defaultMessage="Show packing list" />
        </a>
        <a className="btn btn-outline-secondary btn-sm" target="_blank" rel="noopener noreferrer" href={`${CONTEXT_PATH}/report/printShippingReport?shipment.id=${data.id}`}>
          <Translate id="react.shipment.printPackingList.label" defaultMessage="Print packing list" />
        </a>
      </div>
      <div className="card mb-3">
        <div className="card-header">
          <Translate id="react.shipment.details.label" defaultMessage="Details" />
        </div>
        <div className="card-body">
          <div className="row">
            <div className="col-md-6">
              <table className="table table-sm mb-0" data-testid="shipment-show-details-table">
                <tbody>
                  <tr>
                    <td className="text-muted"><Translate id="react.shipment.shipmentNumber.label" defaultMessage="Shipment number" /></td>
                    <td data-testid="shipment-show-shipment-number">{data.shipmentNumber}</td>
                  </tr>
                  <tr>
                    <td className="text-muted"><Translate id="react.shipment.shipmentType.label" defaultMessage="Shipment type" /></td>
                    <td>{data.shipmentType?.name}</td>
                  </tr>
                  <tr>
                    <td className="text-muted"><Translate id="react.shipment.origin.label" defaultMessage="Origin" /></td>
                    <td data-testid="shipment-show-origin">{data.origin?.name}</td>
                  </tr>
                  <tr>
                    <td className="text-muted"><Translate id="react.shipment.destination.label" defaultMessage="Destination" /></td>
                    <td data-testid="shipment-show-destination">{data.destination?.name}</td>
                  </tr>
                  <tr>
                    <td className="text-muted"><Translate id="react.shipment.expectedShippingDate.label" defaultMessage="Expected shipping date" /></td>
                    <td>{data.expectedShippingDate}</td>
                  </tr>
                  <tr>
                    <td className="text-muted"><Translate id="react.shipment.actualShippingDate.label" defaultMessage="Actual shipping date" /></td>
                    <td>{data.actualShippingDate}</td>
                  </tr>
                  <tr>
                    <td className="text-muted"><Translate id="react.shipment.expectedDeliveryDate.label" defaultMessage="Expected delivery date" /></td>
                    <td>{data.expectedDeliveryDate}</td>
                  </tr>
                  <tr>
                    <td className="text-muted"><Translate id="react.shipment.actualDeliveryDate.label" defaultMessage="Actual delivery date" /></td>
                    <td>{data.actualDeliveryDate}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="col-md-6">
              <table className="table table-sm mb-0">
                <tbody>
                  <tr>
                    <td className="text-muted"><Translate id="react.shipment.carrier.label" defaultMessage="Carrier" /></td>
                    <td>{data.carrier?.name}</td>
                  </tr>
                  <tr>
                    <td className="text-muted"><Translate id="react.shipment.recipient.label" defaultMessage="Recipient" /></td>
                    <td>{data.recipient?.name}</td>
                  </tr>
                  <tr>
                    <td className="text-muted"><Translate id="react.shipment.shipper.label" defaultMessage="Shipper" /></td>
                    <td>{data.shipper?.name}</td>
                  </tr>
                  <tr>
                    <td className="text-muted"><Translate id="react.shipment.trackingNumber.label" defaultMessage="Tracking number" /></td>
                    <td>{data.trackingNumber}</td>
                  </tr>
                  <tr>
                    <td className="text-muted"><Translate id="react.shipment.totalValue.label" defaultMessage="Total value" /></td>
                    <td>{data.totalValue}</td>
                  </tr>
                  <tr>
                    <td className="text-muted"><Translate id="react.shipment.totalWeight.label" defaultMessage="Total weight (lbs)" /></td>
                    <td>{data.totalWeightInPounds}</td>
                  </tr>
                  {(data.referenceNumbers ?? []).map((referenceNumber) => (
                    <tr key={referenceNumber.id}>
                      <td className="text-muted">{referenceNumber.referenceNumberType?.name}</td>
                      <td>{referenceNumber.identifier}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
      <ul className="nav nav-tabs" data-testid="shipment-show-tabs">
        {tabs.map(([tab, label]) => (
          <li className="nav-item" key={tab}>
            <button
              type="button"
              className={`nav-link btn btn-link ${activeTab === tab ? 'active' : ''}`}
              onClick={() => setActiveTab(tab)}
              data-testid={`shipment-show-tab-${tab}`}
            >
              {label}
            </button>
          </li>
        ))}
      </ul>
      <div className="border border-top-0 p-3 bg-white">
        {activeTab === 'contents' && (
          <table className="table table-sm table-bordered mb-0" data-testid="shipment-show-contents">
            <thead>
              <tr>
                <th>{translate('react.shipment.container.label', 'Container')}</th>
                <th>{translate('react.shipment.item.product.label', 'Product')}</th>
                <th>{translate('react.shipment.item.lotNumber.label', 'Lot')}</th>
                <th>{translate('react.shipment.item.expirationDate.label', 'Expires')}</th>
                <th className="text-right">{translate('react.shipment.item.quantityShipped.label', 'Shipped')}</th>
                <th className="text-right">{translate('react.shipment.item.quantityReceived.label', 'Received')}</th>
                <th>{translate('react.shipment.recipient.label', 'Recipient')}</th>
              </tr>
            </thead>
            <tbody>
              {!(data.shipmentItems ?? []).length && (
                <tr>
                  <td colSpan="7" className="text-center text-muted">
                    {translate('react.default.none.label', 'None')}
                  </td>
                </tr>
              )}
              {(data.shipmentItems ?? []).map((item) => (
                <tr key={item.id} data-testid="shipment-show-contents-row">
                  <td>{item.container?.name}</td>
                  <td>
                    {item.product?.productCode}
                    {' '}
                    {item.product?.name}
                  </td>
                  <td>{item.inventoryItem?.lotNumber ?? item.lotNumber}</td>
                  <td>{item.inventoryItem?.expirationDate ?? item.expirationDate}</td>
                  <td className="text-right">{item.quantity}</td>
                  <td className="text-right">{item.quantityReceived}</td>
                  <td>{item.recipient?.name}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {activeTab === 'receipt' && (
          <div data-testid="shipment-show-receipt">
            {!data.receipt && (
              <div className="text-muted">
                {translate('react.shipment.receipt.empty.label', 'No receipt')}
              </div>
            )}
            {data.receipt && (
              <table className="table table-sm table-bordered mb-0">
                <thead>
                  <tr>
                    <th>{translate('react.shipment.item.product.label', 'Product')}</th>
                    <th>{translate('react.shipment.item.lotNumber.label', 'Lot')}</th>
                    <th className="text-right">{translate('react.shipment.item.quantityShipped.label', 'Shipped')}</th>
                    <th className="text-right">{translate('react.shipment.item.quantityReceived.label', 'Received')}</th>
                    <th>{translate('react.shipment.binLocation.label', 'Bin location')}</th>
                  </tr>
                </thead>
                <tbody>
                  {(data.receipt.receiptItems ?? []).map((receiptItem) => (
                    <tr key={receiptItem.id}>
                      <td>
                        {receiptItem.product?.productCode}
                        {' '}
                        {receiptItem.product?.name}
                      </td>
                      <td>{receiptItem.lotNumber}</td>
                      <td className="text-right">{receiptItem.quantityShipped}</td>
                      <td className="text-right">{receiptItem.quantityReceived}</td>
                      <td>{receiptItem.binLocation?.name}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
        {activeTab === 'documents' && (
          <table className="table table-sm table-bordered mb-0" data-testid="shipment-show-documents">
            <thead>
              <tr>
                <th>{translate('react.default.name.label', 'Name')}</th>
                <th>{translate('react.shipment.document.filename.label', 'Filename')}</th>
                <th>{translate('react.shipment.document.type.label', 'Type')}</th>
              </tr>
            </thead>
            <tbody>
              {!(data.documents ?? []).length && (
                <tr>
                  <td colSpan="3" className="text-center text-muted">
                    {translate('react.default.none.label', 'None')}
                  </td>
                </tr>
              )}
              {(data.documents ?? []).map((document) => (
                <tr key={document.id}>
                  <td>
                    <a href={`${CONTEXT_PATH}/document/download/${document.id}`}>{document.name || document.filename}</a>
                  </td>
                  <td>{document.filename}</td>
                  <td>{document.documentType}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {activeTab === 'comments' && (
          <div data-testid="shipment-show-comments">
            {!(data.comments ?? []).length && (
              <div className="text-muted mb-3">
                {translate('react.default.none.label', 'None')}
              </div>
            )}
            {(data.comments ?? []).map((comment) => (
              <div className="border-bottom pb-2 mb-2" key={comment.id}>
                <div>{comment.comment}</div>
                <small className="text-muted">
                  {comment.sender}
                  {' '}
                  {comment.dateCreated}
                </small>
              </div>
            ))}
            <form onSubmit={saveComment}>
              <div className="form-group">
                <label htmlFor="shipment-show-new-comment">
                  <Translate id="react.shipment.addComment.label" defaultMessage="Add comment" />
                </label>
                <textarea
                  id="shipment-show-new-comment"
                  className="form-control"
                  rows="2"
                  value={newComment}
                  onChange={(event) => setNewComment(event.target.value)}
                  required
                />
              </div>
              <button type="submit" className="btn btn-primary btn-sm" disabled={saving}>
                <Translate id="react.default.button.save.label" defaultMessage="Save" />
              </button>
            </form>
          </div>
        )}
        {activeTab === 'events' && (
          <div data-testid="shipment-show-events">
            <table className="table table-sm table-bordered">
              <thead>
                <tr>
                  <th>{translate('react.shipment.event.type.label', 'Event')}</th>
                  <th>{translate('react.default.date.label', 'Date')}</th>
                  <th>{translate('react.default.location.label', 'Location')}</th>
                </tr>
              </thead>
              <tbody>
                {!(data.events ?? []).length && (
                  <tr>
                    <td colSpan="3" className="text-center text-muted">
                      {translate('react.default.none.label', 'None')}
                    </td>
                  </tr>
                )}
                {(data.events ?? []).map((shipmentEvent) => (
                  <tr key={shipmentEvent.id}>
                    <td>{shipmentEvent.eventType}</td>
                    <td>{shipmentEvent.eventDate}</td>
                    <td>{shipmentEvent.eventLocation}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <form onSubmit={saveEvent} className="form-row align-items-end">
              <div className="form-group col-md-3">
                <label htmlFor="shipment-show-event-type">
                  <Translate id="react.shipment.event.type.label" defaultMessage="Event" />
                </label>
                <select
                  id="shipment-show-event-type"
                  className="form-control"
                  value={newEvent.eventTypeId}
                  onChange={(event) => setNewEvent({
                    ...newEvent, eventTypeId: event.target.value,
                  })}
                  required
                >
                  <option value="">{translate('react.default.selectOne.label', 'Select one')}</option>
                  {(data.eventTypes ?? []).map((eventType) => (
                    <option key={eventType.id} value={eventType.id}>{eventType.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group col-md-3">
                <label htmlFor="shipment-show-event-location">
                  <Translate id="react.default.location.label" defaultMessage="Location" />
                </label>
                <select
                  id="shipment-show-event-location"
                  className="form-control"
                  value={newEvent.eventLocationId}
                  onChange={(event) => setNewEvent({
                    ...newEvent,
                    eventLocationId: event.target.value,
                  })}
                >
                  <option value="">{translate('react.default.selectOne.label', 'Select one')}</option>
                  {(data.eventLocations ?? []).map((eventLocation) => (
                    <option key={eventLocation.id} value={eventLocation.id}>
                      {eventLocation.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group col-md-3">
                <label htmlFor="shipment-show-event-date">
                  <Translate id="react.shipment.eventDate.label" defaultMessage="Event date" />
                </label>
                <input
                  id="shipment-show-event-date"
                  type="datetime-local"
                  className="form-control"
                  value={newEvent.eventDate}
                  onChange={(event) => setNewEvent({ ...newEvent, eventDate: event.target.value })}
                />
              </div>
              <div className="form-group col-md-3">
                <button type="submit" className="btn btn-primary btn-sm" disabled={saving}>
                  <Translate id="react.default.button.save.label" defaultMessage="Save" />
                </button>
              </div>
            </form>
          </div>
        )}
        {activeTab === 'transactions' && (
          <table className="table table-sm table-bordered mb-0" data-testid="shipment-show-transactions">
            <thead>
              <tr>
                <th>{translate('react.default.date.label', 'Date')}</th>
                <th>{translate('react.shipment.transaction.type.label', 'Transaction type')}</th>
                <th>{translate('react.shipment.transaction.number.label', 'Transaction number')}</th>
              </tr>
            </thead>
            <tbody>
              {!(data.transactions ?? []).length && (
                <tr>
                  <td colSpan="3" className="text-center text-muted">
                    {translate('react.shipment.transactions.empty.label', 'No transactions')}
                  </td>
                </tr>
              )}
              {(data.transactions ?? []).map((transaction) => (
                <tr key={transaction.id}>
                  <td>{transaction.transactionDate}</td>
                  <td>
                    <a href={`${CONTEXT_PATH}/inventory/showTransaction/${transaction.id}`}>
                      {transaction.transactionType}
                    </a>
                  </td>
                  <td>
                    <a href={`${CONTEXT_PATH}/inventory/showTransaction/${transaction.id}`}>
                      {transaction.transactionNumber}
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {activeTab === 'tracking' && (
          <div data-testid="shipment-show-tracking">
            <div className="mb-2">
              <Translate id="react.shipment.trackingNumber.label" defaultMessage="Tracking number" />
              {': '}
              <b>{data.trackingNumber || translate('react.default.none.label', 'None')}</b>
            </div>
            {data.trackingUrl && (
              <a href={data.trackingUrl} target="_blank" rel="noopener noreferrer" className="btn btn-outline-secondary btn-sm">
                <Translate id="react.shipment.openTracking.label" defaultMessage="Open tracking number" />
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ShipmentShowDetails;
