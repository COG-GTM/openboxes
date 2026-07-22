import React, { useEffect, useState } from 'react';

import { confirmAlert } from 'react-confirm-alert';
import { useDispatch } from 'react-redux';
import { useHistory, useParams } from 'react-router-dom';

import { hideSpinner, showSpinner } from 'actions';
import shipmentItemApi from 'api/services/ShipmentItemApi';
import Button from 'components/form-elements/Button';
import notification from 'components/Layout/notifications/notification';
import Section from 'components/Layout/v2/Section';
import {
  CONTEXT_PATH,
  PRODUCT_URL,
  SHIPMENT_ITEM_URL,
  SHIPMENT_SHOW_URL,
} from 'consts/applicationUrls';
import NotificationType from 'consts/notificationTypes';
import useTranslate from 'hooks/useTranslate';
import useTranslation from 'hooks/useTranslation';
import Translate from 'utils/Translate';
import HeaderWrapper from 'wrappers/HeaderWrapper';
import PageWrapper from 'wrappers/PageWrapper';

const formatDate = (value) => (value ? new Date(value).toLocaleString() : '');

const ShipmentItemShow = () => {
  useTranslation('shipmentItem', 'default');

  const { shipmentItemId } = useParams();
  const history = useHistory();
  const dispatch = useDispatch();
  const translate = useTranslate();

  const [shipmentItem, setShipmentItem] = useState(null);

  useEffect(() => {
    shipmentItemApi.getShipmentItem(shipmentItemId)
      .then((response) => setShipmentItem(response?.data?.data))
      .catch(() => {
        // Unknown/deleted item: return to the list, like the legacy
        // show action did.
        notification(NotificationType.ERROR_OUTLINED)({
          message: translate('react.shipmentItem.notFound.label', 'Shipment item not found'),
        });
        history.push(SHIPMENT_ITEM_URL.list());
      });
  }, [shipmentItemId]);

  const deleteShipmentItem = async () => {
    dispatch(showSpinner());
    try {
      const { status } = await shipmentItemApi.deleteShipmentItem(shipmentItemId);
      if (status === 204) {
        notification(NotificationType.SUCCESS)({
          message: translate('react.shipmentItem.delete.success.label', 'Shipment item has been deleted successfully'),
        });
        history.push(SHIPMENT_ITEM_URL.list());
      }
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
        <span className="title">
          <Translate id="react.shipmentItem.show.label" defaultMessage="View Shipment Item" />
        </span>
      </HeaderWrapper>
      <div className="p-3">
        <Section
          title={{ label: 'react.shipmentItem.detailsSection.label', defaultMessage: 'Shipment Item Details' }}
        >
          <table className="table table-sm w-auto" data-testid="shipment-item-details">
            <tbody>
              <tr>
                <td className="font-weight-bold pr-4">
                  <Translate id="react.shipmentItem.column.id.label" defaultMessage="Id" />
                </td>
                <td aria-label="Id">{shipmentItem?.id}</td>
              </tr>
              <tr>
                <td className="font-weight-bold pr-4">
                  <Translate id="react.shipmentItem.column.container.label" defaultMessage="Container" />
                </td>
                <td aria-label="Container">
                  {shipmentItem?.container && (
                    <a href={`${CONTEXT_PATH}/container/show/${shipmentItem.container.id}`}>
                      {shipmentItem.container.name}
                    </a>
                  )}
                </td>
              </tr>
              <tr>
                <td className="font-weight-bold pr-4">
                  <Translate id="react.shipmentItem.column.product.label" defaultMessage="Product" />
                </td>
                <td aria-label="Product">
                  {shipmentItem?.product && (
                    <a href={PRODUCT_URL.show(shipmentItem.product.id)}>
                      {shipmentItem.product.name}
                    </a>
                  )}
                </td>
              </tr>
              <tr>
                <td className="font-weight-bold pr-4">
                  <Translate id="react.shipmentItem.column.lotNumber.label" defaultMessage="Lot Number" />
                </td>
                <td aria-label="Lot Number">{shipmentItem?.lotNumber}</td>
              </tr>
              <tr>
                <td className="font-weight-bold pr-4">
                  <Translate id="react.shipmentItem.column.expirationDate.label" defaultMessage="Expiration Date" />
                </td>
                <td aria-label="Expiration Date">{shipmentItem?.expirationDate}</td>
              </tr>
              <tr>
                <td className="font-weight-bold pr-4">
                  <Translate id="react.shipmentItem.column.quantity.label" defaultMessage="Quantity" />
                </td>
                <td aria-label="Quantity">{shipmentItem?.quantity}</td>
              </tr>
              <tr>
                <td className="font-weight-bold pr-4">
                  <Translate id="react.shipmentItem.recipient.label" defaultMessage="Recipient" />
                </td>
                <td aria-label="Recipient">
                  {shipmentItem?.recipient && (
                    <a href={`${CONTEXT_PATH}/person/show/${shipmentItem.recipient.id}`}>
                      {shipmentItem.recipient.name}
                    </a>
                  )}
                </td>
              </tr>
              <tr>
                <td className="font-weight-bold pr-4">
                  <Translate id="react.shipmentItem.inventoryItem.label" defaultMessage="Inventory Item" />
                </td>
                <td aria-label="Inventory Item">
                  {shipmentItem?.inventoryItem && (
                    <a href={`${CONTEXT_PATH}/inventoryItem/show/${shipmentItem.inventoryItem.id}`}>
                      {shipmentItem.inventoryItem.lotNumber || shipmentItem.inventoryItem.id}
                    </a>
                  )}
                </td>
              </tr>
              <tr>
                <td className="font-weight-bold pr-4">
                  <Translate id="react.shipmentItem.donor.label" defaultMessage="Donor" />
                </td>
                <td aria-label="Donor">
                  {shipmentItem?.donor && (
                    <a href={`${CONTEXT_PATH}/donor/show/${shipmentItem.donor.id}`}>
                      {shipmentItem.donor.name}
                    </a>
                  )}
                </td>
              </tr>
              <tr>
                <td className="font-weight-bold pr-4">
                  <Translate id="react.shipmentItem.dateCreated.label" defaultMessage="Date Created" />
                </td>
                <td aria-label="Date Created">{formatDate(shipmentItem?.dateCreated)}</td>
              </tr>
              <tr>
                <td className="font-weight-bold pr-4">
                  <Translate id="react.shipmentItem.lastUpdated.label" defaultMessage="Last Updated" />
                </td>
                <td aria-label="Last Updated">{formatDate(shipmentItem?.lastUpdated)}</td>
              </tr>
              <tr>
                <td className="font-weight-bold pr-4">
                  <Translate id="react.shipmentItem.orderItems.label" defaultMessage="Order Items" />
                </td>
                <td aria-label="Order Items">
                  <ul className="mb-0 pl-3" data-testid="shipment-item-order-items">
                    {(shipmentItem?.orderItems ?? []).map((orderItem) => (
                      <li key={orderItem.id}>
                        <a href={`${CONTEXT_PATH}/orderItem/show/${orderItem.id}`}>
                          {orderItem.name}
                        </a>
                      </li>
                    ))}
                  </ul>
                </td>
              </tr>
              <tr>
                <td className="font-weight-bold pr-4">
                  <Translate id="react.shipmentItem.shipment.label" defaultMessage="Shipment" />
                </td>
                <td aria-label="Shipment">
                  {shipmentItem?.shipment && (
                    <a href={SHIPMENT_SHOW_URL.show(shipmentItem.shipment.id)}>
                      {shipmentItem.shipment.name}
                    </a>
                  )}
                </td>
              </tr>
            </tbody>
          </table>
        </Section>
        <div className="d-flex gap-8 pt-3">
          <Button
            defaultLabel="Edit"
            label="react.default.button.edit.label"
            variant="primary"
            onClick={() => history.push(SHIPMENT_ITEM_URL.edit(shipmentItemId))}
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
            onClick={() => history.push(SHIPMENT_ITEM_URL.list())}
          />
        </div>
      </div>
    </PageWrapper>
  );
};

export default ShipmentItemShow;
