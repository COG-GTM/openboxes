import React from 'react';

import { Controller, useForm } from 'react-hook-form';
import { useHistory, useParams } from 'react-router-dom';
import Alert from 'react-s-alert';

import paymentTermApi from 'api/services/PaymentTermApi';
import Button from 'components/form-elements/Button';
import TextInput from 'components/form-elements/v2/TextInput';
import notification from 'components/Layout/notifications/notification';
import Section from 'components/Layout/v2/Section';
import { PAYMENT_TERM_URL } from 'consts/applicationUrls';
import NotificationType from 'consts/notificationTypes';
import useTranslate from 'hooks/useTranslate';
import useTranslation from 'hooks/useTranslation';
import Translate from 'utils/Translate';
import HeaderWrapper from 'wrappers/HeaderWrapper';
import PageWrapper from 'wrappers/PageWrapper';

const PaymentTermForm = () => {
  useTranslation('paymentTerm', 'default');

  const { paymentTermId } = useParams();
  const history = useHistory();
  const translate = useTranslate();

  const goToList = () => {
    history.push(PAYMENT_TERM_URL.list());
  };

  const getPaymentTerm = async () => {
    const response = await paymentTermApi.getPaymentTerm(paymentTermId);
    const paymentTerm = response?.data?.data;
    return {
      code: paymentTerm?.code ?? '',
      name: paymentTerm?.name ?? '',
      description: paymentTerm?.description ?? '',
      prepaymentPercent: paymentTerm?.prepaymentPercent ?? '',
      daysToPayment: paymentTerm?.daysToPayment ?? '',
    };
  };

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    mode: 'onBlur',
    defaultValues: paymentTermId
      ? getPaymentTerm
      : {
        code: '', name: '', description: '', prepaymentPercent: '', daysToPayment: '',
      },
  });

  const onSubmit = async (values) => {
    const payload = {
      code: values.code,
      name: values.name,
      description: values.description,
      prepaymentPercent: values.prepaymentPercent === '' ? null : Number(values.prepaymentPercent),
      daysToPayment: values.daysToPayment === '' ? null : Number(values.daysToPayment),
    };
    try {
      if (paymentTermId) {
        await paymentTermApi.updatePaymentTerm(paymentTermId, payload);
        notification(NotificationType.SUCCESS)({
          message: translate('react.paymentTerm.update.success.label', 'Payment term has been updated successfully'),
        });
      } else {
        await paymentTermApi.createPaymentTerm(payload);
        notification(NotificationType.SUCCESS)({
          message: translate('react.paymentTerm.create.success.label', 'Payment term has been created successfully'),
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
          {paymentTermId
            ? <Translate id="react.paymentTerm.edit.label" defaultMessage="Edit Payment Term" />
            : <Translate id="react.paymentTerm.create.label" defaultMessage="Create Payment Term" />}
        </span>
      </HeaderWrapper>
      <form onSubmit={handleSubmit(onSubmit)} className="p-3">
        <Section
          title={{ label: 'react.paymentTerm.detailsSection.label', defaultMessage: 'Payment Term Details' }}
        >
          <div className="row">
            <div className="col-lg-4 col-md-6 px-2 pt-2">
              <Controller
                name="code"
                control={control}
                rules={{
                  required: translate('react.default.error.requiredField.label', 'This field is required'),
                }}
                render={({ field }) => (
                  <TextInput
                    title={{ id: 'react.paymentTerm.code.label', defaultMessage: 'Code' }}
                    required
                    errorMessage={errors.code?.message}
                    {...field}
                  />
                )}
              />
            </div>
            <div className="col-lg-4 col-md-6 px-2 pt-2">
              <Controller
                name="name"
                control={control}
                rules={{
                  required: translate('react.default.error.requiredField.label', 'This field is required'),
                }}
                render={({ field }) => (
                  <TextInput
                    title={{ id: 'react.paymentTerm.name.label', defaultMessage: 'Name' }}
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
                    title={{ id: 'react.paymentTerm.description.label', defaultMessage: 'Description' }}
                    {...field}
                  />
                )}
              />
            </div>
            <div className="col-lg-4 col-md-6 px-2 pt-2">
              <Controller
                name="prepaymentPercent"
                control={control}
                render={({ field }) => (
                  <TextInput
                    type="number"
                    title={{ id: 'react.paymentTerm.prepaymentPercent.label', defaultMessage: 'Prepayment Percent' }}
                    {...field}
                  />
                )}
              />
            </div>
            <div className="col-lg-4 col-md-6 px-2 pt-2">
              <Controller
                name="daysToPayment"
                control={control}
                render={({ field }) => (
                  <TextInput
                    type="number"
                    title={{ id: 'react.paymentTerm.daysToPayment.label', defaultMessage: 'Days To Payment' }}
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

export default PaymentTermForm;
