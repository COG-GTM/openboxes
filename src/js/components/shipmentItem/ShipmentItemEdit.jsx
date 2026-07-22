import React, { useEffect, useState } from 'react';

import moment from 'moment';
import { confirmAlert } from 'react-confirm-alert';
import { Controller, useForm } from 'react-hook-form';
import { useDispatch } from 'react-redux';
import { useHistory, useParams } from 'react-router-dom';

import { hideSpinner, showSpinner } from 'actions';
import shipmentItemApi from 'api/services/ShipmentItemApi';
import Button from 'components/form-elements/Button';
import DateField from 'components/form-elements/v2/DateField';
import SelectField from 'components/form-elements/v2/SelectField';
import TextInput from 'components/form-elements/v2/TextInput';
import notification from 'components/Layout/notifications/notification';
import Section from 'components/Layout/v2/Section';
import { SHIPMENT_ITEM_URL } from 'consts/applicationUrls';
import NotificationType from 'consts/notificationTypes';
import useTranslate from 'hooks/useTranslate';
import useTranslation from 'hooks/useTranslation';
import Translate from 'utils/Translate';
import HeaderWrapper from 'wrappers/HeaderWrapper';
import PageWrapper from 'wrappers/PageWrapper';

const toOption = (obj) => (obj
  ? { id: obj.id, value: obj.id, label: obj.label ?? obj.name }
  : null);

const emptyValues = {
  container: null,
  product: null,
  lotNumber: '',
  expirationDate: '',
  quantity: '',
  recipient: null,
  inventoryItem: null,
  donor: null,
  shipment: null,
};

