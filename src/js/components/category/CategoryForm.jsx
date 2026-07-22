import React, { useEffect, useState } from 'react';

import { Link, useHistory, useParams } from 'react-router-dom';
import Alert from 'react-s-alert';

import categoryApi from 'api/services/CategoryApi';
import Button from 'components/form-elements/Button';
import { CATEGORY_URL, PRODUCT_URL } from 'consts/applicationUrls';
import useSpinner from 'hooks/useSpinner';
import useTranslate from 'hooks/useTranslate';
import useTranslation from 'hooks/useTranslation';
import Translate from 'utils/Translate';
import PageWrapper from 'wrappers/PageWrapper';

import './styles.scss';

const emptyCategory = {
  name: '',
  isRoot: false,
  sortOrder: 0,
  parentCategory: null,
  categories: [],
  products: [],
};

const CategoryForm = () => {
  useTranslation('category', 'default');
  const history = useHistory();
  const { id } = useParams();
  const spinner = useSpinner();
  const translate = useTranslate();

  const [category, setCategory] = useState(emptyCategory);
  const [categoryOptions, setCategoryOptions] = useState([]);
  const [errors, setErrors] = useState([]);

  useEffect(() => {
    (async () => {
      spinner.show();
      try {
        const { data } = await categoryApi.getCategoryOptions();
        setCategoryOptions(data?.data ?? []);
        if (id) {
          const response = await categoryApi.getCategoryDetails(id);
          setCategory({ ...emptyCategory, ...response.data?.data });
        } else {
          // Like the legacy create screen, default the parent to the root
          // category so a new category is not accidentally created parentless.
          const treeResponse = await categoryApi.getCategoryTree();
          const rootCategory = (treeResponse.data?.data ?? [])
            .find((c) => c.isRoot) ?? treeResponse.data?.data?.[0];
          setCategory({
            ...emptyCategory,
            parentCategory: rootCategory
              ? { id: rootCategory.id, name: rootCategory.name }
              : null,
          });
        }
      } catch (error) {
        // Like the legacy edit action: not-found redirects back to the tree.
        Alert.error(error.response?.data?.errorMessage
          ?? translate('react.category.notFound.message', 'Category not found'));
        history.push(CATEGORY_URL.tree());
      } finally {
        spinner.hide();
      }
    })();
  }, [id]);

  const setField = (field, value) => {
    setCategory((prevCategory) => ({ ...prevCategory, [field]: value }));
  };

  const onSave = async (event) => {
    event.preventDefault();
    setErrors([]);
    const payload = id
      ? {
        name: category.name,
        isRoot: !!category.isRoot,
        sortOrder: category.sortOrder,
        parentCategory: category.parentCategory?.id ? { id: category.parentCategory.id } : null,
      }
      : {
        name: category.name,
        parentCategory: category.parentCategory?.id ? { id: category.parentCategory.id } : null,
      };
    spinner.show();
    try {
      if (id) {
        await categoryApi.updateCategory(id, payload);
      } else {
        await categoryApi.createCategory(payload);
      }
      Alert.success(translate('react.category.saved.message', 'Category saved'));
      history.push(CATEGORY_URL.tree());
    } catch (error) {
      const errorMessages = error.response?.data?.errorMessages
        ?? [error.response?.data?.errorMessage ?? 'Unable to save category'];
      setErrors(errorMessages);
    } finally {
      spinner.hide();
    }
  };

  const sortedChildren = [...(category.categories ?? [])]
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.name?.localeCompare(b.name));

  return (
    <PageWrapper>
      <div className="d-flex flex-column category-page p-3">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h3 className="mb-0">
            {id
              ? <Translate id="react.category.editCategory.label" defaultMessage="Edit category" />
              : <Translate id="react.category.addCategory.label" defaultMessage="Add category" />}
            {category.name ? ` — ${category.name}` : ''}
          </h3>
          <Button
            label="react.category.listCategories.label"
            defaultLabel="List categories"
            variant="primary-outline"
            onClick={() => history.push(CATEGORY_URL.tree())}
          />
        </div>
        {errors.length > 0 && (
          <div className="alert alert-danger" role="alert" aria-label="error-message">
            <ul className="mb-0">
              {errors.map((error) => <li key={error}>{error}</li>)}
            </ul>
          </div>
        )}
        <form className="category-form" onSubmit={onSave} data-testid="category-form">
          <div className="form-group row">
            <label className="col-sm-3 col-form-label" htmlFor="parentCategory">
              <Translate id="react.category.parent.label" defaultMessage="Parent" />
            </label>
            <div className="col-sm-9">
              <select
                id="parentCategory"
                className="form-control"
                value={category.parentCategory?.id ?? ''}
                onChange={(event) => setField('parentCategory', event.target.value ? { id: event.target.value } : null)}
              >
                <option value="" aria-label="empty" />
                {categoryOptions.map((option) => (
                  <option key={option.id} value={option.id}>{option.label}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="form-group row">
            <label className="col-sm-3 col-form-label" htmlFor="name">
              <Translate id="react.category.name.label" defaultMessage="Name" />
            </label>
            <div className="col-sm-9">
              <input
                id="name"
                type="text"
                className="form-control"
                value={category.name ?? ''}
                onChange={(event) => setField('name', event.target.value)}
              />
            </div>
          </div>
          {id && (
            <>
              <div className="form-group row">
                <label className="col-sm-3 col-form-label" htmlFor="isRoot">
                  <Translate id="react.category.isRoot.label" defaultMessage="Is root node?" />
                </label>
                <div className="col-sm-9 d-flex align-items-center">
                  <input
                    id="isRoot"
                    type="checkbox"
                    checked={!!category.isRoot}
                    onChange={(event) => setField('isRoot', event.target.checked)}
                  />
                </div>
              </div>
              <div className="form-group row">
                <label className="col-sm-3 col-form-label" htmlFor="sortOrder">
                  <Translate id="react.category.sortOrder.label" defaultMessage="Sort order" />
                </label>
                <div className="col-sm-9">
                  <input
                    id="sortOrder"
                    type="number"
                    className="form-control category-sort-order-input"
                    value={category.sortOrder ?? ''}
                    onChange={(event) => setField('sortOrder', event.target.value)}
                  />
                </div>
              </div>
              <div className="form-group row">
                <span className="col-sm-3 col-form-label">
                  <Translate id="react.category.children.label" defaultMessage="Children" />
                </span>
                <div className="col-sm-9">
                  {sortedChildren.length
                    ? (
                      <ul className="list-unstyled mb-0" data-testid="category-children-list">
                        {sortedChildren.map((child) => (
                          <li key={child.id}>
                            <Link to={CATEGORY_URL.edit(child.id)}>{child.name}</Link>
                          </li>
                        ))}
                      </ul>
                    )
                    : <Translate id="react.default.none.label" defaultMessage="None" />}
                </div>
              </div>
              <div className="form-group row">
                <span className="col-sm-3 col-form-label">
                  <Translate id="react.category.products.label" defaultMessage="Products" />
                </span>
                <div className="col-sm-9">
                  {category.products?.length
                    ? (
                      <table className="table table-sm" data-testid="category-products-table">
                        <thead>
                          <tr>
                            <th scope="col" aria-label="Code"><Translate id="react.category.productCode.label" defaultMessage="Code" /></th>
                            <th scope="col" aria-label="Product"><Translate id="react.category.product.label" defaultMessage="Product" /></th>
                          </tr>
                        </thead>
                        <tbody>
                          {category.products.map((product) => (
                            <tr key={product.id}>
                              <td>{product.productCode}</td>
                              <td>
                                <a href={PRODUCT_URL.edit(product.id)} target="_blank" rel="noopener noreferrer">
                                  {product.name}
                                </a>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )
                    : <Translate id="react.default.none.label" defaultMessage="None" />}
                </div>
              </div>
            </>
          )}
          <div className="d-flex gap-8">
            <Button
              label={id ? 'react.default.button.save.label' : 'react.default.button.create.label'}
              defaultLabel={id ? 'Save' : 'Create'}
              variant="primary"
              type="submit"
            />
            <Button
              label="react.default.button.cancel.label"
              defaultLabel="Cancel"
              variant="transparent"
              onClick={() => history.push(CATEGORY_URL.tree())}
            />
          </div>
        </form>
      </div>
    </PageWrapper>
  );
};

export default CategoryForm;
