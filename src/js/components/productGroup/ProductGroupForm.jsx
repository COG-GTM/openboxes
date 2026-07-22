import React, { useEffect, useState } from 'react';

import { confirmAlert } from 'react-confirm-alert';
import { Controller, useForm } from 'react-hook-form';
import { useDispatch } from 'react-redux';
import { useHistory, useParams } from 'react-router-dom';

import { hideSpinner, showSpinner } from 'actions';
import categoryApi from 'api/services/CategoryApi';
import productGroupApi from 'api/services/ProductGroupApi';
import Button from 'components/form-elements/Button';
import SelectField from 'components/form-elements/v2/SelectField';
import TextInput from 'components/form-elements/v2/TextInput';
import notification from 'components/Layout/notifications/notification';
import Section from 'components/Layout/v2/Section';
import ProductSelect from 'components/product-select/ProductSelect';
import { INVENTORY_ITEM_URL, PRODUCT_GROUP_URL } from 'consts/applicationUrls';
import NotificationType from 'consts/notificationTypes';
import useTranslate from 'hooks/useTranslate';
import useTranslation from 'hooks/useTranslation';
import Translate from 'utils/Translate';
import HeaderWrapper from 'wrappers/HeaderWrapper';
import PageWrapper from 'wrappers/PageWrapper';

