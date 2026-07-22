import React, {
  useCallback, useEffect, useMemo, useState,
} from 'react';

import _ from 'lodash';
import { getTranslate } from 'react-localize-redux';
import { useSelector } from 'react-redux';
import { useHistory, useParams } from 'react-router-dom';
import Alert from 'react-s-alert';

import shipmentApi from 'api/services/ShipmentApi';
import ShipmentWizardHeader from 'components/shipment/ShipmentWizardHeader';
import { CREATE_SHIPMENT_URL, SHIPMENT_SHOW_URL } from 'consts/applicationUrls';
import useTranslation from 'hooks/useTranslation';
import apiClient from 'utils/apiClient';
import Select from 'utils/Select';
import Translate, { translateWithDefaultMessage } from 'utils/Translate';

const debounceInventoryItemsFetch = _.debounce((searchTerm, callback) => {
  if (searchTerm && searchTerm.length >= 3) {
    apiClient.get(encodeURI(`/json/findInventoryItems?term=${searchTerm}`))
      .then((response) => callback((response.data ?? [])
        .filter((item) => item.id && item.id !== 'null')
        .map((item) => ({ ...item, value: item.id, label: item.label ?? item.value }))))
      .catch(() => callback([]));
  } else {
    callback([]);
  }
}, 500);