const ShipmentItemEdit = () => {
  useTranslation('shipmentItem', 'default');

  const { shipmentItemId } = useParams();
  const history = useHistory();
  const dispatch = useDispatch();
  const translate = useTranslate();

  const [options, setOptions] = useState({
    containers: [],
    products: [],
    recipients: [],
    inventoryItems: [],
    donors: [],
    shipments: [],
  });

  useEffect(() => {
    shipmentItemApi.getOptions()
      .then((response) => {
        const data = response?.data?.data ?? {};
        setOptions({
          containers: (data.containers ?? []).map(toOption),
          products: (data.products ?? []).map(toOption),
          recipients: (data.recipients ?? []).map(toOption),
          inventoryItems: (data.inventoryItems ?? []).map(toOption),
          donors: (data.donors ?? []).map(toOption),
          shipments: (data.shipments ?? []).map(toOption),
        });
      });
  }, []);

  const goToList = () => {
    history.push(SHIPMENT_ITEM_URL.list());
  };

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    mode: 'onBlur',
    defaultValues: emptyValues,
  });

  useEffect(() => {
    shipmentItemApi.getShipmentItem(shipmentItemId)
      .then((response) => {
        const item = response?.data?.data;
        reset({
          container: toOption(item?.container),
          product: toOption(item?.product),
          lotNumber: item?.lotNumber ?? '',
          expirationDate: item?.expirationDate ?? '',
          quantity: item?.quantity !== null && item?.quantity !== undefined ? `${item.quantity}` : '',
          recipient: toOption(item?.recipient),
          inventoryItem: item?.inventoryItem
            ? toOption({
              ...item.inventoryItem,
              name: item.inventoryItem.lotNumber || item.inventoryItem.id,
            })
            : null,
          donor: toOption(item?.donor),
          shipment: toOption(item?.shipment),
        });
      })
      .catch(() => {
        notification(NotificationType.ERROR_OUTLINED)({
          message: translate('react.shipmentItem.notFound.label', 'Shipment item not found'),
        });
        goToList();
      });
  }, [shipmentItemId]);

  const onSubmit = async (values) => {
    const payload = {
      container: values.container ? { id: values.container.id } : null,
      product: values.product ? { id: values.product.id } : null,
      lotNumber: values.lotNumber || null,
      expirationDate: values.expirationDate ? moment(values.expirationDate).format('YYYY-MM-DD') : null,
      quantity: values.quantity === '' ? null : values.quantity,
      recipient: values.recipient ? { id: values.recipient.id } : null,
      inventoryItem: values.inventoryItem ? { id: values.inventoryItem.id } : null,
      donor: values.donor ? { id: values.donor.id } : null,
      shipment: values.shipment ? { id: values.shipment.id } : null,
    };
    await shipmentItemApi.updateShipmentItem(shipmentItemId, payload);
    notification(NotificationType.SUCCESS)({
      message: translate('react.shipmentItem.update.success.label', 'Shipment item has been updated successfully'),
    });
    goToList();
  };

  const deleteShipmentItem = async () => {
    dispatch(showSpinner());
    try {
      const { status } = await shipmentItemApi.deleteShipmentItem(shipmentItemId);
      if (status === 204) {
        notification(NotificationType.SUCCESS)({
          message: translate('react.shipmentItem.delete.success.label', 'Shipment item has been deleted successfully'),
        });
        goToList();
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
          <Translate id="react.shipmentItem.edit.label" defaultMessage="Edit Shipment Item" />
        </span>
      </HeaderWrapper>
      <form onSubmit={handleSubmit(onSubmit)} className="p-3">
        <Section
          title={{ label: 'react.shipmentItem.detailsSection.label', defaultMessage: 'Shipment Item Details' }}
        >
          <div className="row">
            <div className="col-lg-4 col-md-6 px-2 pt-2">
              <Controller
                name="container"
                control={control}
                render={({ field }) => (
                  <SelectField
                    title={{ id: 'react.shipmentItem.column.container.label', defaultMessage: 'Container' }}
                    options={options.containers}
                    {...field}
                  />
                )}
              />
            </div>
            <div className="col-lg-4 col-md-6 px-2 pt-2">
              <Controller
                name="product"
                control={control}
                rules={{
                  required: translate('react.default.error.requiredField.label', 'This field is required'),
                }}
                render={({ field }) => (
                  <SelectField
                    title={{ id: 'react.shipmentItem.column.product.label', defaultMessage: 'Product' }}
                    required
                    options={options.products}
                    errorMessage={errors.product?.message}
                    {...field}
                  />
                )}
              />
            </div>
            <div className="col-lg-4 col-md-6 px-2 pt-2">
              <Controller
                name="lotNumber"
                control={control}
                render={({ field }) => (
                  <TextInput
                    title={{ id: 'react.shipmentItem.column.lotNumber.label', defaultMessage: 'Lot Number' }}
                    {...field}
                  />
                )}
              />
            </div>
            <div className="col-lg-4 col-md-6 px-2 pt-2">
              <Controller
                name="expirationDate"
                control={control}
                render={({ field }) => (
                  <DateField
                    title={{ id: 'react.shipmentItem.column.expirationDate.label', defaultMessage: 'Expiration Date' }}
                    {...field}
                  />
                )}
              />
            </div>
            <div className="col-lg-4 col-md-6 px-2 pt-2">
              <Controller
                name="quantity"
                control={control}
                rules={{
                  required: translate('react.default.error.requiredField.label', 'This field is required'),
                }}
                render={({ field }) => (
                  <TextInput
                    type="number"
                    title={{ id: 'react.shipmentItem.column.quantity.label', defaultMessage: 'Quantity' }}
                    required
                    errorMessage={errors.quantity?.message}
                    {...field}
                  />
                )}
              />
            </div>
            <div className="col-lg-4 col-md-6 px-2 pt-2">
              <Controller
                name="recipient"
                control={control}
                render={({ field }) => (
                  <SelectField
                    title={{ id: 'react.shipmentItem.recipient.label', defaultMessage: 'Recipient' }}
                    options={options.recipients}
                    {...field}
                  />
                )}
              />
            </div>
            <div className="col-lg-4 col-md-6 px-2 pt-2">
              <Controller
                name="inventoryItem"
                control={control}
                render={({ field }) => (
                  <SelectField
                    title={{ id: 'react.shipmentItem.inventoryItem.label', defaultMessage: 'Inventory Item' }}
                    options={options.inventoryItems}
                    {...field}
                  />
                )}
              />
            </div>
            <div className="col-lg-4 col-md-6 px-2 pt-2">
              <Controller
                name="donor"
                control={control}
                render={({ field }) => (
                  <SelectField
                    title={{ id: 'react.shipmentItem.donor.label', defaultMessage: 'Donor' }}
                    options={options.donors}
                    {...field}
                  />
                )}
              />
            </div>
            <div className="col-lg-4 col-md-6 px-2 pt-2">
              <Controller
                name="shipment"
                control={control}
                rules={{
                  required: translate('react.default.error.requiredField.label', 'This field is required'),
                }}
                render={({ field }) => (
                  <SelectField
                    title={{ id: 'react.shipmentItem.shipment.label', defaultMessage: 'Shipment' }}
                    required
                    options={options.shipments}
                    errorMessage={errors.shipment?.message}
                    {...field}
                  />
                )}
              />
            </div>
          </div>
          <div className="d-flex gap-8 pt-3">
            <Button
              type="submit"
              defaultLabel="Update"
              label="react.default.button.update.label"
              variant="primary"
              disabled={isSubmitting}
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
              onClick={goToList}
            />
          </div>
        </Section>
      </form>
    </PageWrapper>
  );
};

export default ShipmentItemEdit;
