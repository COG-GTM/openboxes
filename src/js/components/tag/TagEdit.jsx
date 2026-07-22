import React, { useEffect, useState } from 'react';

import { confirmAlert } from 'react-confirm-alert';
import { Controller, useForm } from 'react-hook-form';
import { useDispatch } from 'react-redux';
import { useHistory, useParams } from 'react-router-dom';

import { hideSpinner, showSpinner } from 'actions';
import tagApi from 'api/services/TagApi';
import Button from 'components/form-elements/Button';
import Checkbox from 'components/form-elements/v2/Checkbox';
import TextInput from 'components/form-elements/v2/TextInput';
import notification from 'components/Layout/notifications/notification';
import Section from 'components/Layout/v2/Section';
import { INVENTORY_ITEM_URL, TAG_URL } from 'consts/applicationUrls';
import NotificationType from 'consts/notificationTypes';
import useTranslate from 'hooks/useTranslate';
import useTranslation from 'hooks/useTranslation';
import Translate from 'utils/Translate';
import HeaderWrapper from 'wrappers/HeaderWrapper';
import PageWrapper from 'wrappers/PageWrapper';

const TagEdit = () => {
  useTranslation('tag', 'default');

  const { tagId } = useParams();
  const history = useHistory();
  const dispatch = useDispatch();
  const translate = useTranslate();

  const [tag, setTag] = useState(null);
  const [productCodesToBeAdded, setProductCodesToBeAdded] = useState('');

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    mode: 'onBlur',
    defaultValues: {
      tag: '',
      isActive: true,
    },
  });

  const applyTag = (data) => {
    setTag(data);
    reset({
      tag: data?.tag ?? '',
      isActive: data?.isActive ?? true,
    });
  };

  useEffect(() => {
    tagApi.getTag(tagId)
      .then((response) => applyTag(response?.data?.data));
  }, [tagId]);

  const onSubmit = async (values) => {
    try {
      await tagApi.updateTag(tagId, {
        tag: values.tag,
        isActive: values.isActive,
      });
    } catch (error) {
      // apiClient's response interceptor already notifies the user
      return;
    }
    notification(NotificationType.SUCCESS)({
      message: translate('react.tag.update.success.label', 'Tag has been updated successfully'),
    });
    history.push(TAG_URL.list());
  };

  const deleteTag = async () => {
    dispatch(showSpinner());
    try {
      const { status } = await tagApi.deleteTag(tagId);
      if (status === 204) {
        notification(NotificationType.SUCCESS)({
          message: translate('react.tag.delete.success.label', 'Tag has been deleted successfully'),
        });
        history.push(TAG_URL.list());
      }
    } finally {
      dispatch(hideSpinner());
    }
  };

  const onDelete = () => {
    confirmAlert({
      title: translate('react.default.areYouSure.label', 'Are you sure?'),
      message: translate(
        'react.tag.delete.confirm.label',
        'Are you sure you want to delete this tag?',
      ),
      buttons: [
        {
          label: translate('react.default.yes.label', 'Yes'),
          onClick: deleteTag,
        },
        {
          label: translate('react.default.no.label', 'No'),
        },
      ],
    });
  };

  const addProducts = async () => {
    if (!productCodesToBeAdded.trim()) {
      return;
    }
    dispatch(showSpinner());
    try {
      const response = await tagApi.addProducts(tagId, {
        productCodes: productCodesToBeAdded,
      });
      setTag(response?.data?.data);
      setProductCodesToBeAdded('');
    } finally {
      dispatch(hideSpinner());
    }
  };

  const removeProduct = async (productId) => {
    dispatch(showSpinner());
    try {
      const response = await tagApi.removeProduct(tagId, productId);
      setTag(response?.data?.data);
    } finally {
      dispatch(hideSpinner());
    }
  };

  return (
    <PageWrapper>
      <HeaderWrapper className="align-items-center h-auto py-3">
        <span className="title">
          <Translate id="react.tag.edit.label" defaultMessage="Edit Tag" />
          {tag?.tag ? ` - ${tag.tag}` : ''}
        </span>
      </HeaderWrapper>
      <div className="p-3">
        <form onSubmit={handleSubmit(onSubmit)}>
          <Section
            title={{ label: 'react.tag.detailsSection.label', defaultMessage: 'Tag Details' }}
          >
            <div className="row">
              <div className="col-lg-4 col-md-6 px-2 pt-2">
                <Controller
                  name="tag"
                  control={control}
                  rules={{
                    required: translate('react.default.error.requiredField.label', 'This field is required'),
                  }}
                  render={({ field }) => (
                    <TextInput
                      title={{ id: 'react.tag.tag.label', defaultMessage: 'Tag' }}
                      required
                      errorMessage={errors.tag?.message}
                      {...field}
                    />
                  )}
                />
              </div>
              <div className="col-lg-4 col-md-6 px-2 pt-2 d-flex align-items-end">
                <Controller
                  name="isActive"
                  control={control}
                  render={({ field }) => (
                    <Checkbox
                      title={{ id: 'react.tag.isActive.label', defaultMessage: 'Is active?' }}
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
                onClick={() => history.push(TAG_URL.list())}
              />
            </div>
          </Section>
        </form>
        <Section
          title={{ label: 'react.tag.productsSection.label', defaultMessage: 'Products' }}
        >
          <table className="table table-sm" data-testid="tag-products">
            <thead>
              <tr>
                <th aria-label="Code"><Translate id="react.tag.column.productCode.label" defaultMessage="Code" /></th>
                <th aria-label="Product"><Translate id="react.tag.column.product.label" defaultMessage="Product" /></th>
                <th aria-label="Actions"><Translate id="react.default.actions.label" defaultMessage="Actions" /></th>
              </tr>
            </thead>
            <tbody>
              {(tag?.products ?? []).map((product) => (
                <tr key={product.id}>
                  <td>{product.productCode}</td>
                  <td>
                    <a href={INVENTORY_ITEM_URL.showStockCard(product.id)}>{product.name}</a>
                  </td>
                  <td>
                    <Button
                      defaultLabel="Delete"
                      label="react.default.button.delete.label"
                      variant="danger-outline"
                      onClick={() => removeProduct(product.id)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="d-flex align-items-end gap-8">
            <div className="flex-grow-1" data-testid="tag-add-products">
              <TextInput
                title={{ id: 'react.tag.productCodes.label', defaultMessage: 'Product codes (comma separated)' }}
                value={productCodesToBeAdded}
                onChange={(e) => setProductCodesToBeAdded(e.target.value)}
              />
            </div>
            <Button
              defaultLabel="Add to products"
              label="react.tag.addToProducts.label"
              variant="primary-outline"
              onClick={addProducts}
            />
          </div>
        </Section>
      </div>
    </PageWrapper>
  );
};

export default TagEdit;
