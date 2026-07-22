import React, { useEffect, useState } from 'react';

import { Controller, useForm } from 'react-hook-form';

import productTypeApi from 'api/services/ProductTypeApi';
import Button from 'components/form-elements/Button';
import SelectField from 'components/form-elements/v2/SelectField';
import TextInput from 'components/form-elements/v2/TextInput';
import notification from 'components/Layout/notifications/notification';
import Section from 'components/Layout/v2/Section';
import { PRODUCT_TYPE_URL } from 'consts/applicationUrls';
import NotificationType from 'consts/notificationTypes';
import useTranslate from 'hooks/useTranslate';
import useTranslation from 'hooks/useTranslation';
import Translate from 'utils/Translate';
import HeaderWrapper from 'wrappers/HeaderWrapper';
import PageWrapper from 'wrappers/PageWrapper';

// The legacy create screen always forces these (see ProductTypeApiController)
const REQUIRED_FIELDS = ['PRODUCT_CODE', 'NAME', 'CATEGORY', 'GL_ACCOUNT'];

const ProductTypeForm = () => {
  useTranslation('productType', 'default');

  const translate = useTranslate();

  const [supportedActivityOptions, setSupportedActivityOptions] = useState([]);
  const [productFieldOptions, setProductFieldOptions] = useState([]);

  const toOption = (option) => ({ id: option.id, value: option.id, label: option.label });

  useEffect(() => {
    productTypeApi.getProductActivityCodeOptions()
      .then((response) => {
        setSupportedActivityOptions(response?.data?.data?.map(toOption) ?? []);
      });
    productTypeApi.getProductFieldOptions()
      .then((response) => {
        setProductFieldOptions(response?.data?.data?.map(toOption) ?? []);
      });
  }, []);

  const requiredFieldOptions = productFieldOptions
    .filter((option) => REQUIRED_FIELDS.includes(option.id));

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    mode: 'onBlur',
    defaultValues: {
      name: '',
      productIdentifierFormat: '',
      sequenceNumber: '0',
      code: '',
      supportedActivities: [],
      displayedFields: [],
    },
  });

  const onSubmit = async (values) => {
    try {
      await productTypeApi.createProductType({
        name: values.name,
        code: values.code,
        productIdentifierFormat: values.productIdentifierFormat,
        sequenceNumber: values.sequenceNumber,
        supportedActivities: (values.supportedActivities ?? []).map((option) => option.id),
        displayedFields: (values.displayedFields ?? []).map((option) => option.id),
      });
    } catch (error) {
      // apiClient's response interceptor already notifies the user
      return;
    }
    notification(NotificationType.SUCCESS)({
      message: translate('react.productType.create.success.label', 'Product type has been created successfully'),
    });
    // The product type list is still a legacy GSP screen, so a full
    // browser navigation is needed.
    window.location.href = PRODUCT_TYPE_URL.list();
  };

  return (
    <PageWrapper>
      <HeaderWrapper className="align-items-center h-auto py-3">
        <span className="title">
          <Translate id="react.productType.create.label" defaultMessage="Create Product Type" />
        </span>
      </HeaderWrapper>
      <form onSubmit={handleSubmit(onSubmit)} className="p-3">
        <Section
          title={{ label: 'react.productType.detailsSection.label', defaultMessage: 'Product Type Details' }}
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
                    title={{ id: 'react.productType.name.label', defaultMessage: 'Name' }}
                    required
                    errorMessage={errors.name?.message}
                    {...field}
                  />
                )}
              />
            </div>
            <div className="col-lg-4 col-md-6 px-2 pt-2">
              <TextInput
                title={{ id: 'react.productType.productTypeCode.label', defaultMessage: 'Product Type Code' }}
                disabled
                value="GOOD"
                onChange={() => {}}
              />
            </div>
            <div className="col-lg-4 col-md-6 px-2 pt-2">
              <Controller
                name="productIdentifierFormat"
                control={control}
                render={({ field }) => (
                  <TextInput
                    title={{ id: 'react.productType.productIdentifierFormat.label', defaultMessage: 'Product Identifier Format' }}
                    {...field}
                  />
                )}
              />
            </div>
            <div className="col-lg-4 col-md-6 px-2 pt-2">
              <Controller
                name="sequenceNumber"
                control={control}
                render={({ field }) => (
                  <TextInput
                    title={{ id: 'react.productType.sequenceNumber.label', defaultMessage: 'Sequence Number' }}
                    type="number"
                    {...field}
                  />
                )}
              />
            </div>
            <div className="col-lg-4 col-md-6 px-2 pt-2">
              <Controller
                name="code"
                control={control}
                render={({ field }) => (
                  <TextInput
                    title={{ id: 'react.productType.code.label', defaultMessage: 'Code' }}
                    {...field}
                  />
                )}
              />
            </div>
            <div className="col-lg-4 col-md-6 px-2 pt-2">
              <Controller
                name="supportedActivities"
                control={control}
                render={({ field }) => (
                  <SelectField
                    title={{ id: 'react.productType.supportedActivities.label', defaultMessage: 'Supported Activities' }}
                    options={supportedActivityOptions}
                    multiple
                    {...field}
                  />
                )}
              />
            </div>
            <div className="col-lg-4 col-md-6 px-2 pt-2">
              <SelectField
                title={{ id: 'react.productType.requiredFields.label', defaultMessage: 'Required Fields' }}
                options={requiredFieldOptions}
                multiple
                disabled
                value={requiredFieldOptions}
                onChange={() => {}}
              />
            </div>
            <div className="col-lg-4 col-md-6 px-2 pt-2">
              <Controller
                name="displayedFields"
                control={control}
                render={({ field }) => (
                  <SelectField
                    title={{ id: 'react.productType.displayedFields.label', defaultMessage: 'Displayed Fields' }}
                    options={productFieldOptions}
                    multiple
                    {...field}
                  />
                )}
              />
            </div>
          </div>
        </Section>
        <div className="d-flex gap-8 pt-3">
          <Button
            type="submit"
            defaultLabel="Create"
            label="react.default.button.create.label"
            variant="primary"
            disabled={isSubmitting}
          />
          <Button
            defaultLabel="Cancel"
            label="react.default.button.cancel.label"
            variant="primary-outline"
            onClick={() => { window.location.href = PRODUCT_TYPE_URL.list(); }}
          />
        </div>
      </form>
    </PageWrapper>
  );
};

export default ProductTypeForm;
