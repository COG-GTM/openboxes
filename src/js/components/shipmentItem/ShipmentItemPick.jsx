import React, { useEffect, useState } from 'react';

import { confirmAlert } from 'react-confirm-alert';
import { useDispatch } from 'react-redux';
import { useHistory, useParams } from 'react-router-dom';

import { hideSpinner, showSpinner } from 'actions';
import shipmentApi from 'api/services/ShipmentApi';
import shipmentItemApi from 'api/services/ShipmentItemApi';
import Button from 'components/form-elements/Button';
import notification from 'components/Layout/notifications/notification';
import Section from 'components/Layout/v2/Section';
import { CREATE_SHIPMENT_URL, SHIPMENT_ITEM_URL } from 'consts/applicationUrls';
import NotificationType from 'consts/notificationTypes';
import useTranslate from 'hooks/useTranslate';
import useTranslation from 'hooks/useTranslation';
import Translate from 'utils/Translate';
import HeaderWrapper from 'wrappers/HeaderWrapper';
import PageWrapper from 'wrappers/PageWrapper';

const binLocationKey = (binLocation) => `${binLocation?.binLocation?.id ?? ''}:${binLocation?.inventoryItem?.id ?? ''}`;

const ShipmentItemPick = () => {
  useTranslation('shipmentItem', 'shipment', 'default');

  const { shipmentItemId } = useParams();
  const history = useHistory();
  const dispatch = useDispatch();
  const translate = useTranslate();

  const [context, setContext] = useState(null);
  const [selection, setSelection] = useState('');
  const [quantity, setQuantity] = useState('');

  const fetchContext = () => {
    dispatch(showSpinner());
    shipmentItemApi.getPickContext(shipmentItemId)
      .then((response) => {
        const data = response?.data?.data;
        setContext(data);
        setQuantity(`${data?.shipmentItem?.quantity ?? ''}`);
        const selected = (data?.binLocations ?? []).find((entry) =>
          entry?.binLocation?.id === data?.shipmentItem?.binLocation?.id
          && entry?.inventoryItem?.id === data?.shipmentItem?.inventoryItem?.id);
        setSelection(selected ? binLocationKey(selected) : '');
      })
      .catch(() => {
        notification(NotificationType.ERROR_OUTLINED)({
          message: translate('react.shipmentItem.notFound.label', 'Shipment item not found'),
        });
        history.goBack();
      })
      .finally(() => dispatch(hideSpinner()));
  };

  useEffect(() => {
    fetchContext();
  }, [shipmentItemId]);

  const shipmentItem = context?.shipmentItem;
  const binLocations = context?.binLocations ?? [];
  const totalQuantity = binLocations.reduce((sum, entry) => sum + (entry.quantity ?? 0), 0);
  const selectedEntry = binLocations.find((entry) => binLocationKey(entry) === selection);
  const quantityInBin = selectedEntry?.quantity ?? 0;
  const quantityRequested = shipmentItem?.quantity ?? 0;
  const hasEnoughInBin = quantityInBin >= quantityRequested;
  const hasEnoughTotal = totalQuantity >= quantityRequested;

  const onPick = async () => {
    if (!selectedEntry?.inventoryItem?.id) {
      notification(NotificationType.ERROR_OUTLINED)({
        message: translate('react.shipmentItem.pick.selectBin.label', 'Please select a bin location'),
      });
      return;
    }
    dispatch(showSpinner());
    try {
      await shipmentApi.pickShipmentItem(context.shipmentId, shipmentItemId, {
        inventoryItemId: selectedEntry.inventoryItem.id,
        binLocationId: selectedEntry.binLocation?.id ?? null,
        quantity,
      });
      notification(NotificationType.SUCCESS)({
        message: translate('react.shipmentItem.pick.success.label', 'Shipment item has been picked successfully'),
      });
      history.push(CREATE_SHIPMENT_URL.picking(context.shipmentId));
    } catch (error) {
      // error notification handled by apiClient interceptor
    } finally {
      dispatch(hideSpinner());
    }
  };

  const deleteShipmentItem = async () => {
    dispatch(showSpinner());
    try {
      await shipmentApi.deleteShipmentItem(context.shipmentId, shipmentItemId);
      notification(NotificationType.SUCCESS)({
        message: translate('react.shipmentItem.delete.success.label', 'Shipment item has been deleted successfully'),
      });
      history.push(CREATE_SHIPMENT_URL.picking(context.shipmentId));
    } finally {
      dispatch(hideSpinner());
    }
  };

  const onDelete = () => {
    confirmAlert({
      title: translate('react.default.areYouSure.label', 'Are you sure?'),
      message: translate(
        'react.shipmentItem.delete.confirm.label',
        'Are you sure you want to delete this shipment item?',
      ),
      buttons: [
        {
          label: translate('react.default.yes.label', 'Yes'),
          onClick: deleteShipmentItem,
        },
        {
          label: translate('react.default.no.label', 'No'),
        },
      ],
    });
  };

  return (
    <PageWrapper>
      <HeaderWrapper className="align-items-center h-auto py-3">
        <div className="d-flex w-100 justify-content-between align-items-center">
          <span className="title" data-testid="pick-title">
            <Translate id="react.shipmentItem.pick.label" defaultMessage="Pick Shipment Item" />
            {shipmentItem?.product && ` — ${shipmentItem.product.productCode} ${shipmentItem.product.name}`}
          </span>
          <div className="d-flex gap-8">
            <Button
              defaultLabel="Previous"
              label="react.default.button.previous.label"
              variant="primary-outline"
              disabled={!context?.previousItemId}
              onClick={() => history.push(SHIPMENT_ITEM_URL.pick(context.previousItemId))}
            />
            <Button
              defaultLabel="Next"
              label="react.default.button.next.label"
              variant="primary-outline"
              disabled={!context?.nextItemId}
              onClick={() => history.push(SHIPMENT_ITEM_URL.pick(context.nextItemId))}
            />
          </div>
        </div>
      </HeaderWrapper>
      <div className="p-3">
        <Section
          title={{ label: 'react.shipmentItem.pick.binLocations.label', defaultMessage: 'Bin Locations' }}
        >
          <div className="d-flex gap-8 pb-2" data-testid="pick-quantity-summary">
            <span>
              <Translate id="react.shipmentItem.pick.quantityRequested.label" defaultMessage="Quantity requested" />
              {`: ${quantityRequested}`}
            </span>
            <span>
              <Translate id="react.shipmentItem.pick.quantityAvailable.label" defaultMessage="Quantity available" />
              {`: ${totalQuantity}`}
            </span>
            {!hasEnoughTotal && (
              <span className="text-danger">
                <Translate id="react.shipmentItem.pick.notEnoughTotal.label" defaultMessage="There is not enough quantity on hand for this product" />
              </span>
            )}
            {hasEnoughTotal && selection && !hasEnoughInBin && (
              <span className="text-danger">
                <Translate id="react.shipmentItem.pick.notEnoughInBin.label" defaultMessage="There is not enough quantity in the selected bin location" />
              </span>
            )}
          </div>
          <table className="table table-sm" data-testid="pick-bin-locations">
            <thead>
              <tr>
                <th aria-label="Selected" />
                <th aria-label="Bin Location"><Translate id="react.shipmentItem.binLocation.label" defaultMessage="Bin Location" /></th>
                <th aria-label="Lot Number"><Translate id="react.shipmentItem.column.lotNumber.label" defaultMessage="Lot Number" /></th>
                <th aria-label="Expiration Date"><Translate id="react.shipmentItem.column.expirationDate.label" defaultMessage="Expiration Date" /></th>
                <th aria-label="Quantity"><Translate id="react.shipmentItem.column.quantity.label" defaultMessage="Quantity" /></th>
              </tr>
            </thead>
            <tbody>
              {binLocations.map((entry) => {
                const key = binLocationKey(entry);
                return (
                  <tr key={key}>
                    <td>
                      <input
                        type="radio"
                        name="selection"
                        aria-label={`Select ${entry.binLocation?.name ?? 'default bin'}`}
                        checked={selection === key}
                        onChange={() => setSelection(key)}
                      />
                    </td>
                    <td>{entry.binLocation?.name ?? translate('react.shipmentItem.defaultBin.label', 'Default')}</td>
                    <td>{entry.inventoryItem?.lotNumber}</td>
                    <td>{entry.inventoryItem?.expirationDate}</td>
                    <td>{entry.quantity}</td>
                  </tr>
                );
              })}
              {!binLocations.length && (
                <tr>
                  <td colSpan={5}>
                    <Translate id="react.shipmentItem.pick.noBinLocations.label" defaultMessage="No bin locations with quantity on hand for this product" />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          <div className="d-flex align-items-center gap-8 py-2">
            <label htmlFor="pick-quantity" className="font-weight-bold mb-0">
              <Translate id="react.shipmentItem.pick.quantityToPick.label" defaultMessage="Quantity to pick" />
            </label>
            <input
              id="pick-quantity"
              type="number"
              className="form-control w-auto"
              value={quantity}
              onChange={(event) => setQuantity(event.target.value)}
            />
          </div>
          <div className="d-flex gap-8 pt-2">
            <Button
              defaultLabel="Pick"
              label="react.shipmentItem.pick.button.label"
              variant="primary"
              onClick={onPick}
            />
            <Button
              defaultLabel="Split"
              label="react.shipmentItem.split.button.label"
              variant="primary-outline"
              onClick={() => history.push(SHIPMENT_ITEM_URL.split(shipmentItemId))}
            />
            <Button
              defaultLabel="Delete"
              label="react.default.button.delete.label"
              variant="danger-outline"
              onClick={onDelete}
            />
            <Button
              defaultLabel="Cancel"
              label="react.default.button.cancel.label"
              variant="primary-outline"
              onClick={() => (context?.shipmentId
                ? history.push(CREATE_SHIPMENT_URL.picking(context.shipmentId))
                : history.goBack())}
            />
          </div>
        </Section>
      </div>
    </PageWrapper>
  );
};

export default ShipmentItemPick;
