import React, { useEffect, useState } from 'react';

import { useHistory, useParams } from 'react-router-dom';
import Alert from 'react-s-alert';

import productCatalogApi from 'api/services/ProductCatalogApi';
import Button from 'components/form-elements/Button';
import { PRODUCT_CATALOG_URL, PRODUCT_URL } from 'consts/applicationUrls';
import useSpinner from 'hooks/useSpinner';
import useTranslate from 'hooks/useTranslate';
import useTranslation from 'hooks/useTranslation';
import Translate from 'utils/Translate';
import PageWrapper from 'wrappers/PageWrapper';

import './styles.scss';

const ProductCatalogShow = () => {
  useTranslation('productCatalog', 'default');
  const spinner = useSpinner();
  const translate = useTranslate();
  const history = useHistory();
  const { id } = useParams();

  const [catalog, setCatalog] = useState(null);
  const [errors, setErrors] = useState([]);

  useEffect(() => {
    (async () => {
      spinner.show();
      try {
        const { data } = await productCatalogApi.getProductCatalog(id);
        setCatalog(data?.data);
      } catch (error) {
        Alert.error(error.response?.data?.errorMessage ?? 'Unable to load product catalog');
        history.push(PRODUCT_CATALOG_URL.list());
      } finally {
        spinner.hide();
      }
    })();
  }, [id]);

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

  return (
    <PageWrapper>
      <div className="d-flex flex-column product-catalog-page p-3">
        <h3 className="mb-3" data-testid="product-catalog-show-title">
          <Translate id="react.productCatalog.show.title.label" defaultMessage="Show Product Catalog" />
        </h3>
        <div className="d-flex mb-3 gap-8">
          <a className="btn btn-outline-primary" href={PRODUCT_CATALOG_URL.list()}>
            <Translate id="react.productCatalog.list.title.label" defaultMessage="Product Catalogs" />
          </a>
        </div>
        {errors.length > 0 && (
          <div className="alert alert-danger" data-testid="product-catalog-errors">
            <ul className="mb-0">
              {errors.map((errorMessage) => <li key={errorMessage}>{errorMessage}</li>)}
            </ul>
          </div>
        )}
        <table className="table table-sm w-auto" data-testid="product-catalog-show-table">
          <tbody>
            <tr>
              <td className="font-weight-bold pr-4">
                <Translate id="react.productCatalog.id.label" defaultMessage="Id" />
              </td>
              <td aria-label="Id">{catalog?.id}</td>
            </tr>
            <tr>
              <td className="font-weight-bold pr-4">
                <Translate id="react.productCatalog.code.label" defaultMessage="Code" />
              </td>
              <td aria-label="Code">{catalog?.code}</td>
            </tr>
            <tr>
              <td className="font-weight-bold pr-4">
                <Translate id="react.productCatalog.name.label" defaultMessage="Name" />
              </td>
              <td aria-label="Name">{catalog?.name}</td>
            </tr>
            <tr>
              <td className="font-weight-bold pr-4">
                <Translate id="react.productCatalog.description.label" defaultMessage="Description" />
              </td>
              <td aria-label="Description">{catalog?.description}</td>
            </tr>
            <tr>
              <td className="font-weight-bold pr-4">
                <Translate id="react.productCatalog.active.label" defaultMessage="Active" />
              </td>
              <td aria-label="Active">
                {catalog && (catalog.active
                  ? translate('react.default.yes.label', 'Yes')
                  : translate('react.default.no.label', 'No'))}
              </td>
            </tr>
            <tr>
              <td className="font-weight-bold pr-4">
                <Translate id="react.productCatalog.dateCreated.label" defaultMessage="Date Created" />
              </td>
              <td aria-label="Date Created">{catalog?.dateCreated}</td>
            </tr>
            <tr>
              <td className="font-weight-bold pr-4">
                <Translate id="react.productCatalog.lastUpdated.label" defaultMessage="Last Updated" />
              </td>
              <td aria-label="Last Updated">{catalog?.lastUpdated}</td>
            </tr>
            <tr>
              <td className="font-weight-bold pr-4">
                <Translate id="react.productCatalog.products.label" defaultMessage="Products" />
              </td>
              <td aria-label="Products">
                <ul className="mb-0" data-testid="product-catalog-show-products">
                  {(catalog?.productCatalogItems ?? []).map((item) => (
                    <li key={item.id}>
                      <a href={PRODUCT_URL.show(item.product?.id)}>{item.product?.name}</a>
                    </li>
                  ))}
                </ul>
              </td>
            </tr>
          </tbody>
        </table>
        <div className="d-flex gap-8">
          <a className="btn btn-outline-primary" href={PRODUCT_CATALOG_URL.edit(id)}>
            <Translate id="react.default.button.edit.label" defaultMessage="Edit" />
          </a>
          <Button
            type="button"
            label="react.default.button.delete.label"
            defaultLabel="Delete"
            variant="danger"
            onClick={onDelete}
          />
        </div>
      </div>
    </PageWrapper>
  );
};

export default ProductCatalogShow;
