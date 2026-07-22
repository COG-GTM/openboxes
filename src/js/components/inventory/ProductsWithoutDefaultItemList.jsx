import React, { useEffect, useMemo, useState } from 'react';

import _ from 'lodash';
import { getTranslate } from 'react-localize-redux';
import { useSelector } from 'react-redux';
import Alert from 'react-s-alert';

import { CREATE_DEFAULT_INVENTORY_ITEMS, PRODUCTS_WITHOUT_DEFAULT_INVENTORY_ITEM } from 'api/urls';
import { INVENTORY_ITEM_URL } from 'consts/applicationUrls';
import useTranslation from 'hooks/useTranslation';
import apiClient from 'utils/apiClient';
import Translate, { translateWithDefaultMessage } from 'utils/Translate';
import PageWrapper from 'wrappers/PageWrapper';

import 'components/inventory/styles.scss';

const ProductsWithoutDefaultItemList = () => {
  useTranslation('inventory');

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const { translate } = useSelector((state) => ({
    translate: translateWithDefaultMessage(getTranslate(state.localize)),
  }));

  const fetchData = () => {
    setLoading(true);
    apiClient.get(PRODUCTS_WITHOUT_DEFAULT_INVENTORY_ITEM)
      .then((response) => setProducts(response.data.data))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchData();
  }, []);

  const createDefaultItems = async () => {
    setCreating(true);
    try {
      const response = await apiClient.post(CREATE_DEFAULT_INVENTORY_ITEMS);
      Alert.success(translate(
        'react.inventory.showProducts.created.label',
        `Created ${response.data.data.created} default inventory items`,
        { count: response.data.data.created },
      ));
      fetchData();
    } catch (error) {
      Alert.error(error.response?.data?.errorMessage
        || translate('react.inventory.showProducts.createFailed.label', 'Default inventory items could not be created'));
    } finally {
      setCreating(false);
    }
  };

  const productsByCategory = useMemo(
    () => _.groupBy(products, (product) => product.category || ''),
    [products],
  );

  return (
    <PageWrapper className="inventory-list-page">
      <div className="list-page-header p-3 d-flex align-items-center justify-content-between">
        <h5 className="m-0">
          <Translate id="react.inventory.showProducts.title.label" defaultMessage="Products without a default inventory item" />
        </h5>
      </div>
      <div className="p-3">
        <p>
          <Translate
            id="react.inventory.showProducts.message.label"
            defaultMessage="These products do not have a default inventory item (an inventory item with an empty lot number)."
          />
        </p>
        <button
          type="button"
          className="btn btn-primary"
          disabled={creating || loading || products.length === 0}
          onClick={createDefaultItems}
        >
          <Translate id="react.inventory.showProducts.createDefaultItems.label" defaultMessage="Create default inventory items" />
        </button>
      </div>
      <div className="px-3 pb-3">
        {loading && (
          <Translate id="react.default.loading.label" defaultMessage="Loading..." />
        )}
        {!loading && products.length === 0 && (
          <Translate id="react.inventory.empty.label" defaultMessage="No products found" />
        )}
        {!loading && Object.entries(productsByCategory).map(([category, categoryProducts]) => (
          <div key={category || 'uncategorized'} className="mb-3">
            <h6>{category || translate('react.inventory.showProducts.noCategory.label', 'No category')}</h6>
            <ul className="list-unstyled ml-3">
              {categoryProducts.map((product) => (
                <li key={product.id}>
                  <a href={INVENTORY_ITEM_URL.showStockCard(product.id)}>
                    {product.productCode ? `${product.productCode} ` : ''}
                    {product.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </PageWrapper>
  );
};

export default ProductsWithoutDefaultItemList;
