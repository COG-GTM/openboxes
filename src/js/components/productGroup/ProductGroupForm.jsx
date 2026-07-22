import React, { useEffect, useState } from 'react';

import Alert from 'react-s-alert';

import categoryApi from 'api/services/CategoryApi';
import productGroupApi from 'api/services/ProductGroupApi';
import Button from 'components/form-elements/Button';
import { PRODUCT_GROUP_URL } from 'consts/applicationUrls';
import useSpinner from 'hooks/useSpinner';
import useTranslate from 'hooks/useTranslate';
import useTranslation from 'hooks/useTranslation';
import Translate from 'utils/Translate';
import PageWrapper from 'wrappers/PageWrapper';

import './styles.scss';

const ProductGroupForm = () => {
  useTranslation('productGroup', 'default');
  const spinner = useSpinner();
  const translate = useTranslate();

  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [description, setDescription] = useState('');
  const [categoryOptions, setCategoryOptions] = useState([]);
  const [errors, setErrors] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await categoryApi.getCategoryOptions();
        setCategoryOptions(data?.data ?? []);
      } catch (error) {
        Alert.error(error.response?.data?.errorMessage ?? 'Unable to load categories');
      }
    })();
  }, []);

  const onSubmit = async (event) => {
    event.preventDefault();
    setErrors([]);
    spinner.show();
    try {
      const { data } = await productGroupApi.createProductGroup({
        name: name || null,
        description: description || null,
        category: categoryId ? { id: categoryId } : null,
      });
      Alert.success(translate('react.productGroup.created.label', 'Product group created'));
      // Mirror the legacy save action: continue to the (still legacy) edit screen.
      window.location.assign(PRODUCT_GROUP_URL.edit(data?.data?.id));
    } catch (error) {
      const errorMessages = error.response?.data?.errorMessages
        ?? [error.response?.data?.errorMessage ?? 'Unable to save product group'];
      setErrors(errorMessages);
    } finally {
      spinner.hide();
    }
  };

  return (
    <PageWrapper>
      <div className="d-flex flex-column product-group-page p-3">
        <h3 className="mb-3" data-testid="product-group-form-title">
          <Translate id="react.productGroup.create.title.label" defaultMessage="Create Product Group" />
        </h3>
        <div className="d-flex mb-3 gap-8">
          <a className="btn btn-outline-primary" href={PRODUCT_GROUP_URL.list()}>
            <Translate id="react.productGroup.list.title.label" defaultMessage="Product Groups" />
          </a>
          <a className="btn btn-outline-primary" href={PRODUCT_GROUP_URL.create()}>
            <Translate id="react.productGroup.add.label" defaultMessage="Add Product Group" />
          </a>
        </div>
        {errors.length > 0 && (
          <div className="alert alert-danger" data-testid="product-group-errors">
            <ul className="mb-0">
              {errors.map((errorMessage) => <li key={errorMessage}>{errorMessage}</li>)}
            </ul>
          </div>
        )}
        <form className="product-group-form" onSubmit={onSubmit} data-testid="product-group-form">
          <div className="form-group">
            <label htmlFor="name">
              {translate('react.productGroup.name.label', 'Generic product')}
            </label>
            <input
              id="name"
              type="text"
              className="form-control"
              data-testid="product-group-name-input"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </div>
          <div className="form-group">
            <label htmlFor="category">
              {translate('react.productGroup.category.label', 'Category')}
            </label>
            <select
              id="category"
              className="form-control"
              data-testid="product-group-category-select"
              value={categoryId}
              onChange={(event) => setCategoryId(event.target.value)}
            >
              <option value="" label=" " />
              {categoryOptions.map((option) => (
                <option key={option.id} value={option.id}>{option.label}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="description">
              {translate('react.productGroup.description.label', 'Description')}
            </label>
            <textarea
              id="description"
              className="form-control"
              rows={5}
              data-testid="product-group-description-input"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </div>
          <div className="d-flex gap-8">
            <Button
              type="submit"
              label="react.default.button.create.label"
              defaultLabel="Create"
              variant="primary"
            />
            <a className="btn btn-outline-secondary" href={PRODUCT_GROUP_URL.list()}>
              <Translate id="react.default.button.cancel.label" defaultMessage="Cancel" />
            </a>
          </div>
        </form>
      </div>
    </PageWrapper>
  );
};

export default ProductGroupForm;
