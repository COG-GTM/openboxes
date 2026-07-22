import React, { useEffect, useState } from 'react';

import Alert from 'react-s-alert';

import categoryApi from 'api/services/CategoryApi';
import productApi from 'api/services/ProductApi';
import userApi from 'api/services/UserApi';
import Button from 'components/form-elements/Button';
import useQueryParams from 'hooks/useQueryParams';
import useSpinner from 'hooks/useSpinner';
import useTranslate from 'hooks/useTranslate';
import useTranslation from 'hooks/useTranslation';
import Translate from 'utils/Translate';
import PageWrapper from 'wrappers/PageWrapper';

import './styles.scss';

const emptyFilters = {
  categoryId: '',
  includeCategoryChildren: false,
  name: '',
  productCode: '',
  productCodeIsNull: false,
  unitOfMeasure: '',
  unitOfMeasureIsNull: false,
  brandName: '',
  brandNameIsNull: false,
  manufacturer: '',
  manufacturerIsNull: false,
  manufacturerCode: '',
  manufacturerCodeIsNull: false,
  vendor: '',
  vendorIsNull: false,
  vendorCode: '',
  vendorCodeIsNull: false,
  createdById: '',
  updatedById: '',
  max: '10',
};

export const buildBatchEditParams = (filters) => {
  const params = {};
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== '' && value !== false && value != null) {
      params[key] = value;
    }
  });
  return params;
};

