import React, { useEffect, useState } from 'react';

import queryString from 'query-string';
import Alert from 'react-s-alert';

import productApi from 'api/services/ProductApi';
import Button from 'components/form-elements/Button';
import { PRODUCT_URL } from 'consts/applicationUrls';
import useSpinner from 'hooks/useSpinner';
import useTranslate from 'hooks/useTranslate';
import useTranslation from 'hooks/useTranslation';
import Translate from 'utils/Translate';
import PageWrapper from 'wrappers/PageWrapper';

import './styles.scss';

const ProductSearch = () => {
  useTranslation('product', 'default');
  const spinner = useSpinner();
  const translate = useTranslate();

  const initialQuery = queryString.parse(window.location.search)?.q ?? '';
  const [query, setQuery] = useState(initialQuery);
  const [products, setProducts] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [searched, setSearched] = useState(false);

  const fetchProducts = async (searchTerm) => {
    if (!searchTerm) {
      setProducts([]);
      setTotalCount(0);
      setSearched(false);
      return;
    }
    spinner.show();
    try {
      const { data } = await productApi.productSearch({
        params: { q: searchTerm },
      });
      setProducts(data?.data ?? []);
      setTotalCount(data?.totalCount ?? 0);
      setSearched(true);
    } catch (error) {
      Alert.error(error.response?.data?.errorMessage ?? 'Unable to search products');
    } finally {
      spinner.hide();
    }
  };

  useEffect(() => {
    fetchProducts(initialQuery);
  }, []);

  const onSearch = (event) => {
    event.preventDefault();
    fetchProducts(query);
  };

  return (
    <PageWrapper>
      <div className="d-flex flex-column product-page p-3">
        <h3 className="mb-3" data-testid="product-search-title">
          <Translate id="react.product.search.title.label" defaultMessage="Search Products" />
        </h3>
        <div className="d-flex mb-3 gap-8">
          <a className="btn btn-outline-primary" href={PRODUCT_URL.list()}>
            <Translate id="react.product.search.listProducts.label" defaultMessage="List products" />
          </a>
          <a className="btn btn-outline-primary" href={PRODUCT_URL.create()}>
            <Translate id="react.product.search.addProduct.label" defaultMessage="Add product" />
          </a>
        </div>
        <form className="d-flex align-items-center mb-3 gap-8" onSubmit={onSearch} data-testid="product-search-form">
          <input
            type="text"
            className="form-control product-search-input"
            data-testid="product-search-input"
            placeholder={translate('react.product.search.placeholder.label', 'Search products by keyword')}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <Button
            type="submit"
            label="react.default.button.find.label"
            defaultLabel="Find"
            variant="primary"
          />
        </form>
        {searched && (
          <div className="mb-2" data-testid="product-search-count">
            <Translate id="react.default.results.label" defaultMessage="Results" />
            {`: ${totalCount}`}
          </div>
        )}
        <table className="table table-sm" data-testid="product-search-table">
          <thead>
            <tr>
              <th>{translate('react.product.search.barcode.label', 'Barcode')}</th>
              <th>{translate('react.product.productCode.label', 'Product Code')}</th>
              <th>{translate('react.product.manufacturer.label', 'Manufacturer')}</th>
              <th>{translate('react.product.description.label', 'Description')}</th>
              <th>{translate('react.product.upc.label', 'UPC')}</th>
              <th>{translate('react.product.category.label', 'Category')}</th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => (
              <tr key={product.id}>
                <td className="text-center">
                  {product.upc && (
                    <img src={PRODUCT_URL.barcode(product.upc)} alt={product.upc} />
                  )}
                </td>
                <td>{product.productCode}</td>
                <td>{product.manufacturer}</td>
                <td>
                  <a href={PRODUCT_URL.edit(product.id)}>
                    <strong>{product.name}</strong>
                  </a>
                  {product.description ? <div>{product.description}</div> : null}
                </td>
                <td>{product.upc}</td>
                <td>{product.category?.name}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </PageWrapper>
  );
};

export default ProductSearch;
