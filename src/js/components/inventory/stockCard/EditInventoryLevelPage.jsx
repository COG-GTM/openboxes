import React, { useEffect, useState } from 'react';

import { getTranslate } from 'react-localize-redux';
import { useSelector } from 'react-redux';

import { PRODUCT_INVENTORY_LEVEL } from 'api/urls';
import StockCardHeader from 'components/inventory/stockCard/StockCardHeader';
import useProductId from 'components/inventory/stockCard/useProductId';
import notification from 'components/Layout/notifications/notification';
import { INVENTORY_ITEM_URL } from 'consts/applicationUrls';
import NotificationType from 'consts/notificationTypes';
import useTranslation from 'hooks/useTranslation';
import apiClient from 'utils/apiClient';
import Translate, { translateWithDefaultMessage } from 'utils/Translate';
import PageWrapper from 'wrappers/PageWrapper';

import 'components/inventory/styles.scss';

// Same options as the legacy g:select over InventoryStatus.list()
const STATUS_OPTIONS = ['INACTIVE', 'NOT_SUPPORTED', 'SUPPORTED_NON_INVENTORY', 'SUPPORTED', 'STOCK', 'FORMULARY'];

const EditInventoryLevelPage = () => {
  useTranslation('stockCard', 'inventory');

  const productId = useProductId();
  const [inventoryLevel, setInventoryLevel] = useState(null);
  const [status, setStatus] = useState('');
  const [saving, setSaving] = useState(false);

  const { currentLocation, translate } = useSelector((state) => ({
    currentLocation: state.session.currentLocation,
    translate: translateWithDefaultMessage(getTranslate(state.localize)),
  }));

  useEffect(() => {
    if (!productId || !currentLocation?.id) {
      return;
    }
    apiClient.get(PRODUCT_INVENTORY_LEVEL(currentLocation.id, productId))
      .then((response) => {
        setInventoryLevel(response.data.data);
        setStatus(response.data.data?.status || '');
      });
  }, [productId, currentLocation?.id]);

  const save = async () => {
    setSaving(true);
    try {
      await apiClient.put(PRODUCT_INVENTORY_LEVEL(currentLocation.id, productId), {
        status: status || null,
      });
      window.location = INVENTORY_ITEM_URL.showStockCard(productId);
    } catch (error) {
      const message = (error?.response?.data?.errorMessages || []).join(', ')
        || translate('react.stockCard.inventoryLevel.error.label', 'An error occurred while saving');
      notification(NotificationType.ERROR_OUTLINED)({ message });
      setSaving(false);
    }
  };

  return (
    <PageWrapper className="edit-inventory-level-page">
      <StockCardHeader productId={productId} activeScreen="editInventoryLevel" />
      <div className="p-3" style={{ maxWidth: '600px' }}>
        <h5>
          <Translate id="react.stockCard.editInventoryLevel.title.label" defaultMessage="Edit Inventory Level" />
        </h5>
        <div className="mb-2">
          <Translate id="react.stockCard.inventory.label" defaultMessage="Inventory" />
          {': '}
          <strong>{inventoryLevel?.inventory?.warehouse || currentLocation?.name}</strong>
        </div>
        <div className="mb-2">
          <Translate id="react.stockCard.product.label" defaultMessage="Product" />
          {': '}
          <strong>
            {inventoryLevel?.product ? `${inventoryLevel.product.productCode} ${inventoryLevel.product.name}` : ''}
          </strong>
        </div>
        <div className="form-group">
          <label htmlFor="inventory-level-status">
            <Translate id="react.stockCard.status.label" defaultMessage="Status" />
          </label>
          <select
            id="inventory-level-status"
            className="form-control"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="">
              {translate('react.stockCard.chooseStatus.label', 'Choose status')}
            </option>
            {STATUS_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {translate(`react.stockCard.inventoryStatus.${option}.label`, option)}
              </option>
            ))}
          </select>
        </div>
        <button type="button" className="btn btn-primary mr-2" disabled={saving || !inventoryLevel} onClick={save}>
          <Translate id="react.default.button.save.label" defaultMessage="Save" />
        </button>
        <a className="btn btn-outline-secondary" href={INVENTORY_ITEM_URL.showStockCard(productId)}>
          <Translate id="react.default.button.cancel.label" defaultMessage="Cancel" />
        </a>
      </div>
    </PageWrapper>
  );
};

export default EditInventoryLevelPage;