const CreateShipmentPacking = () => {
  const { shipmentId } = useParams();
  const history = useHistory();
  const [data, setData] = useState(null);
  const [containerType, setContainerType] = useState(null);
  const [containerText, setContainerText] = useState('');
  const [inventoryItem, setInventoryItem] = useState(null);
  const [itemContainer, setItemContainer] = useState(null);
  const [itemQuantity, setItemQuantity] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [options, setOptions] = useState(null);
  const translate = useSelector(
    (state) => translateWithDefaultMessage(getTranslate(state.localize)),
  );

  useTranslation('shipment', 'default');

  useEffect(() => {
    shipmentApi.getWizardOptions()
      .then((response) => setOptions(response.data?.data))
      .catch(() => setOptions({}));
  }, []);

  const fetchPacking = useCallback(() => {
    shipmentApi.getShipmentPacking(shipmentId)
      .then((response) => setData(response.data?.data))
      .catch((err) => {
        setError(err?.response?.data?.errorMessage
          || translate('react.default.errors.error.label', 'An error occurred'));
      });
  }, [shipmentId]);

  useEffect(() => {
    fetchPacking();
  }, [fetchPacking]);

  const containerOptions = useMemo(() => (data?.containers ?? []).flatMap((container) => [
    container,
    ...(container.childContainers ?? []),
  ]), [data]);

  const handleError = (err) => {
    const errorData = err?.response?.data;
    Alert.error(errorData?.errors?.join('<br/>') || errorData?.errorMessage
      || translate('react.default.errors.error.label', 'An error occurred'));
  };

  const addContainers = async (event) => {
    event.preventDefault();
    if (!containerType || !containerText.trim()) {
      return;
    }
    setSaving(true);
    try {
      await shipmentApi.createContainers(shipmentId, {
        containerTypeId: containerType.id,
        containerText: containerText.trim(),
      });
      setContainerText('');
      fetchPacking();
    } catch (err) {
      handleError(err);
    } finally {
      setSaving(false);
    }
  };

  const deleteContainer = async (containerId, deleteItems) => {
    setSaving(true);
    try {
      await shipmentApi.deleteContainer(shipmentId, containerId, deleteItems);
      fetchPacking();
    } catch (err) {
      handleError(err);
    } finally {
      setSaving(false);
    }
  };

  const addItem = async (event) => {
    event.preventDefault();
    if (!inventoryItem || !itemQuantity) {
      return;
    }
    setSaving(true);
    try {
      await shipmentApi.addShipmentItem(shipmentId, {
        inventoryItemId: inventoryItem.id,
        containerId: itemContainer?.id || null,
        quantity: Number(itemQuantity),
      });
      setInventoryItem(null);
      setItemQuantity('');
      fetchPacking();
    } catch (err) {
      handleError(err);
    } finally {
      setSaving(false);
    }
  };

  const deleteItem = async (itemId) => {
    setSaving(true);
    try {
      await shipmentApi.deleteShipmentItem(shipmentId, itemId);
      fetchPacking();
    } catch (err) {
      handleError(err);
    } finally {
      setSaving(false);
    }
  };

  const renderItemsTable = (items, containerId) => (
    <table className="table table-sm table-bordered mb-0" data-testid={`shipment-packing-items-${containerId ?? 'unpacked'}`}>
      <thead>
        <tr>
          <th>{translate('react.shipment.item.product.label', 'Product')}</th>
          <th>{translate('react.shipment.item.lotNumber.label', 'Lot')}</th>
          <th>{translate('react.shipment.item.expirationDate.label', 'Expires')}</th>
          <th className="text-right">{translate('react.shipment.item.quantity.label', 'Quantity')}</th>
          <th>{translate('react.shipment.item.uom.label', 'UOM')}</th>
          <th aria-label="actions" />
        </tr>
      </thead>
      <tbody>
        {!items.length && (
          <tr>
            <td colSpan="6" className="text-center text-muted">
              {translate('react.default.none.label', 'None')}
            </td>
          </tr>
        )}
        {items.map((item) => (
          <tr key={item.id}>
            <td>
              {item.product?.productCode}
              {' '}
              {item.product?.name}
            </td>
            <td>{item.inventoryItem?.lotNumber}</td>
            <td>{item.inventoryItem?.expirationDate}</td>
            <td className="text-right">{item.quantity}</td>
            <td>{item.product?.unitOfMeasure || 'EA'}</td>
            <td className="text-right">
              <button
                type="button"
                className="btn btn-sm btn-outline-danger"
                disabled={saving}
                onClick={() => deleteItem(item.id)}
              >
                <Translate id="react.default.button.delete.label" defaultMessage="Delete" />
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  if (error) {
    return <div className="alert alert-danger m-3" role="alert">{error}</div>;
  }

  if (!data) {
    return null;
  }

  return (
    <div className="d-flex flex-column m-3" data-testid="create-shipment-packing">
      <ShipmentWizardHeader shipment={data} currentStep="packing" />
      <div className="card mb-3">
        <div className="card-header">
          <Translate id="react.shipment.wizard.addContainers.label" defaultMessage="Add containers" />
        </div>
        <form className="card-body" onSubmit={addContainers}>
          <div className="form-row align-items-end">
            <div className="col-sm-3">
              <label htmlFor="shipment-container-type-select">
                <Translate id="react.shipment.containerType.label" defaultMessage="Container type" />
              </label>
              <Select
                id="shipment-container-type-select"
                options={options?.containerTypes ?? []}
                value={containerType}
                onChange={(value) => setContainerType(value)}
                valueKey="id"
                labelKey="name"
              />
            </div>
            <div className="col-sm-4">
              <label htmlFor="shipment-container-names-input">
                <Translate id="react.shipment.wizard.containerNames.label" defaultMessage="Container names (one per line)" />
              </label>
              <textarea
                id="shipment-container-names-input"
                className="form-control"
                rows="1"
                value={containerText}
                onChange={(event) => setContainerText(event.target.value)}
              />
            </div>
            <div className="col-sm-2">
              <button type="submit" className="btn btn-primary" disabled={saving} data-testid="shipment-packing-add-container-button">
                <Translate id="react.default.button.add.label" defaultMessage="Add" />
              </button>
            </div>
          </div>
        </form>
      </div>
      <div className="card mb-3">
        <div className="card-header">
          <Translate id="react.shipment.wizard.addItem.label" defaultMessage="Add item" />
        </div>
        <form className="card-body" onSubmit={addItem}>
          <div className="form-row align-items-end">
            <div className="col-sm-4">
              <label htmlFor="shipment-item-search-select">
                <Translate id="react.shipment.item.product.label" defaultMessage="Product" />
              </label>
              <Select
                async
                id="shipment-item-search-select"
                loadOptions={debounceInventoryItemsFetch}
                value={inventoryItem}
                onChange={(value) => setInventoryItem(value)}
                valueKey="id"
                labelKey="label"
                placeholder="Search products..."
              />
            </div>
            <div className="col-sm-3">
              <label htmlFor="shipment-item-container-select">
                <Translate id="react.shipment.container.label" defaultMessage="Container" />
              </label>
              <Select
                id="shipment-item-container-select"
                options={containerOptions}
                value={itemContainer}
                onChange={(value) => setItemContainer(value)}
                valueKey="id"
                labelKey="name"
              />
            </div>
            <div className="col-sm-2">
              <label htmlFor="shipment-item-quantity-input">
                <Translate id="react.shipment.item.quantity.label" defaultMessage="Quantity" />
              </label>
              <input
                id="shipment-item-quantity-input"
                type="number"
                min="1"
                className="form-control"
                value={itemQuantity}
                onChange={(event) => setItemQuantity(event.target.value)}
              />
            </div>
            <div className="col-sm-2">
              <button type="submit" className="btn btn-primary" disabled={saving} data-testid="shipment-packing-add-item-button">
                <Translate id="react.default.button.add.label" defaultMessage="Add" />
              </button>
            </div>
          </div>
        </form>
      </div>
      <div className="card mb-3">
        <div className="card-header d-flex justify-content-between">
          <Translate id="react.shipment.wizard.packingList.label" defaultMessage="Packing list" />
          <span data-testid="shipment-packing-item-count">
            {translate('react.shipment.wizard.itemCount.label', 'Items')}
            {': '}
            {data.shipmentItemCount}
          </span>
        </div>
        <div className="card-body">
          <h6>
            <Translate id="react.shipment.wizard.unpackedItems.label" defaultMessage="Unpacked items" />
          </h6>
          {renderItemsTable(data.unpackedItems ?? [], null)}
          {(data.containers ?? []).map((container) => (
            <div className="mt-3" key={container.id} data-testid={`shipment-packing-container-${container.id}`}>
              <div className="d-flex justify-content-between align-items-center mb-1">
                <h6 className="mb-0">
                  {container.containerType?.name}
                  {': '}
                  {container.name}
                </h6>
                <div>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary mr-2"
                    disabled={saving}
                    onClick={() => deleteContainer(container.id, false)}
                  >
                    <Translate id="react.shipment.wizard.deleteContainer.label" defaultMessage="Delete container" />
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-danger"
                    disabled={saving}
                    onClick={() => deleteContainer(container.id, true)}
                  >
                    <Translate id="react.shipment.wizard.deleteContainerAndItems.label" defaultMessage="Delete container and items" />
                  </button>
                </div>
              </div>
              {renderItemsTable(container.shipmentItems ?? [], container.id)}
              {(container.childContainers ?? []).map((childContainer) => (
                <div className="ml-4 mt-2" key={childContainer.id}>
                  <h6>
                    {childContainer.containerType?.name}
                    {': '}
                    {childContainer.name}
                  </h6>
                  {renderItemsTable(childContainer.shipmentItems ?? [], childContainer.id)}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
      <div className="d-flex">
        <button
          type="button"
          className="btn btn-outline-secondary mr-2"
          onClick={() => history.push(CREATE_SHIPMENT_URL.tracking(shipmentId))}
        >
          <Translate id="react.default.button.back.label" defaultMessage="Back" />
        </button>
        <button
          type="button"
          className="btn btn-primary mr-2"
          onClick={() => history.push(CREATE_SHIPMENT_URL.picking(shipmentId))}
          data-testid="shipment-packing-next-button"
        >
          <Translate id="react.default.button.next.label" defaultMessage="Next" />
        </button>
        <button
          type="button"
          className="btn btn-outline-secondary"
          onClick={() => window.location.assign(SHIPMENT_SHOW_URL.show(shipmentId))}
        >
          <Translate id="react.shipment.wizard.saveAndExit.label" defaultMessage="Save and exit" />
        </button>
      </div>
    </div>
  );
};

export default CreateShipmentPacking;
