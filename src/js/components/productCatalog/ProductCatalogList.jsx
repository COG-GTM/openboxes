import React, { useEffect, useState } from 'react';

import queryString from 'query-string';
import Alert from 'react-s-alert';

import productCatalogApi from 'api/services/ProductCatalogApi';
import Button from 'components/form-elements/Button';
import { PRODUCT_CATALOG_URL } from 'consts/applicationUrls';
import useSpinner from 'hooks/useSpinner';
import useTranslate from 'hooks/useTranslate';
import useTranslation from 'hooks/useTranslation';
import Translate from 'utils/Translate';
import PageWrapper from 'wrappers/PageWrapper';

import './styles.scss';

const PAGE_SIZE = 10;

const COLUMNS = [
  { property: 'id', label: 'react.productCatalog.id.label', defaultLabel: 'Id' },
  { property: 'code', label: 'react.productCatalog.code.label', defaultLabel: 'Code' },
  { property: 'name', label: 'react.productCatalog.name.label', defaultLabel: 'Name' },
  { property: 'description', label: 'react.productCatalog.description.label', defaultLabel: 'Description' },
  { property: 'active', label: 'react.productCatalog.active.label', defaultLabel: 'Active' },
  { property: 'color', label: 'react.productCatalog.color.label', defaultLabel: 'Color' },
  { property: 'dateCreated', label: 'react.productCatalog.dateCreated.label', defaultLabel: 'Date Created' },
];

const ProductCatalogList = () => {
  useTranslation('productCatalog', 'default');
  const spinner = useSpinner();
  const translate = useTranslate();

  const [catalogs, setCatalogs] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(0);
  const [sort, setSort] = useState('name');
  const [order, setOrder] = useState('asc');

  const fetchCatalogs = async ({ pageToFetch = 0, sortBy = sort, orderBy = order } = {}) => {
    spinner.show();
    try {
      const { data } = await productCatalogApi.getProductCatalogs({
        params: {
          q: query || null,
          max: PAGE_SIZE,
          offset: pageToFetch * PAGE_SIZE,
          sort: sortBy,
          order: orderBy,
        },
        paramsSerializer: (parameters) => queryString.stringify(parameters, { skipNull: true }),
      });
      setCatalogs(data?.data ?? []);
      setTotalCount(data?.totalCount ?? 0);
      setPage(pageToFetch);
    } catch (error) {
      Alert.error(error.response?.data?.errorMessage ?? 'Unable to load product catalogs');
    } finally {
      spinner.hide();
    }
  };

  useEffect(() => {
    fetchCatalogs();
  }, []);

  const onSearch = (event) => {
    event.preventDefault();
    fetchCatalogs({ pageToFetch: 0 });
  };

  const onSort = (property) => {
    const newOrder = sort === property && order === 'asc' ? 'desc' : 'asc';
    setSort(property);
    setOrder(newOrder);
    fetchCatalogs({ pageToFetch: 0, sortBy: property, orderBy: newOrder });
  };

  const pageCount = Math.ceil(totalCount / PAGE_SIZE);

  const sortIndicator = (property) => {
    if (sort !== property) {
      return '';
    }
    return order === 'asc' ? ' \u25B2' : ' \u25BC';
  };

  return (
    <PageWrapper>
      <div className="d-flex flex-column product-catalog-page p-3">
        <h3 className="mb-3" data-testid="product-catalog-list-title">
          <Translate id="react.productCatalog.list.title.label" defaultMessage="Product Catalogs" />
        </h3>
        <div className="d-flex mb-3 gap-8">
          <a className="btn btn-outline-primary" href={PRODUCT_CATALOG_URL.create()}>
            <Translate id="react.productCatalog.add.label" defaultMessage="Add Product Catalog" />
          </a>
        </div>
        <form className="d-flex align-items-end mb-3 gap-8" onSubmit={onSearch} data-testid="product-catalog-filters">
          <div className="d-flex flex-column">
            <label htmlFor="catalog-search-input">
              {translate('react.productCatalog.search.label', 'Search by name or code')}
            </label>
            <input
              id="catalog-search-input"
              type="text"
              className="form-control product-catalog-filter-input"
              data-testid="catalog-search-input"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
          <Button
            type="submit"
            label="react.default.button.search.label"
            defaultLabel="Search"
            variant="primary"
          />
        </form>
        <div className="mb-2" data-testid="product-catalog-count">
          <Translate id="react.default.results.label" defaultMessage="Results" />
          {`: ${totalCount}`}
        </div>
        <table className="table table-sm" data-testid="product-catalog-table">
          <thead>
            <tr>
              {COLUMNS.map((column) => (
                <th
                  key={column.property}
                  className="product-catalog-sortable-header"
                  onClick={() => onSort(column.property)}
                >
                  {translate(column.label, column.defaultLabel)}
                  {sortIndicator(column.property)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {catalogs.map((catalog) => (
              <tr key={catalog.id}>
                <td>
                  <a href={PRODUCT_CATALOG_URL.edit(catalog.id)}>{catalog.id}</a>
                </td>
                <td>{catalog.code}</td>
                <td>
                  <a href={PRODUCT_CATALOG_URL.show(catalog.id)}>{catalog.name}</a>
                </td>
                <td>{catalog.description}</td>
                <td>
                  {catalog.active
                    ? translate('react.default.yes.label', 'Yes')
                    : translate('react.default.no.label', 'No')}
                </td>
                <td>{catalog.color}</td>
                <td>{catalog.dateCreated}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {pageCount > 1 && (
          <div className="d-flex align-items-center gap-8">
            <Button
              label="react.default.button.previous.label"
              defaultLabel="Previous"
              variant="primary-outline"
              disabled={page === 0}
              onClick={() => fetchCatalogs({ pageToFetch: page - 1 })}
            />
            <span>{`${page + 1} / ${pageCount}`}</span>
            <Button
              label="react.default.button.next.label"
              defaultLabel="Next"
              variant="primary-outline"
              disabled={page + 1 >= pageCount}
              onClick={() => fetchCatalogs({ pageToFetch: page + 1 })}
            />
          </div>
        )}
      </div>
    </PageWrapper>
  );
};

export default ProductCatalogList;
