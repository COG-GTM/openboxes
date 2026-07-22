import React, { useEffect, useState } from 'react';

import { useDispatch } from 'react-redux';
import { useHistory, useParams } from 'react-router-dom';

import { hideSpinner, showSpinner } from 'actions';
import shipmentItemApi from 'api/services/ShipmentItemApi';
import Button from 'components/form-elements/Button';
import notification from 'components/Layout/notifications/notification';
import Section from 'components/Layout/v2/Section';
import { CREATE_SHIPMENT_URL } from 'consts/applicationUrls';
import NotificationType from 'consts/notificationTypes';
import useTranslate from 'hooks/useTranslate';
import useTranslation from 'hooks/useTranslation';
import Translate from 'utils/Translate';
import HeaderWrapper from 'wrappers/HeaderWrapper';
import PageWrapper from 'wrappers/PageWrapper';

const binLocationKey = (binLocation) => `${binLocation?.binLocation?.id ?? ''}:${binLocation?.inventoryItem?.id ?? ''}`;

const BinLocationsTable = ({
  binLocations, selection, onSelect, name, translate,
}) => (
  <table className="table table-sm" data-testid={`split-bin-locations-${name}`}>
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
                name={name}
                aria-label={`Select ${entry.binLocation?.name ?? 'default bin'}`}
                checked={selection === key}
                disabled={!onSelect}
                onChange={() => onSelect?.(key)}
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
);

const ShipmentItemSplit = () => {
  useTranslation('shipmentItem', 'shipment', 'default');

  const { shipmentItemId } = useParams();
  const history = useHistory();
  const dispatch = useDispatch();
  const translate = useTranslate();

  const [context, setContext] = useState(null);
  const [selection, setSelection] = useState('');
  const [splitQuantity, setSplitQuantity] = useState('');

  useEffect(() => {
    dispatch(showSpinner());
    shipmentItemApi.getPickContext(shipmentItemId)
      .then((response) => setContext(response?.data?.data))
      .catch(() => {
        notification(NotificationType.ERROR_OUTLINED)({
          message: translate('react.shipmentItem.notFound.label', 'Shipment item not found'),
        });
        history.goBack();
      })
      .finally(() => dispatch(hideSpinner()));
  }, [shipmentItemId]);

  const shipmentItem = context?.shipmentItem;
  const binLocations = context?.binLocations ?? [];
  const originalQuantity = shipmentItem?.quantity ?? 0;
  const parsedSplitQuantity = parseInt(splitQuantity, 10);
  const remainingQuantity = Number.isNaN(parsedSplitQuantity)
    ? originalQuantity
    : originalQuantity - parsedSplitQuantity;
  const originalSelectionKey = `${shipmentItem?.binLocation?.id ?? ''}:${shipmentItem?.inventoryItem?.id ?? ''}`;

  const onSave = async () => {
    if (Number.isNaN(parsedSplitQuantity) || parsedSplitQuantity <= 0 || remainingQuantity <= 0) {
      notification(NotificationType.ERROR_OUTLINED)({
        message: translate(
          'react.shipmentItem.split.invalidQuantity.label',
          'Quantity must be greater than 0 and less than the original quantity',
        ),
      });
      return;
    }
    const [binLocationId, inventoryItemId] = selection.split(':');
    if (!inventoryItemId) {
      notification(NotificationType.ERROR_OUTLINED)({
        message: translate('react.shipmentItem.pick.selectBin.label', 'Please select a bin location'),
      });
      return;
    }
    dispatch(showSpinner());
    try {
      await shipmentItemApi.splitShipmentItem(shipmentItemId, {
        binLocationId: binLocationId || null,
        inventoryItemId,
        splitQuantity: parsedSplitQuantity,
      });
      notification(NotificationType.SUCCESS)({
        message: translate('react.shipmentItem.split.success.label', 'Shipment item has been split successfully'),
      });
      history.push(CREATE_SHIPMENT_URL.picking(context.shipmentId));
    } catch (error) {
      // error notification handled by apiClient interceptor
    } finally {
      dispatch(hideSpinner());
    }
  };

  return (
    <PageWrapper>
      <HeaderWrapper className="align-items-center h-auto py-3">
        <span className="title" data-testid="split-title">
          <Translate id="react.shipmentItem.split.label" defaultMessage="Split Shipment Item" />
          {shipmentItem?.product && ` — ${shipmentItem.product.productCode} ${shipmentItem.product.name}`}
        </span>
      </HeaderWrapper>
      <div className="p-3">
        <div className="alert alert-warning" role="alert">
          <Translate
            id="react.shipmentItem.split.warning.label"
            defaultMessage="Warning: Splitting a shipment item cannot be undone."
          />
        </div>
        <Section
          title={{ label: 'react.shipmentItem.split.originalItem.label', defaultMessage: 'Original Item' }}
        >
          <div className="d-flex gap-8" data-testid="split-original-item">
            <span>
              <Translate id="react.shipmentItem.column.lotNumber.label" defaultMessage="Lot Number" />
              {`: ${shipmentItem?.inventoryItem?.lotNumber ?? shipmentItem?.lotNumber ?? ''}`}
            </span>
            <span>
              <Translate id="react.shipmentItem.binLocation.label" defaultMessage="Bin Location" />
              {`: ${shipmentItem?.binLocation?.name ?? translate('react.shipmentItem.defaultBin.label', 'Default')}`}
            </span>
            <span>
              <Translate id="react.shipmentItem.column.quantity.label" defaultMessage="Quantity" />
              {`: ${originalQuantity}`}
            </span>
          </div>
        </Section>
        <Section
          title={{ label: 'react.shipmentItem.split.itemOne.label', defaultMessage: 'Item 1 (remaining)' }}
        >
          <BinLocationsTable
            binLocations={binLocations
              .filter((entry) => binLocationKey(entry) === originalSelectionKey)}
            selection={originalSelectionKey}
            name="item1"
            translate={translate}
          />
          <div className="d-flex align-items-center gap-8 py-2">
            <span className="font-weight-bold">
              <Translate id="react.shipmentItem.split.remainingQuantity.label" defaultMessage="Remaining quantity" />
            </span>
            <span data-testid="split-remaining-quantity">{remainingQuantity}</span>
          </div>
        </Section>
        <Section
          title={{ label: 'react.shipmentItem.split.itemTwo.label', defaultMessage: 'Item 2 (new item)' }}
        >
          <BinLocationsTable
            binLocations={binLocations}
            selection={selection}
            onSelect={setSelection}
            name="item2"
            translate={translate}
          />
          <div className="d-flex align-items-center gap-8 py-2">
            <label htmlFor="split-quantity" className="font-weight-bold mb-0">
              <Translate id="react.shipmentItem.split.splitQuantity.label" defaultMessage="Split quantity" />
            </label>
            <input
              id="split-quantity"
              type="number"
              className="form-control w-auto"
              min={1}
              max={originalQuantity - 1}
              value={splitQuantity}
              onChange={(event) => setSplitQuantity(event.target.value)}
            />
          </div>
        </Section>
        <div className="d-flex gap-8 pt-3">
          <Button
            defaultLabel="Save"
            label="react.default.button.save.label"
            variant="primary"
            onClick={onSave}
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
      </div>
    </PageWrapper>
  );
};

export default ShipmentItemSplit;
