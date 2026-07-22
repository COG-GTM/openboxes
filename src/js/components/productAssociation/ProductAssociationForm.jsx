import React, { useEffect, useState } from 'react';

import { useSelector } from 'react-redux';
import { useHistory, useParams } from 'react-router-dom';
import Alert from 'react-s-alert';

import productAssociationApi from 'api/services/ProductAssociationApi';
import Button from 'components/form-elements/Button';
import ProductSelect from 'components/product-select/ProductSelect';
import { PRODUCT_ASSOCIATION_URL } from 'consts/applicationUrls';
import useSpinner from 'hooks/useSpinner';
import useTranslate from 'hooks/useTranslate';
import useTranslation from 'hooks/useTranslation';
import Translate from 'utils/Translate';
import PageWrapper from 'wrappers/PageWrapper';

import './styles.scss';

const ProductAssociationForm = () => {
  useTranslation('product', 'default');
  const spinner = useSpinner();
  const translate = useTranslate();
  const history = useHistory();
  const { id } = useParams();
  const currentLocationId = useSelector((state) => state.session.currentLocation.id);
  const isEdit = Boolean(id);

  const [typeOptions, setTypeOptions] = useState([]);
  const [code, setCode] = useState('');
  const [product, setProduct] = useState(null);
  const [associatedProduct, setAssociatedProduct] = useState(null);
  const [quantity, setQuantity] = useState('');
  const [comments, setComments] = useState('');
  const [hasMutualAssociation, setHasMutualAssociation] = useState(false);
  const [hadMutualAssociation, setHadMutualAssociation] = useState(false);
  const [version, setVersion] = useState(null);
  const [errors, setErrors] = useState([]);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await productAssociationApi.getTypeCodeOptions();
        setTypeOptions(data?.data ?? []);
        if (!isEdit && data?.data?.length) {
          setCode((previousCode) => previousCode || data.data[0].value);
        }
      } catch (error) {
        Alert.error(error.response?.data?.errorMessage ?? 'Unable to load association types');
      }
    })();
  }, []);

  useEffect(() => {
    if (!isEdit) {
      return;
    }
    (async () => {
      spinner.show();
      try {
        const { data } = await productAssociationApi.getProductAssociation(id);
        const association = data?.data;
        setCode(association?.code ?? '');
        setProduct(association?.product ? {
          id: association.product.id,
          value: association.product.id,
          label: `${association.product.productCode} - ${association.product.name}`,
          ...association.product,
        } : null);
        setAssociatedProduct(association?.associatedProduct ? {
          id: association.associatedProduct.id,
          value: association.associatedProduct.id,
          label: `${association.associatedProduct.productCode} - ${association.associatedProduct.name}`,
          ...association.associatedProduct,
        } : null);
        setQuantity(association?.quantity ?? '');
        setComments(association?.comments ?? '');
        setHasMutualAssociation(Boolean(association?.hasMutualAssociation));
        setHadMutualAssociation(Boolean(association?.hasMutualAssociation));
        setVersion(association?.version ?? null);
      } catch (error) {
        Alert.error(error.response?.data?.errorMessage ?? 'Unable to load product association');
        history.push(PRODUCT_ASSOCIATION_URL.list());
      } finally {
        spinner.hide();
      }
    })();
  }, [id]);

  const buildPayload = () => ({
    code: code || null,
    product: product?.id ? { id: product.id } : null,
    associatedProduct: associatedProduct?.id ? { id: associatedProduct.id } : null,
    quantity: quantity === '' ? null : quantity,
    comments: comments || null,
    hasMutualAssociation,
    version,
  });

  const onSubmit = async (event) => {
    event.preventDefault();
    setErrors([]);
    spinner.show();
    try {
      if (isEdit) {
        await productAssociationApi.updateProductAssociation(id, buildPayload());
        Alert.success(translate('react.productAssociation.updated.label', 'Product association updated'));
      } else {
        await productAssociationApi.createProductAssociation(buildPayload());
        Alert.success(translate('react.productAssociation.created.label', 'Product association created'));
      }
      history.push(PRODUCT_ASSOCIATION_URL.list());
    } catch (error) {
      const errorMessages = error.response?.data?.errorMessages
        ?? [error.response?.data?.errorMessage ?? 'Unable to save product association'];
      setErrors(errorMessages);
    } finally {
      spinner.hide();
    }
  };

  const onDelete = async (mutualDelete) => {
    setErrors([]);
    spinner.show();
    try {
      await productAssociationApi.deleteProductAssociation(id, mutualDelete);
      Alert.success(translate('react.productAssociation.deleted.label', 'Product association deleted'));
      history.push(PRODUCT_ASSOCIATION_URL.list());
    } catch (error) {
      setErrors([error.response?.data?.errorMessage ?? 'Unable to delete product association']);
    } finally {
      setShowDeleteDialog(false);
      spinner.hide();
    }
  };

  const onDeleteClick = () => {
    if (hadMutualAssociation) {
      setShowDeleteDialog(true);
      return;
    }
    // eslint-disable-next-line no-alert
    if (window.confirm(translate('react.default.button.delete.confirm.message', 'Are you sure?'))) {
      onDelete(null);
    }
  };

  return (
    <PageWrapper>
      <div className="d-flex flex-column product-association-page p-3">
        <h3 className="mb-3" data-testid="product-association-form-title">
          {isEdit
            ? <Translate id="react.productAssociation.edit.title.label" defaultMessage="Edit Product Association" />
            : <Translate id="react.productAssociation.create.title.label" defaultMessage="Create Product Association" />}
        </h3>
        <div className="d-flex mb-3 gap-8">
          <a className="btn btn-outline-primary" href={PRODUCT_ASSOCIATION_URL.list()}>
            <Translate id="react.productAssociation.list.title.label" defaultMessage="Product Associations" />
          </a>
          <a className="btn btn-outline-primary" href={PRODUCT_ASSOCIATION_URL.create()}>
            <Translate id="react.productAssociation.add.label" defaultMessage="Add association" />
          </a>
        </div>
        {errors.length > 0 && (
          <div className="alert alert-danger" data-testid="product-association-errors">
            <ul className="mb-0">
              {errors.map((errorMessage) => <li key={errorMessage}>{errorMessage}</li>)}
            </ul>
          </div>
        )}
        <form className="product-association-form" onSubmit={onSubmit} data-testid="product-association-form">
          <div className="form-group">
            <label htmlFor="code">
              {translate('react.productAssociation.code.label', 'Code')}
            </label>
            <select
              id="code"
              className="form-control"
              data-testid="association-code-select"
              value={code}
              onChange={(event) => setCode(event.target.value)}
            >
              {typeOptions.map((option) => (
                <option key={option.id} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="product">
              {translate('react.productAssociation.product.label', 'Product')}
            </label>
            <div data-testid="association-product-select">
              <ProductSelect
                id="product"
                locationId={currentLocationId}
                value={product}
                onChange={(value) => setProduct(value)}
              />
            </div>
          </div>
          <div className="form-group">
            <label htmlFor="associatedProduct">
              {translate('react.productAssociation.associatedProduct.label', 'Associated Product')}
            </label>
            <div data-testid="association-associated-product-select">
              <ProductSelect
                id="associatedProduct"
                locationId={currentLocationId}
                value={associatedProduct}
                onChange={(value) => setAssociatedProduct(value)}
              />
            </div>
          </div>
          <div className="form-group">
            <label htmlFor="quantity">
              {translate('react.productAssociation.quantity.label', 'Quantity')}
            </label>
            <input
              id="quantity"
              type="number"
              step="any"
              className="form-control"
              data-testid="association-quantity-input"
              value={quantity}
              onChange={(event) => setQuantity(event.target.value)}
            />
          </div>
          <div className="form-group">
            <label htmlFor="comments">
              {translate('react.productAssociation.comments.label', 'Comments')}
            </label>
            <textarea
              id="comments"
              className="form-control"
              data-testid="association-comments-input"
              value={comments}
              onChange={(event) => setComments(event.target.value)}
            />
          </div>
          <div className="form-group form-check">
            <input
              id="hasMutualAssociation"
              type="checkbox"
              className="form-check-input"
              data-testid="association-mutual-checkbox"
              checked={hasMutualAssociation}
              onChange={(event) => setHasMutualAssociation(event.target.checked)}
            />
            <label className="form-check-label" htmlFor="hasMutualAssociation">
              {translate('react.productAssociation.mutualAssociation.label', 'Two-way Association')}
            </label>
          </div>
          <div className="d-flex gap-8">
            <Button
              type="submit"
              label={isEdit ? 'react.default.button.update.label' : 'react.default.button.create.label'}
              defaultLabel={isEdit ? 'Update' : 'Create'}
              variant="primary"
            />
            {isEdit && (
              <Button
                type="button"
                label="react.default.button.delete.label"
                defaultLabel="Delete"
                variant="danger"
                onClick={onDeleteClick}
              />
            )}
            <a className="btn btn-outline-secondary" href={PRODUCT_ASSOCIATION_URL.list()}>
              <Translate id="react.default.button.cancel.label" defaultMessage="Cancel" />
            </a>
          </div>
        </form>
        {showDeleteDialog && (
          <div className="product-association-delete-dialog card p-3 mt-3" data-testid="association-delete-dialog">
            <p>
              <Translate
                id="react.productAssociation.delete.mutual.message"
                defaultMessage="This association is two-way. Do you also want to delete the mutual association?"
              />
            </p>
            <div className="d-flex gap-8">
              <Button
                type="button"
                label="react.productAssociation.delete.both.label"
                defaultLabel="Delete both associations"
                variant="danger"
                onClick={() => onDelete(true)}
              />
              <Button
                type="button"
                label="react.productAssociation.delete.onlyThis.label"
                defaultLabel="Delete only this association"
                variant="danger"
                onClick={() => onDelete(false)}
              />
              <Button
                type="button"
                label="react.default.button.cancel.label"
                defaultLabel="Cancel"
                variant="primary-outline"
                onClick={() => setShowDeleteDialog(false)}
              />
            </div>
          </div>
        )}
      </div>
    </PageWrapper>
  );
};

export default ProductAssociationForm;