const ProductGroupForm = () => {
  useTranslation('productGroup', 'default');

  const { productGroupId } = useParams();
  const history = useHistory();
  const dispatch = useDispatch();
  const translate = useTranslate();

  const [categoryOptions, setCategoryOptions] = useState([]);
  const [productGroup, setProductGroup] = useState(null);
  const [productToAdd, setProductToAdd] = useState(null);
  const [siblingToAdd, setSiblingToAdd] = useState(null);

  useEffect(() => {
    categoryApi.getCategoryOptions()
      .then((response) => {
        setCategoryOptions(response?.data?.data?.map((option) => ({
          id: option.id,
          value: option.id,
          label: option.label,
        })) ?? []);
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
      category: null,
      description: '',
    },
  });

  const applyProductGroup = (data) => {
    setProductGroup(data);
    reset({
      name: data?.name ?? '',
      description: data?.description ?? '',
      category: data?.category
        ? { id: data.category.id, value: data.category.id, label: data.category.name }
        : null,
    });
  };

  useEffect(() => {
    productGroupApi.getProductGroup(productGroupId)
      .then((response) => applyProductGroup(response?.data?.data));
  }, [productGroupId]);

  const onSubmit = async (values) => {
    try {
      await productGroupApi.updateProductGroup(productGroupId, {
        name: values.name,
        description: values.description,
        category: values.category?.id ?? null,
      });
    } catch (error) {
      // apiClient's response interceptor already notifies the user
      return;
    }
    notification(NotificationType.SUCCESS)({
      message: translate('react.productGroup.update.success.label', 'Product group has been updated successfully'),
    });
    history.push(PRODUCT_GROUP_URL.list());
  };

  const deleteProductGroup = async () => {
    dispatch(showSpinner());
    try {
      const { status } = await productGroupApi.deleteProductGroup(productGroupId);
      if (status === 204) {
        notification(NotificationType.SUCCESS)({
          message: translate('react.productGroup.delete.success.label', 'Product group has been deleted successfully'),
        });
        history.push(PRODUCT_GROUP_URL.list());
      }
    } finally {
      dispatch(hideSpinner());
    }
  };

  const onDelete = () => {
    confirmAlert({
      title: translate('react.default.areYouSure.label', 'Are you sure?'),
      message: translate(
        'react.productGroup.delete.confirm.label',
        'Are you sure you want to delete this product group?',
      ),
      buttons: [
        {
          label: translate('react.default.yes.label', 'Yes'),
          onClick: deleteProductGroup,
        },
        {
          label: translate('react.default.no.label', 'No'),
        },
      ],
    });
  };

  const addProduct = async (product, isProductFamily) => {
    if (!product?.id) {
      return;
    }
    dispatch(showSpinner());
    try {
      const response = await productGroupApi.addProduct(productGroupId, {
        productId: product.id,
        isProductFamily,
      });
      setProductGroup(response?.data?.data);
      if (isProductFamily) {
        setSiblingToAdd(null);
      } else {
        setProductToAdd(null);
      }
    } finally {
      dispatch(hideSpinner());
    }
  };

  const removeProduct = async (productId, isProductFamily) => {
    dispatch(showSpinner());
    try {
      const response = await productGroupApi
        .removeProduct(productGroupId, productId, isProductFamily);
      setProductGroup(response?.data?.data);
    } finally {
      dispatch(hideSpinner());
    }
  };

  const renderProductsTable = (products, isProductFamily, testId) => (
    <table className="table table-sm" data-testid={testId}>
      <thead>
        <tr>
          <th aria-label="Code"><Translate id="react.productGroup.column.productCode.label" defaultMessage="Code" /></th>
          <th aria-label="Product"><Translate id="react.productGroup.column.product.label" defaultMessage="Product" /></th>
          <th aria-label="Category"><Translate id="react.productGroup.column.category.label" defaultMessage="Category" /></th>
          <th aria-label="Unit of Measure"><Translate id="react.productGroup.column.unitOfMeasure.label" defaultMessage="Unit of Measure" /></th>
          <th aria-label="Manufacturer"><Translate id="react.productGroup.column.manufacturer.label" defaultMessage="Manufacturer" /></th>
          <th aria-label="Vendor"><Translate id="react.productGroup.column.vendor.label" defaultMessage="Vendor" /></th>
          <th aria-label="Actions"><Translate id="react.default.actions.label" defaultMessage="Actions" /></th>
        </tr>
      </thead>
      <tbody>
        {(products ?? []).map((product) => (
          <tr key={product.id}>
            <td>{product.productCode}</td>
            <td>
              <a href={INVENTORY_ITEM_URL.showStockCard(product.id)}>{product.name}</a>
            </td>
            <td>{product.category}</td>
            <td>{product.unitOfMeasure}</td>
            <td>{product.manufacturer}</td>
            <td>{product.vendor}</td>
            <td>
              <Button
                defaultLabel="Delete"
                label="react.default.button.delete.label"
                variant="danger-outline"
                onClick={() => removeProduct(product.id, isProductFamily)}
              />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  return (
    <PageWrapper>
      <HeaderWrapper className="align-items-center h-auto py-3">
        <span className="title">
          <Translate id="react.productGroup.edit.label" defaultMessage="Edit Product Group" />
          {productGroup?.name ? ` - ${productGroup.name}` : ''}
        </span>
      </HeaderWrapper>
      <div className="p-3">
        <form onSubmit={handleSubmit(onSubmit)}>
          <Section
            title={{ label: 'react.productGroup.detailsSection.label', defaultMessage: 'Product Group Details' }}
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
                      title={{ id: 'react.productGroup.name.label', defaultMessage: 'Name' }}
                      required
                      errorMessage={errors.name?.message}
                      {...field}
                    />
                  )}
                />
              </div>
              <div className="col-lg-4 col-md-6 px-2 pt-2">
                <Controller
                  name="category"
                  control={control}
                  render={({ field }) => (
                    <SelectField
                      title={{ id: 'react.productGroup.category.label', defaultMessage: 'Category' }}
                      options={categoryOptions}
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
                      title={{ id: 'react.productGroup.description.label', defaultMessage: 'Description' }}
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
                onClick={() => history.push(PRODUCT_GROUP_URL.list())}
              />
            </div>
          </Section>
        </form>
        <Section
          title={{ label: 'react.productGroup.productsSection.label', defaultMessage: 'Products' }}
        >
          {renderProductsTable(productGroup?.products, false, 'product-group-products')}
          <div className="d-flex align-items-end gap-8">
            <div className="flex-grow-1" data-testid="product-group-add-product">
              <ProductSelect
                value={productToAdd}
                onChange={(value) => setProductToAdd(value)}
                placeholder={translate('react.productGroup.chooseProduct.label', 'Choose product')}
              />
            </div>
            <Button
              defaultLabel="Add Product"
              label="react.productGroup.addProduct.label"
              variant="primary-outline"
              onClick={() => addProduct(productToAdd, false)}
            />
          </div>
        </Section>
        <Section
          title={{ label: 'react.productGroup.siblingsSection.label', defaultMessage: 'Siblings' }}
        >
          {renderProductsTable(productGroup?.siblings, true, 'product-group-siblings')}
          <div className="d-flex align-items-end gap-8">
            <div className="flex-grow-1" data-testid="product-group-add-sibling">
              <ProductSelect
                value={siblingToAdd}
                onChange={(value) => setSiblingToAdd(value)}
                placeholder={translate('react.productGroup.chooseProduct.label', 'Choose product')}
              />
            </div>
            <Button
              defaultLabel="Add Product"
              label="react.productGroup.addProduct.label"
              variant="primary-outline"
              onClick={() => addProduct(siblingToAdd, true)}
            />
          </div>
        </Section>
      </div>
    </PageWrapper>
  );
};

export default ProductGroupForm;