const ProductBatchEdit = () => {
  useTranslation('product', 'default');
  const queryParams = useQueryParams();
  const spinner = useSpinner();
  const translate = useTranslate();

  const [filters, setFilters] = useState({ ...emptyFilters, ...queryParams });
  const [categories, setCategories] = useState([]);
  const [users, setUsers] = useState([]);
  const [products, setProducts] = useState(null);
  const [totalCount, setTotalCount] = useState(0);
  const [errors, setErrors] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const [categoryResponse, userResponse] = await Promise.all([
          categoryApi.getCategoryOptions(),
          userApi.getUsersOptions(),
        ]);
        setCategories(categoryResponse.data?.data ?? []);
        setUsers(userResponse.data?.data ?? []);
      } catch (error) {
        Alert.error(error.response?.data?.errorMessage ?? 'Unable to load filter options');
      }
    })();
  }, []);

  const setFilter = (field, value) => {
    setFilters((previousFilters) => ({ ...previousFilters, [field]: value }));
  };

  const fetchProducts = async () => {
    spinner.show();
    setErrors([]);
    try {
      const { data } = await productApi.getBatchEditProducts({
        params: buildBatchEditParams(filters),
      });
      setProducts(data?.data ?? []);
      setTotalCount(data?.totalCount ?? 0);
    } catch (error) {
      Alert.error(error.response?.data?.errorMessage ?? 'Unable to load products');
    } finally {
      spinner.hide();
    }
  };

  useEffect(() => {
    if (queryParams.categoryId || queryParams.tagId) {
      fetchProducts();
    }
  }, []);

  const onSearch = (event) => {
    event.preventDefault();
    fetchProducts();
  };

  const setProductField = (index, field, value) => {
    setProducts((previousProducts) => previousProducts.map((product, productIndex) =>
      (productIndex === index ? { ...product, [field]: value } : product)));
  };

  const onSave = async () => {
    setErrors([]);
    spinner.show();
    try {
      const { data } = await productApi.batchSaveProducts({
        products: products.map((product) => ({
          id: product.id,
          productCode: product.productCode,
          name: product.name,
          category: product.category?.id ? { id: product.category.id } : null,
          manufacturer: product.manufacturer,
          manufacturerCode: product.manufacturerCode,
          brandName: product.brandName,
          unitOfMeasure: product.unitOfMeasure,
          coldChain: product.coldChain,
        })),
      });
      Alert.success(translate(
        'react.product.batchEdit.saved.message',
        `Saved ${data?.savedCount} product(s)`,
      ));
      fetchProducts();
    } catch (error) {
      const errorMessages = error.response?.data?.errorMessages
        ?? [error.response?.data?.errorMessage ?? 'Unable to save products'];
      setErrors(errorMessages);
      spinner.hide();
      return;
    }
    spinner.hide();
  };

  const textFilter = (field, labelId, defaultLabel, isNullField = null) => (
    <div className="form-group row mb-1" key={field}>
      <label className="col-sm-4 col-form-label py-0" htmlFor={field}>
        <Translate id={labelId} defaultMessage={defaultLabel} />
      </label>
      <div className="col-sm-8 d-flex align-items-center gap-8">
        <input
          id={field}
          type="text"
          className="form-control form-control-sm"
          value={filters[field] ?? ''}
          onChange={(event) => setFilter(field, event.target.value)}
        />
        {isNullField && (
          <label className="mb-0 text-nowrap" htmlFor={isNullField}>
            <input
              id={isNullField}
              type="checkbox"
              checked={filters[isNullField] === true || filters[isNullField] === 'on'}
              onChange={(event) => setFilter(isNullField, event.target.checked)}
            />
            {' '}
            <Translate id="react.product.batchEdit.isNull.label" defaultMessage="Is empty" />
          </label>
        )}
      </div>
    </div>
  );

  return (
    <PageWrapper>
      <div className="d-flex flex-column product-page p-3">
        <h3 className="mb-3" data-testid="batch-edit-title">
          <Translate id="react.product.batchEdit.title.label" defaultMessage="Batch edit product" />
        </h3>
        <form className="card p-3 mb-3 product-batch-edit-filters" onSubmit={onSearch} data-testid="batch-edit-filters">
          <div className="form-group row mb-1">
            <label className="col-sm-4 col-form-label py-0" htmlFor="categoryId">
              <Translate id="react.product.category.label" defaultMessage="Category" />
            </label>
            <div className="col-sm-8 d-flex align-items-center gap-8">
              <select
                id="categoryId"
                className="form-control form-control-sm"
                value={filters.categoryId ?? ''}
                onChange={(event) => setFilter('categoryId', event.target.value)}
              >
                <option value="" aria-label="empty" />
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>{category.label}</option>
                ))}
              </select>
              <label className="mb-0 text-nowrap" htmlFor="includeCategoryChildren">
                <input
                  id="includeCategoryChildren"
                  type="checkbox"
                  checked={filters.includeCategoryChildren === true || filters.includeCategoryChildren === 'on'}
                  onChange={(event) => setFilter('includeCategoryChildren', event.target.checked)}
                />
                {' '}
                <Translate id="react.product.batchEdit.includeCategoryChildren.label" defaultMessage="Include subcategories" />
              </label>
            </div>
          </div>
          {textFilter('name', 'react.product.name.label', 'Product Name')}
          {textFilter('productCode', 'react.product.productCode.label', 'Product Code', 'productCodeIsNull')}
          {textFilter('unitOfMeasure', 'react.product.unitOfMeasure.label', 'Unit of Measure', 'unitOfMeasureIsNull')}
          {textFilter('brandName', 'react.product.brandName.label', 'Brand', 'brandNameIsNull')}
          {textFilter('manufacturer', 'react.product.manufacturer.label', 'Manufacturer', 'manufacturerIsNull')}
          {textFilter('manufacturerCode', 'react.product.manufacturerCode.label', 'Manufacturer Code', 'manufacturerCodeIsNull')}
          {textFilter('vendor', 'react.product.vendor.label', 'Vendor', 'vendorIsNull')}
          {textFilter('vendorCode', 'react.product.vendorCode.label', 'Vendor Code', 'vendorCodeIsNull')}
          <div className="form-group row mb-1">
            <label className="col-sm-4 col-form-label py-0" htmlFor="createdById">
              <Translate id="react.product.createdBy.label" defaultMessage="Created By" />
            </label>
            <div className="col-sm-8">
              <select
                id="createdById"
                className="form-control form-control-sm"
                value={filters.createdById ?? ''}
                onChange={(event) => setFilter('createdById', event.target.value)}
              >
                <option value="" aria-label="empty" />
                {users.map((user) => (
                  <option key={user.id} value={user.id}>{user.name ?? user.label}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="form-group row mb-1">
            <label className="col-sm-4 col-form-label py-0" htmlFor="updatedById">
              <Translate id="react.product.updatedBy.label" defaultMessage="Updated By" />
            </label>
            <div className="col-sm-8">
              <select
                id="updatedById"
                className="form-control form-control-sm"
                value={filters.updatedById ?? ''}
                onChange={(event) => setFilter('updatedById', event.target.value)}
              >
                <option value="" aria-label="empty" />
                {users.map((user) => (
                  <option key={user.id} value={user.id}>{user.name ?? user.label}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="form-group row mb-1">
            <label className="col-sm-4 col-form-label py-0" htmlFor="max">
              <Translate id="react.product.batchEdit.max.label" defaultMessage="Max results" />
            </label>
            <div className="col-sm-8">
              <select
                id="max"
                className="form-control form-control-sm"
                value={filters.max ?? '10'}
                onChange={(event) => setFilter('max', event.target.value)}
              >
                {['10', '25', '50', '100'].map((max) => (
                  <option key={max} value={max}>{max}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <Button
              type="submit"
              label="react.default.button.search.label"
              defaultLabel="Search"
              variant="primary"
            />
          </div>
        </form>
        {errors.length > 0 && (
          <div className="alert alert-danger" role="alert" aria-label="error-message">
            <ul className="mb-0">
              {errors.map((error) => <li key={error}>{error}</li>)}
            </ul>
          </div>
        )}
        {products !== null && (
          <>
            <div className="mb-2" data-testid="batch-edit-results-count">
              <Translate id="react.default.results.label" defaultMessage="Results" />
              {`: ${totalCount}`}
            </div>
            <div className="table-responsive">
              <table className="table table-sm" data-testid="batch-edit-table">
                <thead>
                  <tr>
                    <th>{translate('react.product.productCode.label', 'Product Code')}</th>
                    <th>{translate('react.product.name.label', 'Product Name')}</th>
                    <th>{translate('react.product.category.label', 'Category')}</th>
                    <th>{translate('react.product.manufacturer.label', 'Manufacturer')}</th>
                    <th>{translate('react.product.manufacturerCode.label', 'Manufacturer Code')}</th>
                    <th>{translate('react.product.brandName.label', 'Brand')}</th>
                    <th>{translate('react.product.unitOfMeasure.label', 'UoM')}</th>
                    <th>{translate('react.product.coldChain.label', 'Cold Chain')}</th>
                    <th>{translate('react.product.createdBy.label', 'Created By')}</th>
                    <th>{translate('react.product.updatedBy.label', 'Updated By')}</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((product, index) => (
                    <tr key={product.id}>
                      <td>
                        <input
                          type="text"
                          className="form-control form-control-sm"
                          aria-label="productCode"
                          value={product.productCode ?? ''}
                          onChange={(event) => setProductField(index, 'productCode', event.target.value)}
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          className="form-control form-control-sm"
                          aria-label="name"
                          value={product.name ?? ''}
                          onChange={(event) => setProductField(index, 'name', event.target.value)}
                        />
                      </td>
                      <td>
                        <select
                          className="form-control form-control-sm"
                          aria-label="category"
                          value={product.category?.id ?? ''}
                          onChange={(event) => setProductField(index, 'category', { id: event.target.value })}
                        >
                          <option value="" aria-label="empty" />
                          {categories.map((category) => (
                            <option key={category.id} value={category.id}>{category.label}</option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <input
                          type="text"
                          className="form-control form-control-sm"
                          aria-label="manufacturer"
                          value={product.manufacturer ?? ''}
                          onChange={(event) => setProductField(index, 'manufacturer', event.target.value)}
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          className="form-control form-control-sm"
                          aria-label="manufacturerCode"
                          value={product.manufacturerCode ?? ''}
                          onChange={(event) => setProductField(index, 'manufacturerCode', event.target.value)}
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          className="form-control form-control-sm"
                          aria-label="brandName"
                          value={product.brandName ?? ''}
                          onChange={(event) => setProductField(index, 'brandName', event.target.value)}
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          className="form-control form-control-sm"
                          aria-label="unitOfMeasure"
                          value={product.unitOfMeasure ?? ''}
                          onChange={(event) => setProductField(index, 'unitOfMeasure', event.target.value)}
                        />
                      </td>
                      <td className="text-center">
                        <input
                          type="checkbox"
                          aria-label="coldChain"
                          checked={Boolean(product.coldChain)}
                          onChange={(event) => setProductField(index, 'coldChain', event.target.checked)}
                        />
                      </td>
                      <td>{product.createdBy}</td>
                      <td>{product.updatedBy}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {products.length > 0 && (
              <div>
                <Button
                  label="react.default.button.save.label"
                  defaultLabel="Save"
                  variant="primary"
                  onClick={onSave}
                />
              </div>
            )}
          </>
        )}
      </div>
    </PageWrapper>
  );
};

export default ProductBatchEdit;
