import React, { useEffect, useState } from 'react';

import { getTranslate } from 'react-localize-redux';
import { useSelector } from 'react-redux';
import { useParams } from 'react-router-dom';
import Alert from 'react-s-alert';

import { INVENTORY_LEVEL_BY_ID } from 'api/urls';
import { INVENTORY_ITEM_URL, INVENTORY_LEVEL_URL } from 'consts/applicationUrls';
import useTranslation from 'hooks/useTranslation';
import apiClient from 'utils/apiClient';
import Translate, { translateWithDefaultMessage } from 'utils/Translate';
import PageWrapper from 'wrappers/PageWrapper';

import 'components/inventory/styles.scss';

const InventoryLevelShowPage = () => {
  useTranslation('inventoryLevel');

  const { id } = useParams();
  const [inventoryLevel, setInventoryLevel] = useState(null);

  const { translate } = useSelector((state) => ({
    translate: translateWithDefaultMessage(getTranslate(state.localize)),
  }));

  useEffect(() => {
    if (!id) {
      return;
    }
    apiClient.get(INVENTORY_LEVEL_BY_ID(id))
      .then((response) => setInventoryLevel(response.data.data));
  }, [id]);

  const deleteInventoryLevel = async () => {
    // eslint-disable-next-line no-alert
    if (!window.confirm(translate('react.inventoryLevel.delete.confirm.label', 'Are you sure?'))) {
      return;
    }
    try {
      await apiClient.delete(INVENTORY_LEVEL_BY_ID(id));
      window.location = INVENTORY_LEVEL_URL.list();
    } catch (error) {
      Alert.error(error.response?.data?.errorMessage
        || translate('react.inventoryLevel.deleteFailed.label', 'Inventory level could not be deleted'));
    }
  };

  const rows = inventoryLevel ? [
    { label: { id: 'react.inventoryLevel.id.label', defaultMessage: 'Id' }, value: inventoryLevel.id },
    {
      label: { id: 'react.inventoryLevel.product.label', defaultMessage: 'Product' },
      value: (
        <a href={INVENTORY_ITEM_URL.showStockCard(inventoryLevel.product?.id)}>
          {inventoryLevel.product?.name}
        </a>
      ),
    },
    {
      label: { id: 'react.inventoryLevel.supported.label', defaultMessage: 'Supported' },
      value: inventoryLevel.supported == null ? '' : translate(
        `react.default.${inventoryLevel.supported}.label`,
        String(inventoryLevel.supported),
      ),
    },
    { label: { id: 'react.inventoryLevel.minQuantity.label', defaultMessage: 'Min Quantity' }, value: inventoryLevel.minQuantity },
    { label: { id: 'react.inventoryLevel.reorderQuantity.label', defaultMessage: 'Reorder Quantity' }, value: inventoryLevel.reorderQuantity },
    { label: { id: 'react.inventoryLevel.dateCreated.label', defaultMessage: 'Date Created' }, value: inventoryLevel.dateCreated },
    { label: { id: 'react.inventoryLevel.inventory.label', defaultMessage: 'Inventory' }, value: inventoryLevel.inventory?.warehouse },
    { label: { id: 'react.inventoryLevel.lastUpdated.label', defaultMessage: 'Last Updated' }, value: inventoryLevel.lastUpdated },
  ] : [];

  return (
    <PageWrapper className="inventory-level-show-page">
      <div className="list-page-header p-3 d-flex align-items-center justify-content-between">
        <h5 className="m-0">
          <Translate id="react.inventoryLevel.show.title.label" defaultMessage="Show Inventory Level" />
        </h5>
        <a className="btn btn-outline-primary" href={INVENTORY_LEVEL_URL.list()}>
          <Translate id="react.inventoryLevel.list.title.label" defaultMessage="Inventory Levels" />
        </a>
      </div>
      <div className="p-3" style={{ maxWidth: '700px' }}>
        <table className="table table-sm">
          <tbody>
            {rows.map((row) => (
              <tr key={row.label.id}>
                <td className="font-weight-bold" style={{ width: '30%' }}>
                  <Translate id={row.label.id} defaultMessage={row.label.defaultMessage} />
                </td>
                <td>{row.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {inventoryLevel && (
          <div>
            <a className="btn btn-primary mr-2" href={INVENTORY_LEVEL_URL.edit(inventoryLevel.id)}>
              <Translate id="react.default.button.edit.label" defaultMessage="Edit" />
            </a>
            <button type="button" className="btn btn-outline-danger" onClick={deleteInventoryLevel}>
              <Translate id="react.default.button.delete.label" defaultMessage="Delete" />
            </button>
          </div>
        )}
      </div>
    </PageWrapper>
  );
};

export default InventoryLevelShowPage;
