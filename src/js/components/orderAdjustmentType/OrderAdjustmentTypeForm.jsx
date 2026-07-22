import React, { useEffect, useState } from 'react';

import { Controller, useForm } from 'react-hook-form';
import { useHistory, useParams } from 'react-router-dom';
import Alert from 'react-s-alert';

import orderAdjustmentTypeApi from 'api/services/OrderAdjustmentTypeApi';
import { GL_ACCOUNTS_OPTION } from 'api/urls';
import Button from 'components/form-elements/Button';
import SelectField from 'components/form-elements/v2/SelectField';
import TextInput from 'components/form-elements/v2/TextInput';
import notification from 'components/Layout/notifications/notification';
import Section from 'components/Layout/v2/Section';
import { ORDER_ADJUSTMENT_TYPE_URL } from 'consts/applicationUrls';
import NotificationType from 'consts/notificationTypes';
import useTranslate from 'hooks/useTranslate';
import useTranslation from 'hooks/useTranslation';
import apiClient from 'utils/apiClient';
import Translate from 'utils/Translate';
import HeaderWrapper from 'wrappers/HeaderWrapper';
import PageWrapper from 'wrappers/PageWrapper';

const OrderAdjustmentTypeForm = () => {
  useTranslation('orderAdjustmentType', 'default');

  const { orderAdjustmentTypeId } = useParams();
  const history = useHistory();
  const translate = useTranslate();

  const [codeOptions, setCodeOptions] = useState([]);
  const [glAccountOptions, setGlAccountOptions] = useState([]);

  useEffect(() => {
    orderAdjustmentTypeApi.getOrderAdjustmentTypeCodeOptions()
      .then((response) => {
        setCodeOptions(response?.data?.data?.map((option) => ({
          id: option.id,
          value: option.id,
          label: option.label,
        })) ?? []);
      });
    apiClient.get(GL_ACCOUNTS_OPTION)
      .then((response) => {
        setGlAccountOptions(response?.data?.data?.map((option) => ({
          id: option.id,
          value: option.id,
          label: option.label,
        })) ?? []);
      });
  }, []);

  const goToList = () => {
    history.push(ORDER_ADJUSTMENT_TYPE_URL.list());
  };

  const getOrderAdjustmentType = async () => {
    const response = await orderAdjustmentTypeApi.getOrderAdjustmentType(orderAdjustmentTypeId);
    const orderAdjustmentType = response?.data?.data;
    return {
      name: orderAdjustmentType?.name ?? '',
      description: orderAdjustmentType?.description ?? '',
      code: orderAdjustmentType?.code
        ? {
          id: orderAdjustmentType.code,
          value: orderAdjustmentType.code,
          label: orderAdjustmentType.code,
        }
        : null,
      glAccount: orderAdjustmentType?.glAccount
        ? {
          id: orderAdjustmentType.glAccount.id,
          value: orderAdjustmentType.glAccount.id,
          label: `${orderAdjustmentType.glAccount.code} - ${orderAdjustmentType.glAccount.name}`,
        }
        : null,
    };
  };

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    mode: 'onBlur',
    defaultValues: orderAdjustmentTypeId
      ? getOrderAdjustmentType
      : {
        name: '', description: '', code: null, glAccount: null,
      },
  });

  const onSubmit = async (values) => {
    const payload = {
      name: values.name,
      description: values.description,
      code: values.code?.id ?? null,
      glAccount: values.glAccount ? { id: values.glAccount.id } : null,
    };
    try {
      if (orderAdjustmentTypeId) {
        await orderAdjustmentTypeApi.updateOrderAdjustmentType(orderAdjustmentTypeId, payload);
        notification(NotificationType.SUCCESS)({
          message: translate('react.orderAdjustmentType.update.success.label', 'Order adjustment type has been updated successfully'),
        });
      } else {
        await orderAdjustmentTypeApi.createOrderAdjustmentType(payload);
        notification(NotificationType.SUCCESS)({
          message: translate('react.orderAdjustmentType.create.success.label', 'Order adjustment type has been created successfully'),
        });
      }
      goToList();
    } catch (error) {
      const message = error?.response?.data?.errorMessage
        || error?.response?.data?.errorMessages?.join('; ');
      if (message) {
        Alert.error(message);
      }
    }
  };

  return (
    <PageWrapper>
      <HeaderWrapper className="align-items-center h-auto py-3">
        <span className="title">
          {orderAdjustmentTypeId
            ? <Translate id="react.orderAdjustmentType.edit.label" defaultMessage="Edit Order Adjustment Type" />
            : <Translate id="react.orderAdjustmentType.create.label" defaultMessage="Create Order Adjustment Type" />}
        </span>
      </HeaderWrapper>
      <form onSubmit={handleSubmit(onSubmit)} className="p-3">
        <Section
          title={{ label: 'react.orderAdjustmentType.detailsSection.label', defaultMessage: 'Order Adjustment Type Details' }}
        >
          <div className="row">
            <div className="col-lg-4 col-md-6 px-2 pt-2">
              <Controller
                name="name"
                control={control}
                rules={{
                  required: translate('react.default.error.requiredField.label', 'This field is required'),
                }}
                render={({ field }) => (
                  <TextInput
                    title={{ id: 'react.orderAdjustmentType.name.label', defaultMessage: 'Name' }}
                    required
                    errorMessage={errors.name?.message}
                    {...field}
                  />
                )}
              />
            </div>
            <div className="col-lg-4 col-md-6 px-2 pt-2">
              <Controller
                name="description"
                control={control}
                render={({ field }) => (
                  <TextInput
                    title={{ id: 'react.orderAdjustmentType.description.label', defaultMessage: 'Description' }}
                    {...field}
                  />
                )}
              />
            </div>
            <div className="col-lg-4 col-md-6 px-2 pt-2">
              <Controller
                name="code"
                control={control}
                rules={{
                  required: translate('react.default.error.requiredField.label', 'This field is required'),
                }}
                render={({ field }) => (
                  <SelectField
                    title={{ id: 'react.orderAdjustmentType.code.label', defaultMessage: 'Code' }}
                    required
                    options={codeOptions}
                    errorMessage={errors.code?.message}
                    {...field}
                  />
                )}
              />
            </div>
            <div className="col-lg-4 col-md-6 px-2 pt-2">
              <Controller
                name="glAccount"
                control={control}
                render={({ field }) => (
                  <SelectField
                    title={{ id: 'react.orderAdjustmentType.glAccount.label', defaultMessage: 'GL Account' }}
                    options={glAccountOptions}
                    errorMessage={errors.glAccount?.message}
                    {...field}
                  />
                )}
              />
            </div>
          </div>
          <div className="d-flex gap-8 pt-3">
            <Button
              type="submit"
              defaultLabel="Save"
              label="react.default.button.save.label"
              variant="primary"
              disabled={isSubmitting}
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

export default OrderAdjustmentTypeForm;
