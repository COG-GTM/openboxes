import React, { useEffect, useRef, useState } from 'react';

import { useSelector } from 'react-redux';
import { useHistory, useParams } from 'react-router-dom';
import Alert from 'react-s-alert';

import productCatalogApi from 'api/services/ProductCatalogApi';
import Button from 'components/form-elements/Button';
import ProductSelect from 'components/product-select/ProductSelect';
import { INVENTORY_ITEM_URL, PRODUCT_CATALOG_URL } from 'consts/applicationUrls';
import useSpinner from 'hooks/useSpinner';
import useTranslate from 'hooks/useTranslate';
import useTranslation from 'hooks/useTranslation';
import Translate from 'utils/Translate';
import PageWrapper from 'wrappers/PageWrapper';

import './styles.scss';

const ProductCatalogForm = () => {
  useTranslation('productCatalog', 'default');
  const spinner = useSpinner();
  const translate = useTranslate();
  const history = useHistory();
  const { id } = useParams();
  const currentLocationId = useSelector((state) => state.session.currentLocation.id);
  const isEdit = Boolean(id);

  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [active, setActive] = useState(true);
  const [color, setColor] = useState('');
  const [version, setVersion] = useState(null);
  const [items, setItems] = useState([]);
  const [productToAdd, setProductToAdd] = useState(null);
  const [errors, setErrors] = useState([]);
  const importFileRef = useRef(null);

  const applyCatalog = (catalog) => {
    setCode(catalog?.code ?? '');
    setName(catalog?.name ?? '');
    setDescription(catalog?.description ?? '');
    setActive(Boolean(catalog?.active));
    setColor(catalog?.color ?? '');
    setVersion(catalog?.version ?? null);
    setItems(catalog?.productCatalogItems ?? []);
  };

  const applyItems = (catalog) => {
    setItems(catalog?.productCatalogItems ?? []);
    setVersion(catalog?.version ?? null);
  };

  useEffect(() => {
    if (!isEdit) {
      setCode('');
      setName('');
      setDescription('');
      setActive(true);
      setColor('');
      setVersion(null);
      setItems([]);
      return;
    }
    (async () => {
      spinner.show();
      try {
        const { data } = await productCatalogApi.getProductCatalog(id);
        applyCatalog(data?.data);
      } catch (error) {
        Alert.error(error.response?.data?.errorMessage ?? 'Unable to load product catalog');
        history.push(PRODUCT_CATALOG_URL.list());
      } finally {
        spinner.hide();
      }
    })();
  }, [id]);

  const buildPayload = () => ({
    code: code || null,
    name: name || null,
    description: description || null,
    active,
    color: color || null,
    version,
  });

  const onSubmit = async (event) => {
    event.preventDefault();
    setErrors([]);
    spinner.show();
    try {
      if (isEdit) {
        const { data } = await productCatalogApi.updateProductCatalog(id, buildPayload());
        applyCatalog(data?.data);
        Alert.success(translate('react.productCatalog.updated.label', 'Product catalog updated'));
      } else {
        await productCatalogApi.createProductCatalog(buildPayload());
        Alert.success(translate('react.productCatalog.created.label', 'Product catalog created'));
        history.push(PRODUCT_CATALOG_URL.list());
      }
    } catch (error) {
      const errorMessages = error.response?.data?.errorMessages
        ?? [error.response?.data?.errorMessage ?? 'Unable to save product catalog'];
      setErrors(errorMessages);
    } finally {
      spinner.hide();
    }
  };

  const onDelete = async () => {
    // eslint-disable-next-line no-alert
    if (!window.confirm(translate('react.default.button.delete.confirm.message', 'Are you sure?'))) {
      return;
    }
    setErrors([]);
    spinner.show();
    try {
      await productCatalogApi.deleteProductCatalog(id);
      Alert.success(translate('react.productCatalog.deleted.label', 'Product catalog deleted'));
      history.push(PRODUCT_CATALOG_URL.list());
    } catch (error) {
      setErrors([error.response?.data?.errorMessage ?? 'Unable to delete product catalog']);
    } finally {
      spinner.hide();
    }
  };

  const onAddItem = async () => {
    if (!productToAdd?.id) {
      return;
    }
    setErrors([]);
    spinner.show();
    try {
      const { data } = await productCatalogApi.addProductCatalogItem(id, {
        product: { id: productToAdd.id },
      });
      applyItems(data?.data);
      setProductToAdd(null);
    } catch (error) {
      setErrors([error.response?.data?.errorMessage ?? 'Unable to add product to catalog']);
    } finally {
      spinner.hide();
    }
  };

  const onRemoveItem = async (itemId) => {
    setErrors([]);
    spinner.show();
    try {
      const { data } = await productCatalogApi.removeProductCatalogItem(id, itemId);
      applyItems(data?.data);
    } catch (error) {
      setErrors([error.response?.data?.errorMessage ?? 'Unable to remove product from catalog']);
    } finally {
      spinner.hide();
    }
  };

  const onImport = async (event) => {
    event.preventDefault();
    const file = importFileRef.current?.files?.[0];
    if (!file) {
      return;
    }
    setErrors([]);
    spinner.show();
    try {
      const formData = new FormData();
      formData.append('importFile', file);
      const { data } = await productCatalogApi.importProductCatalogItems(id, formData);
      applyItems(data?.data);
      importFileRef.current.value = '';
      Alert.success(translate('react.productCatalog.imported.label', 'Product catalog items imported'));
    } catch (error) {
      setErrors([error.response?.data?.errorMessage ?? 'Unable to import product catalog items']);
    } finally {
      spinner.hide();
    }
  };

  return (
    <PageWrapper>
      <div className="d-flex flex-column product-catalog-page p-3">
        <h3 className="mb-3" data-testid="product-catalog-form-title">
          {isEdit
            ? <Translate id="react.productCatalog.edit.title.label" defaultMessage="Edit Product Catalog" />
            : <Translate id="react.productCatalog.create.title.label" defaultMessage="Create Product Catalog" />}
        </h3>
        <div className="d-flex mb-3 gap-8">
          <a className="btn btn-outline-primary" href={PRODUCT_CATALOG_URL.list()}>
            <Translate id="react.productCatalog.list.title.label" defaultMessage="Product Catalogs" />
          </a>
          <a className="btn btn-outline-primary" href={PRODUCT_CATALOG_URL.create()}>
            <Translate id="react.productCatalog.add.label" defaultMessage="Add Product Catalog" />
          </a>
          {isEdit && (
            <a className="btn btn-outline-primary" href={PRODUCT_CATALOG_URL.export(id)}>
              <Translate id="react.productCatalog.export.label" defaultMessage="Export Product Catalog" />
            </a>
          )}
        </div>
        {errors.length > 0 && (
          <div className="alert alert-danger" data-testid="product-catalog-errors">
            <ul className="mb-0">
              {errors.map((errorMessage) => <li key={errorMessage}>{errorMessage}</li>)}
            </ul>
          </div>
        )}
        <form className="product-catalog-form" onSubmit={onSubmit} data-testid="product-catalog-form">
          <div className="form-group form-check">
            <input
              id="active"
              type="checkbox"
              className="form-check-input"
              data-testid="catalog-active-checkbox"
              checked={active}
              onChange={(event) => setActive(event.target.checked)}
            />
            <label className="form-check-label" htmlFor="active">
              {translate('react.productCatalog.active.label', 'Active')}
            </label>
          </div>
          <div className="form-group">
            <label htmlFor="code">
              {translate('react.productCatalog.code.label', 'Code')}
            </label>
            <input
              id="code"
              type="text"
              className="form-control"
              data-testid="catalog-code-input"
              value={code}
              onChange={(event) => setCode(event.target.value)}
            />
          </div>
          <div className="form-group">
            <label htmlFor="name">
              {translate('react.productCatalog.name.label', 'Name')}
            </label>
            <input
              id="name"
              type="text"
              className="form-control"
              data-testid="catalog-name-input"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </div>
          <div className="form-group">
            <label htmlFor="description">
              {translate('react.productCatalog.description.label', 'Description')}
            </label>
            <textarea
              id="description"
              className="form-control"
              data-testid="catalog-description-input"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </div>
          <div className="form-group">
            <label htmlFor="color">
              {translate('react.productCatalog.color.label', 'Color')}
            </label>
            <input
              id="color"
              type="text"
              className="form-control"
              data-testid="catalog-color-input"
              value={color}
              onChange={(event) => setColor(event.target.value)}
            />
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
                onClick={onDelete}
              />
            )}
            <a className="btn btn-outline-secondary" href={PRODUCT_CATALOG_URL.list()}>
              <Translate id="react.default.button.cancel.label" defaultMessage="Cancel" />
            </a>
          </div>
        </form>
        {isEdit && (
          <div className="mt-4" data-testid="product-catalog-items-section">
            <h4>
              <Translate id="react.productCatalog.items.label" defaultMessage="Product Catalog Items" />
            </h4>
            <table className="table table-sm" data-testid="product-catalog-items-table">
              <thead>
                <tr>
                  <th>{translate('react.productCatalog.item.productCode.label', 'Code')}</th>
                  <th>{translate('react.productCatalog.item.name.label', 'Name')}</th>
                  <th>{translate('react.productCatalog.item.category.label', 'Category')}</th>
                  <th>{translate('react.default.actions.label', 'Actions')}</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td>{item.product?.productCode}</td>
                    <td>
                      <a href={INVENTORY_ITEM_URL.showStockCard(item.product?.id)}>
                        {item.product?.name}
                      </a>
                    </td>
                    <td>{item.product?.category?.name}</td>
                    <td>
                      <Button
                        type="button"
                        label="react.default.button.delete.label"
                        defaultLabel="Delete"
                        variant="danger"
                        onClick={() => onRemoveItem(item.id)}
                      />
                    </td>
                  </tr>
                ))}
                {!items.length && (
                  <tr>
                    <td colSpan={4} className="text-center">
                      <Translate id="react.default.empty.label" defaultMessage="Empty" />
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            <div className="d-flex align-items-end gap-8 mb-3">
              <div className="flex-grow-1" data-testid="catalog-add-product-select">
                <label htmlFor="catalog-product-select">
                  {translate('react.productCatalog.addProduct.label', 'Search for a product to add')}
                </label>
                <ProductSelect
                  id="catalog-product-select"
                  locationId={currentLocationId}
                  value={productToAdd}
                  onChange={(value) => setProductToAdd(value)}
                />
              </div>
              <Button
                type="button"
                label="react.default.button.add.label"
                defaultLabel="Add"
                variant="primary"
                onClick={onAddItem}
              />
            </div>
            <form className="d-flex align-items-end gap-8" onSubmit={onImport} data-testid="product-catalog-import-form">
              <div className="d-flex flex-column">
                <label htmlFor="catalog-import-file">
                  {translate('react.productCatalog.import.label', 'Import Product Catalog Items')}
                </label>
                <input
                  id="catalog-import-file"
                  type="file"
                  ref={importFileRef}
                  data-testid="catalog-import-file"
                />
              </div>
              <Button
                type="submit"
                label="react.default.button.import.label"
                defaultLabel="Import"
                variant="primary-outline"
              />
            </form>
          </div>
        )}
      </div>
    </PageWrapper>
  );
};

export default ProductCatalogForm;
