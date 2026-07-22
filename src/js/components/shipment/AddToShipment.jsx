import React, { useEffect, useMemo, useState } from 'react';

import { getTranslate } from 'react-localize-redux';
import { useSelector } from 'react-redux';
import { useLocation } from 'react-router-dom';
import Alert from 'react-s-alert';

import shipmentApi from 'api/services/ShipmentApi';
import { CREATE_SHIPMENT_URL, INVENTORY_URL } from 'consts/applicationUrls';
import useTranslation from 'hooks/useTranslation';
import Select from 'utils/Select';
import Translate, { translateWithDefaultMessage } from 'utils/Translate';

// Loose (unpacked) items use container id "0" like the legacy
// selectContainer taglib's "shipmentId:0" option values.
const LOOSE_ITEMS = '0';

const AddToShipment = () => {
  const location = useLocation();
  const productIds = useMemo(
    () => new URLSearchParams(location.search).getAll('product.id'),
    [location.search],
  );
  const [items, setItems] = useState([]);
  const [pendingShipments, setPendingShipments] = useState([]);
  const [shipmentContainer, setShipmentContainer] = useState(null);
  const [quantities, setQuantities] = useState({});
  const [saving, setSaving] = useState(false);

  useTranslation('shipping', 'default');

  const translate = useSelector(
    (state) => translateWithDefaultMessage(getTranslate(state.localize)),
  );

  useEffect(() => {
    shipmentApi.getAddToShipmentCandidates(productIds)
      .then(({ data }) => {
        setItems(data?.data?.items ?? []);
        setPendingShipments(data?.data?.pendingShipments ?? []);
      })
      .catch((err) => {
        const message = err?.response?.data?.errorMessage;
        if (message) {
          Alert.error(message);
        }
      });
  }, [productIds]);

  const containerOptions = useMemo(() => pendingShipments.flatMap((shipment) => {
    const label = `${shipment.shipmentNumber} - ${shipment.name} to ${shipment.destination?.name ?? ''}, departing ${shipment.expectedShippingDate ?? ''}`;
    return [
      {
        value: `${shipment.id}:${LOOSE_ITEMS}`,
        label: `${label} › Loose items (${shipment.looseItemCount})`,
        shipmentId: shipment.id,
        containerId: null,
      },
      ...(shipment.containers ?? []).map((container) => ({
        value: `${shipment.id}:${container.id}`,
        label: `${label} › ${container.name} (${container.itemCount})`,
        shipmentId: shipment.id,
        containerId: container.id,
      })),
    ];
  }), [pendingShipments]);

  const sortedItems = useMemo(() => {
    const groups = new Map();
    items.forEach((item) => {
      const key = item.product?.id ?? '';
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key).push(item);
    });
    return [...groups.values()].flatMap((groupItems) => [...groupItems].sort(
      (a, b) => (a.inventoryItem?.expirationDate ?? '').localeCompare(b.inventoryItem?.expirationDate ?? ''),
    ));
  }, [items]);

  const submit = async (event) => {
    event.preventDefault();
    if (!shipmentContainer) {
      Alert.error('Please select a shipment or container');
      return;
    }
    setSaving(true);
    try {
      const { data } = await shipmentApi.addToShipment({
        shipmentId: shipmentContainer.shipmentId,
        containerId: shipmentContainer.containerId,
        items: sortedItems
          .filter((item) => item.inventoryItem?.id && quantities[item.inventoryItem.id])
          .map((item) => ({
            inventoryItemId: item.inventoryItem.id,
            quantity: Number(quantities[item.inventoryItem.id]),
          })),
      });
      if (data?.data?.atLeastOneUpdate) {
        window.location = `${CREATE_SHIPMENT_URL.packing(shipmentContainer.shipmentId)}?containerId=${shipmentContainer.containerId ?? ''}`;
        return;
      }
      Alert.error('Cannot add items with quantity of zero');
      setSaving(false);
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
          <Translate id="react.shipment.addToShipment.label" defaultMessage="Add items to shipment" />
        </div>
        <form className="card-body" onSubmit={submit}>
          <div className="form-group row">
            <label className="col-sm-3 col-form-label" htmlFor="shipment-container-select">
              <Translate id="react.shipment.selectContainer.label" defaultMessage="Select a container" />
            </label>
            <div className="col-sm-9">
              <Select
                options={containerOptions}
                value={shipmentContainer}
                onChange={(value) => setShipmentContainer(value)}
                id="shipment-container-select"
              />
            </div>
          </div>
          <table className="table table-sm" data-testid="add-to-shipment-items">
            <thead>
              <tr>
                <th>{translate('react.shipment.product.label', 'Product')}</th>
                <th>{translate('react.shipment.lotNumber.label', 'Lot number')}</th>
                <th>{translate('react.shipment.expirationDate.label', 'Expiration date')}</th>
                <th className="text-center">{translate('react.shipment.quantityShipping.label', 'Shipping')}</th>
                <th className="text-center">{translate('react.shipment.quantityReceiving.label', 'Receiving')}</th>
                <th className="text-center">{translate('react.shipment.quantityOnHand.label', 'On hand')}</th>
                <th className="text-center">{translate('react.shipment.quantityToShip.label', 'Quantity to ship')}</th>
              </tr>
            </thead>
            <tbody>
              {sortedItems.map((item) => (
                <tr key={item.inventoryItem?.id ?? `${item.product?.id}-${item.lotNumber}`} data-testid="add-to-shipment-item-row">
                  <td data-testid="item-product">
                    {item.product?.productCode}
                    {' '}
                    {item.product?.name}
                  </td>
                  <td data-testid="item-lot-number">{item.lotNumber}</td>
                  <td data-testid="item-expiration-date">{item.inventoryItem?.expirationDate}</td>
                  <td className="text-center" data-testid="item-quantity-shipping">{item.quantityShipping}</td>
                  <td className="text-center" data-testid="item-quantity-receiving">{item.quantityReceiving}</td>
                  <td className="text-center" data-testid="item-quantity-on-hand">{item.quantityOnHand}</td>
                  <td className="text-center" data-testid="item-quantity-to-ship">
                    {item.quantityOnHand > 0
                      ? (
                        <input
                          type="number"
                          min="0"
                          className="form-control form-control-sm mx-auto"
                          style={{ maxWidth: '8rem' }}
                          value={quantities[item.inventoryItem?.id] ?? ''}
                          onChange={(event) => setQuantities({
                            ...quantities,
                            [item.inventoryItem?.id]: event.target.value,
                          })}
                          data-testid="item-quantity-input"
                        />
                      )
                      : 0}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="d-flex justify-content-center">
            <button type="submit" className="btn btn-primary mr-2" disabled={saving} data-testid="add-to-shipment-button">
              <Translate id="react.shipment.addItems.label" defaultMessage="Add items to shipment" />
            </button>
            <a className="btn btn-outline-secondary" href={INVENTORY_URL.browse()}>
              <Translate id="react.default.button.cancel.label" defaultMessage="Cancel" />
            </a>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddToShipment;
