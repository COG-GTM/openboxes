import React, { useEffect, useState } from 'react';

import { confirmAlert } from 'react-confirm-alert';
import { Controller, useForm } from 'react-hook-form';
import { useDispatch } from 'react-redux';
import { useHistory, useParams } from 'react-router-dom';

import { hideSpinner, showSpinner } from 'actions';
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

const ProductTypeEdit = () => {
  useTranslation('productType', 'default');

  const { productTypeId } = useParams();
  const history = useHistory();
  const dispatch = useDispatch();
  const translate = useTranslate();

  const [productType, setProductType] = useState(null);
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

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    mode: 'onBlur',
    defaultValues: {
      name: '',
      sequenceNumber: '0',
      supportedActivities: [],
      displayedFields: [],
    },
  });

  useEffect(() => {
    if (!productType || !supportedActivityOptions.length || !productFieldOptions.length) {
      return;
    }
    reset({
      name: productType.name ?? '',
      sequenceNumber: `${productType.sequenceNumber ?? 0}`,
      supportedActivities: supportedActivityOptions
        .filter((option) => (productType.supportedActivities ?? []).includes(option.id)),
      displayedFields: productFieldOptions
        .filter((option) => (productType.displayedFields ?? []).includes(option.id)),
    });
  }, [productType, supportedActivityOptions, productFieldOptions]);

  useEffect(() => {
    productTypeApi.getProductType(productTypeId)
      .then((response) => setProductType(response?.data?.data));
  }, [productTypeId]);

  const requiredFieldOptions = productFieldOptions
    .filter((option) => (productType?.requiredFields ?? []).includes(option.id));

  const onSubmit = async (values) => {
    try {
      await productTypeApi.updateProductType(productTypeId, {
        name: values.name,
        sequenceNumber: values.sequenceNumber,
        supportedActivities: (values.supportedActivities ?? []).map((option) => option.id),
        displayedFields: (values.displayedFields ?? []).map((option) => option.id),
      });
    } catch (error) {
      // apiClient's response interceptor already notifies the user
      return;
    }
    notification(NotificationType.SUCCESS)({
      message: translate('react.productType.update.success.label', 'Product type has been updated successfully'),
    });
    history.push(PRODUCT_TYPE_URL.list());
  };

  const deleteProductType = async () => {
    dispatch(showSpinner());
    try {
      const { status } = await productTypeApi.deleteProductType(productTypeId);
      if (status === 204) {
        notification(NotificationType.SUCCESS)({
          message: translate('react.productType.delete.success.label', 'Product type has been deleted successfully'),
        });
        history.push(PRODUCT_TYPE_URL.list());
      }
    } finally {
      dispatch(hideSpinner());
    }
  };

  const onDelete = () => {
    confirmAlert({
      title: translate('react.default.areYouSure.label', 'Are you sure?'),
      message: translate(
        'react.productType.delete.confirm.label',
        'Are you sure you want to delete this product type?',
      ),
      buttons: [
        {
          label: translate('react.default.yes.label', 'Yes'),
          onClick: deleteProductType,
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
          <Translate id="react.productType.edit.label" defaultMessage="Edit Product Type" />
          {productType?.name ? ` - ${productType.name}` : ''}
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
                value={productType?.productTypeCode ?? ''}
                onChange={() => {}}
              />
            </div>
            {/* The legacy edit screen only shows the (read-only) identifier
                format when the type has no products yet */}
            {productType?.productCount === 0 && (
              <div className="col-lg-4 col-md-6 px-2 pt-2">
                <TextInput
                  title={{ id: 'react.productType.productIdentifierFormat.label', defaultMessage: 'Product Identifier Format' }}
                  disabled
                  value={productType?.productIdentifierFormat ?? ''}
                  onChange={() => {}}
                />
              </div>
            )}
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
            onClick={() => history.push(PRODUCT_TYPE_URL.list())}
          />
        </div>
      </form>
    </PageWrapper>
  );
};

export default ProductTypeEdit;
