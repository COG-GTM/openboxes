import React, { useCallback, useEffect, useState } from 'react';

import { getTranslate } from 'react-localize-redux';
import { useSelector } from 'react-redux';
import { useParams } from 'react-router-dom';
import Alert from 'react-s-alert';

import shipmentApi from 'api/services/ShipmentApi';
import ShipmentSummaryHeader from 'components/shipment/ShipmentSummaryHeader';
import { SHIPMENT_SHOW_URL } from 'consts/applicationUrls';
import useTranslation from 'hooks/useTranslation';
import Translate, { translateWithDefaultMessage } from 'utils/Translate';

// React version of the legacy shipment/receiveShipment GSP: edit the pending
// receipt (delivery date, quantities, bins, comments), split/delete receipt
// items and receive the shipment.
const ReceiveShipment = () => {
  const { shipmentId } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [actualDeliveryDate, setActualDeliveryDate] = useState('');
  const [items, setItems] = useState({});
  const [saving, setSaving] = useState(false);
  const [putawayLocations, setPutawayLocations] = useState(null);
  const translate = useSelector(
    (state) => translateWithDefaultMessage(getTranslate(state.localize)),
  );

  useTranslation('shipment', 'default');

  const fetchReceipt = useCallback(() => {
    shipmentApi.getReceipt(shipmentId)
      .then((response) => {
        const receiptData = response.data?.data;
        setData(receiptData);
        setActualDeliveryDate((receiptData?.receipt?.actualDeliveryDate || '').replace(' ', 'T'));
        setItems((receiptData?.receipt?.receiptItems ?? []).reduce((acc, item) => {
          acc[item.id] = {
            quantityReceived: item.quantityReceived ?? '',
            binLocationId: item.binLocation?.id || '',
            comment: item.comment || '',
          };
          return acc;
        }, {}));
      })
      .catch((err) => {
        setError(err?.response?.data?.errorMessage
          || translate('react.default.errors.error.label', 'An error occurred'));
      });
  }, [shipmentId]);

  useEffect(() => {
    fetchReceipt();
  }, [fetchReceipt]);

  const buildPayload = (action) => ({
    action,
    actualDeliveryDate: actualDeliveryDate ? actualDeliveryDate.replace('T', ' ') : null,
    recipientId: data.receipt?.recipient?.id || null,
    receiptItems: Object.keys(items).map((id) => ({
      id,
      quantityReceived: items[id].quantityReceived === '' ? 0 : Number(items[id].quantityReceived),
      binLocationId: items[id].binLocationId || null,
      comment: items[id].comment || null,
    })),
  });

  const save = async (action) => {
    setSaving(true);
    try {
      await shipmentApi.saveReceipt(shipmentId, buildPayload(action));
      if (action === 'receiveShipment' || action === 'saveAndExit') {
        window.location.assign(SHIPMENT_SHOW_URL.show(shipmentId));
        return;
      }
      Alert.success(translate('react.default.saved.label', 'Saved'));
      fetchReceipt();
      setSaving(false);
    } catch (err) {
      const errorData = err?.response?.data;
      Alert.error(errorData?.errors?.join('<br/>') || errorData?.errorMessage
        || translate('react.default.errors.error.label', 'An error occurred'));
      setSaving(false);
    }
  };

  const splitItem = async (receiptItemId) => {
    setSaving(true);
    try {
      await shipmentApi.saveReceipt(shipmentId, buildPayload('save'));
      await shipmentApi.splitReceiptItem(shipmentId, receiptItemId);
      fetchReceipt();
    } catch (err) {
      Alert.error(err?.response?.data?.errorMessage
        || translate('react.default.errors.error.label', 'An error occurred'));
    } finally {
      setSaving(false);
    }
  };

  const deleteItem = async (receiptItemId) => {
    setSaving(true);
    try {
      await shipmentApi.saveReceipt(shipmentId, buildPayload('save'));
      await shipmentApi.deleteReceiptItem(shipmentId, receiptItemId);
      fetchReceipt();
    } catch (err) {
      Alert.error(err?.response?.data?.errorMessage
        || translate('react.default.errors.error.label', 'An error occurred'));
    } finally {
      setSaving(false);
    }
  };

  const showPutawayLocations = async (receiptItemId) => {
    try {
      const response = await shipmentApi.getPutawayLocations(shipmentId, receiptItemId);
      setPutawayLocations({ receiptItemId, locations: response.data?.data ?? [] });
    } catch (err) {
      Alert.error(err?.response?.data?.errorMessage
        || translate('react.default.errors.error.label', 'An error occurred'));
    }
  };

  if (error) {
    return <div className="alert alert-danger m-3" role="alert">{error}</div>;
  }

  if (!data) {
    return null;
  }

  const receiptItems = data.receipt?.receiptItems ?? [];

  return (
    <div className="d-flex flex-column m-3" data-testid="receive-shipment">
      <ShipmentSummaryHeader shipment={data.shipment} />
      {!data.isDestination && (
        <div className="alert alert-warning" role="alert" data-testid="receive-shipment-destination-warning">
          <Translate
            id="react.shipment.receive.mustBeLoggedIntoDestination.label"
            defaultMessage="You must be logged into the destination location to receive this shipment."
          />
        </div>
      )}
      <div className="card mb-3">
        <div className="card-header">
          <Translate id="react.shipment.receiveShipment.label" defaultMessage="Receive shipment" />
        </div>
        <div className="card-body">
          <div className="form-group row">
            <span className="col-sm-3 col-form-label">
              <Translate id="react.shipment.actualShippingDate.label" defaultMessage="Actual shipping date" />
            </span>
            <div className="col-sm-6 col-form-label" data-testid="receive-shipment-shipped-date">
              {data.shipment?.actualShippingDate}
            </div>
          </div>
          <div className="form-group row">
            <label className="col-sm-3 col-form-label" htmlFor="receive-shipment-delivery-date">
              <Translate id="react.shipment.actualDeliveryDate.label" defaultMessage="Actual delivery date" />
            </label>
            <div className="col-sm-6">
              <input
                id="receive-shipment-delivery-date"
                type="datetime-local"
                className="form-control"
                value={actualDeliveryDate}
                onChange={(event) => setActualDeliveryDate(event.target.value)}
                required
              />
            </div>
          </div>
        </div>
      </div>
      <div className="card mb-3">
        <div className="card-header">
          <Translate id="react.shipment.receipt.items.label" defaultMessage="Receipt items" />
        </div>
        <div className="card-body">
          <table className="table table-sm table-bordered mb-0" data-testid="receive-shipment-items">
            <thead>
              <tr>
                <th>{translate('react.shipment.container.label', 'Container')}</th>
                <th>{translate('react.shipment.item.product.label', 'Product')}</th>
                <th>{translate('react.shipment.item.lotNumber.label', 'Lot')}</th>
                <th>{translate('react.shipment.item.expirationDate.label', 'Expires')}</th>
                <th className="text-right">{translate('react.shipment.item.quantityShipped.label', 'Shipped')}</th>
                <th>{translate('react.shipment.item.quantityReceived.label', 'Received')}</th>
                {data.hasBinLocationSupport && (
                  <th>{translate('react.shipment.binLocation.label', 'Bin location')}</th>
                )}
                <th>{translate('react.shipment.comments.label', 'Comments')}</th>
                <th aria-label="actions" />
              </tr>
            </thead>
            <tbody>
              {receiptItems.map((item) => (
                <tr key={item.id} data-testid="receive-shipment-item-row">
                  <td>{item.container}</td>
                  <td>
                    {item.product?.productCode}
                    {' '}
                    {item.product?.name}
                  </td>
                  <td>{item.lotNumber}</td>
                  <td>{item.expirationDate}</td>
                  <td className="text-right">{item.quantityShipped}</td>
                  <td style={{ width: '8rem' }}>
                    <input
                      type="number"
                      min="0"
                      className="form-control form-control-sm"
                      aria-label={`quantity-received-${item.id}`}
                      value={items[item.id]?.quantityReceived ?? ''}
                      onChange={(event) => setItems({
                        ...items,
                        [item.id]: { ...items[item.id], quantityReceived: event.target.value },
                      })}
                    />
                  </td>
                  {data.hasBinLocationSupport && (
                    <td style={{ width: '12rem' }}>
                      <select
                        className="form-control form-control-sm"
                        aria-label={`bin-location-${item.id}`}
                        value={items[item.id]?.binLocationId ?? ''}
                        onChange={(event) => setItems({
                          ...items,
                          [item.id]: { ...items[item.id], binLocationId: event.target.value },
                        })}
                      >
                        <option value="">{translate('react.default.selectOne.label', 'Select one')}</option>
                        {(data.binLocations ?? []).map((binLocation) => (
                          <option key={binLocation.id} value={binLocation.id}>
                            {binLocation.name}
                          </option>
                        ))}
                      </select>
                    </td>
                  )}
                  <td style={{ width: '12rem' }}>
                    <input
                      className="form-control form-control-sm"
                      aria-label={`comment-${item.id}`}
                      value={items[item.id]?.comment ?? ''}
                      onChange={(event) => setItems({
                        ...items,
                        [item.id]: { ...items[item.id], comment: event.target.value },
                      })}
                    />
                  </td>
                  <td className="text-nowrap">
                    <button
                      type="button"
                      className="btn btn-link btn-sm p-0 mr-2"
                      disabled={saving}
                      onClick={() => splitItem(item.id)}
                    >
                      <Translate id="react.shipment.receive.splitLine.label" defaultMessage="Split line" />
                    </button>
                    {item.isDeleteAllowed && (
                      <button
                        type="button"
                        className="btn btn-link btn-sm p-0 mr-2 text-danger"
                        disabled={saving}
                        onClick={() => deleteItem(item.id)}
                      >
                        <Translate id="react.default.button.delete.label" defaultMessage="Delete" />
                      </button>
                    )}
                    <button
                      type="button"
                      className="btn btn-link btn-sm p-0"
                      disabled={saving}
                      onClick={() => showPutawayLocations(item.id)}
                    >
                      <Translate id="react.shipment.receive.showPutawayLocations.label" defaultMessage="Bins" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {putawayLocations && (
            <div className="border rounded p-2 mt-2" data-testid="receive-shipment-putaway-locations">
              <div className="d-flex justify-content-between">
                <b>
                  <Translate id="react.shipment.receive.putawayLocations.label" defaultMessage="Putaway locations" />
                </b>
                <button
                  type="button"
                  className="btn btn-link btn-sm p-0"
                  onClick={() => setPutawayLocations(null)}
                >
                  <Translate id="react.default.button.close.label" defaultMessage="Close" />
                </button>
              </div>
              <table className="table table-sm mb-0">
                <thead>
                  <tr>
                    <th>{translate('react.shipment.binLocation.label', 'Bin location')}</th>
                    <th>{translate('react.shipment.item.lotNumber.label', 'Lot')}</th>
                    <th className="text-right">{translate('react.shipment.item.quantity.label', 'Quantity')}</th>
                  </tr>
                </thead>
                <tbody>
                  {!putawayLocations.locations.length && (
                    <tr>
                      <td colSpan="3" className="text-center text-muted">
                        {translate('react.default.none.label', 'None')}
                      </td>
                    </tr>
                  )}
                  {putawayLocations.locations.map((location) => (
                    <tr key={`${location.binLocation}-${location.lotNumber}`}>
                      <td>{location.binLocation}</td>
                      <td>{location.lotNumber}</td>
                      <td className="text-right">{location.quantity}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
      <div className="d-flex">
        <button
          type="button"
          className="btn btn-outline-secondary mr-2"
          disabled={saving}
          onClick={() => save('save')}
          data-testid="receive-shipment-save-button"
        >
          <Translate id="react.default.button.save.label" defaultMessage="Save" />
        </button>
        <button
          type="button"
          className="btn btn-outline-secondary mr-2"
          disabled={saving}
          onClick={() => save('saveAndExit')}
        >
          <Translate id="react.shipment.receive.saveAndExit.label" defaultMessage="Save and exit" />
        </button>
        <button
          type="button"
          className="btn btn-primary mr-2"
          disabled={saving}
          onClick={() => save('receiveShipment')}
          data-testid="receive-shipment-receive-button"
        >
          <Translate id="react.shipment.receiveShipment.label" defaultMessage="Receive shipment" />
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
    </div>
  );
};

export default ReceiveShipment;
