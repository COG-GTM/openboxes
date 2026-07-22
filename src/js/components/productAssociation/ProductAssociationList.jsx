import React, { useEffect, useState } from 'react';

import queryString from 'query-string';
import Alert from 'react-s-alert';

import productAssociationApi from 'api/services/ProductAssociationApi';
import Button from 'components/form-elements/Button';
import { PRODUCT_ASSOCIATION_URL, PRODUCT_URL } from 'consts/applicationUrls';
import useSpinner from 'hooks/useSpinner';
import useTranslate from 'hooks/useTranslate';
import useTranslation from 'hooks/useTranslation';
import Translate from 'utils/Translate';
import PageWrapper from 'wrappers/PageWrapper';

import './styles.scss';

const PAGE_SIZE = 10;

const ProductAssociationList = () => {
  useTranslation('product', 'default');
  const spinner = useSpinner();
  const translate = useTranslate();

  const [associations, setAssociations] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [query, setQuery] = useState('');
  const [selectedTypes, setSelectedTypes] = useState([]);
  const [typeOptions, setTypeOptions] = useState([]);
  const [page, setPage] = useState(0);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await productAssociationApi.getTypeCodeOptions();
        setTypeOptions(data?.data ?? []);
      } catch (error) {
        Alert.error(error.response?.data?.errorMessage ?? 'Unable to load association types');
      }
    })();
  }, []);

  const fetchAssociations = async (pageToFetch = 0) => {
    spinner.show();
    try {
      const { data } = await productAssociationApi.getProductAssociations({
        params: {
          q: query || null,
          code: selectedTypes.length ? selectedTypes : null,
          max: PAGE_SIZE,
          offset: pageToFetch * PAGE_SIZE,
        },
        paramsSerializer: (parameters) => queryString.stringify(parameters, { skipNull: true }),
      });
      setAssociations(data?.data ?? []);
      setTotalCount(data?.totalCount ?? 0);
      setPage(pageToFetch);
    } catch (error) {
      Alert.error(error.response?.data?.errorMessage ?? 'Unable to load product associations');
    } finally {
      spinner.hide();
    }
  };

  useEffect(() => {
    fetchAssociations(0);
  }, []);

  const onSearch = (event) => {
    event.preventDefault();
    fetchAssociations(0);
  };

  const onTypesChange = (event) => {
    setSelectedTypes(Array.from(event.target.selectedOptions).map((option) => option.value));
  };

  const pageCount = Math.ceil(totalCount / PAGE_SIZE);

  return (
    <PageWrapper>
      <div className="d-flex flex-column product-association-page p-3">
        <h3 className="mb-3" data-testid="product-association-list-title">
          <Translate id="react.productAssociation.list.title.label" defaultMessage="Product Associations" />
        </h3>
        <div className="d-flex mb-3 gap-8">
          <a className="btn btn-outline-primary" href={PRODUCT_ASSOCIATION_URL.create()}>
            <Translate id="react.productAssociation.add.label" defaultMessage="Add association" />
          </a>
          <a className="btn btn-outline-primary" href={PRODUCT_ASSOCIATION_URL.exportXls()}>
            <Translate id="react.default.button.download.label" defaultMessage="Download" />
          </a>
        </div>
        <form className="d-flex align-items-end mb-3 gap-8" onSubmit={onSearch} data-testid="product-association-filters">
          <div className="d-flex flex-column">
            <label htmlFor="association-search-input">
              {translate('react.productAssociation.product.label', 'Product')}
            </label>
            <input
              id="association-search-input"
              type="text"
              className="form-control association-filter-input"
              data-testid="association-search-input"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
          <div className="d-flex flex-column">
            <label htmlFor="association-type-select">
              {translate('react.productAssociation.type.label', 'Association Type')}
            </label>
            <select
              id="association-type-select"
              className="form-control association-filter-input"
              data-testid="association-type-select"
              multiple
              value={selectedTypes}
              onChange={onTypesChange}
            >
              {typeOptions.map((option) => (
                <option key={option.id} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>
          <Button
            type="submit"
            label="react.default.button.search.label"
            defaultLabel="Search"
            variant="primary"
          />
        </form>
        <div className="mb-2" data-testid="product-association-count">
          <Translate id="react.default.results.label" defaultMessage="Results" />
          {`: ${totalCount}`}
        </div>
        <table className="table table-sm" data-testid="product-association-table">
          <thead>
            <tr>
              <th>{translate('react.productAssociation.id.label', 'Id')}</th>
              <th>{translate('react.productAssociation.code.label', 'Code')}</th>
              <th>{translate('react.productAssociation.product.label', 'Product')}</th>
              <th>{translate('react.productAssociation.associatedProduct.label', 'Associated Product')}</th>
              <th>{translate('react.productAssociation.quantity.label', 'Quantity')}</th>
              <th>{translate('react.productAssociation.comments.label', 'Comments')}</th>
              <th>{translate('react.productAssociation.dateCreated.label', 'Date Created')}</th>
            </tr>
          </thead>
          <tbody>
            {associations.map((association) => (
              <tr key={association.id}>
                <td>
                  <a href={PRODUCT_ASSOCIATION_URL.edit(association.id)}>{association.id}</a>
                </td>
                <td>{association.code}</td>
                <td>
                  <a href={PRODUCT_URL.edit(association.product?.id)}>
                    {`${association.product?.productCode ?? ''} ${association.product?.name ?? ''}`}
                  </a>
                </td>
                <td>
                  <a
                    href={PRODUCT_URL.edit(
                      association.associatedProduct?.id ?? association.product?.id,
                    )}
                  >
                    {`${association.associatedProduct?.productCode ?? ''} ${association.associatedProduct?.name ?? ''}`}
                  </a>
                </td>
                <td>{association.quantity}</td>
                <td>{association.comments}</td>
                <td>{association.dateCreated}</td>
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
              onClick={() => fetchAssociations(page - 1)}
            />
            <span>{`${page + 1} / ${pageCount}`}</span>
            <Button
              label="react.default.button.next.label"
              defaultLabel="Next"
              variant="primary-outline"
              disabled={page + 1 >= pageCount}
              onClick={() => fetchAssociations(page + 1)}
            />
          </div>
        )}
      </div>
    </PageWrapper>
  );
};

export default ProductAssociationList;
