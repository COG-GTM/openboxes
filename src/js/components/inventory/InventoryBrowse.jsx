import React, { useEffect, useState } from 'react';

import { useSelector } from 'react-redux';
import { getCurrentLocation } from 'selectors';

import { INVENTORY_BROWSE } from 'api/urls';
import Spinner from 'components/spinner/Spinner';
import { INVENTORY_ITEM_URL } from 'consts/applicationUrls';
import useTranslate from 'hooks/useTranslate';
import useTranslation from 'hooks/useTranslation';
import apiClient from 'utils/apiClient';
import { fetchProductsCategories } from 'utils/option-utils';
import PageWrapper from 'wrappers/PageWrapper';

const PAGE_SIZE = 10;

const InventoryBrowse = () => {
  useTranslation('inventory');
  const translate = useTranslate();
  const currentLocation = useSelector(getCurrentLocation);

  const [categories, setCategories] = useState([]);
  const [categoryId, setCategoryId] = useState('');
  const [searchTerms, setSearchTerms] = useState('');
  const [offset, setOffset] = useState(0);
  const [rows, setRows] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchProductsCategories().then(setCategories);
  }, []);

  const fetchData = (fetchOffset = offset) => {
    setLoading(true);
    apiClient.get(INVENTORY_BROWSE, {
      params: {
        locationId: currentLocation?.id,
        searchTerms: searchTerms || null,
        categoryId: categoryId || null,
        max: PAGE_SIZE,
        offset: fetchOffset,
      },
    })
      .then((response) => {
        setRows(response.data.data);
        setTotalCount(response.data.totalCount);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (currentLocation?.id) {
      fetchData(offset);
    }
  }, [currentLocation?.id, offset]);

  const onSearch = (event) => {
    event.preventDefault();
    if (offset === 0) {
      fetchData(0);
    } else {
      setOffset(0);
    }
  };

  const pageCount = Math.ceil(totalCount / PAGE_SIZE);
  const currentPage = Math.floor(offset / PAGE_SIZE);

  return (
    <PageWrapper>
      <div className="d-flex flex-column list-page-main p-3">
        <h1>{translate('react.inventoryBrowser.title.label', 'Inventory Browser')}</h1>
        <form className="d-flex align-items-end mb-3" style={{ gap: '0.75rem' }} onSubmit={onSearch}>
          <div>
            <label htmlFor="inventory-browse-search">
              {translate('react.inventoryBrowser.search.label', 'Search')}
            </label>
            <input
              id="inventory-browse-search"
              type="text"
              className="form-control"
              value={searchTerms}
              onChange={(e) => setSearchTerms(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="inventory-browse-category">
              {translate('react.inventoryBrowser.category.label', 'Category')}
            </label>
            <select
              id="inventory-browse-category"
              className="form-control"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
            >
              <option value="">{translate('react.default.all.label', 'All')}</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>{category.label}</option>
              ))}
            </select>
          </div>
          <button type="submit" className="btn btn-primary">
            {translate('react.default.button.search.label', 'Search')}
          </button>
        </form>
        {loading ? <Spinner /> : (
          <>
            <div className="mb-2" data-testid="inventory-browse-total">
              {translate('react.inventoryBrowser.resultsFound.label', 'Results found')}
              {': '}
              {totalCount}
            </div>
            <div className="table-responsive">
              <table className="table table-bordered table-sm" data-testid="inventory-browse-table">
                <thead>
                  <tr>
                    <th>{translate('react.inventoryBrowser.productCode.label', 'Code')}</th>
                    <th>{translate('react.inventoryBrowser.product.label', 'Product')}</th>
                    <th>{translate('react.inventoryBrowser.productType.label', 'Product Type')}</th>
                    <th>{translate('react.inventoryBrowser.category.label', 'Category')}</th>
                    <th>{translate('react.inventoryBrowser.tags.label', 'Tags')}</th>
                    <th>{translate('react.inventoryBrowser.catalogs.label', 'Formularies')}</th>
                    <th className="text-right">{translate('react.inventoryBrowser.quantityOnHand.label', 'QoH')}</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id}>
                      <td>{row.productCode}</td>
                      <td>
                        <a href={INVENTORY_ITEM_URL.showStockCard(row.id)}>
                          {row.displayName || row.name}
                        </a>
                      </td>
                      <td>{row.productType}</td>
                      <td>{row.category?.name}</td>
                      <td>{row.tags?.map((tag) => tag.tag).join(', ')}</td>
                      <td>{row.catalogs?.map((catalog) => catalog.name).join(', ')}</td>
                      <td className="text-right">{row.quantityOnHand}</td>
                    </tr>
                  ))}
                  {!rows.length && (
                    <tr>
                      <td colSpan={7}>
                        {translate('react.default.noResultsFound.label', 'No results found')}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {pageCount > 1 && (
              <div className="d-flex align-items-center" style={{ gap: '0.75rem' }}>
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  disabled={currentPage === 0}
                  onClick={() => setOffset(offset - PAGE_SIZE)}
                >
                  {translate('react.default.button.previous.label', 'Previous')}
                </button>
                <span>
                  {currentPage + 1}
                  {' / '}
                  {pageCount}
                </span>
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  disabled={currentPage >= pageCount - 1}
                  onClick={() => setOffset(offset + PAGE_SIZE)}
                >
                  {translate('react.default.button.next.label', 'Next')}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </PageWrapper>
  );
};

export default InventoryBrowse;
