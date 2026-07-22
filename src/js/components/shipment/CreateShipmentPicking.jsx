import React, { useCallback, useEffect, useState } from 'react';

import { getTranslate } from 'react-localize-redux';
import { useSelector } from 'react-redux';
import { useHistory, useParams } from 'react-router-dom';
import Alert from 'react-s-alert';

import shipmentApi from 'api/services/ShipmentApi';
import ShipmentWizardHeader from 'components/shipment/ShipmentWizardHeader';
import { CREATE_SHIPMENT_URL, SHIPMENT_SHOW_URL } from 'consts/applicationUrls';
import useTranslation from 'hooks/useTranslation';
import Translate, { translateWithDefaultMessage } from 'utils/Translate';

const CreateShipmentPicking = () => {
  const { shipmentId } = useParams();
  const history = useHistory();
  const [data, setData] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [selectedBin, setSelectedBin] = useState(null);
  const [pickQuantity, setPickQuantity] = useState('');
  const [validationErrors, setValidationErrors] = useState(null);
  const [validationValid, setValidationValid] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const isSuperuser = useSelector((state) => state.session.isSuperuser);
  const translate = useSelector(
    (state) => translateWithDefaultMessage(getTranslate(state.localize)),
  );

  useTranslation('shipment', 'default');

  const fetchPicklist = useCallback(() => {
    setValidationValid(null);
    setValidationErrors(null);
    shipmentApi.getShipmentPicklist(shipmentId)
      .then((response) => setData(response.data?.data))
      .catch((err) => {
        setError(err?.response?.data?.errorMessage
          || translate('react.default.errors.error.label', 'An error occurred'));
      });
  }, [shipmentId]);

  useEffect(() => {
    fetchPicklist();
  }, [fetchPicklist]);

  const handleError = (err) => {
    const errorData = err?.response?.data;
    Alert.error(errorData?.errors?.join('<br/>') || errorData?.errorMessage
      || translate('react.default.errors.error.label', 'An error occurred'));
  };

  const selectItem = (item) => {
    setSelectedItem(item);
    setSelectedBin(null);
    setPickQuantity(item.quantity ?? '');
  };

  const pickItem = async (event) => {
    event.preventDefault();
    if (!selectedItem || !selectedBin) {
      return;
    }
    setSaving(true);
    try {
      await shipmentApi.pickShipmentItem(shipmentId, selectedItem.id, {
        inventoryItemId: selectedBin.inventoryItem?.id,
        binLocationId: selectedBin.binLocation?.id || null,
        quantity: Number(pickQuantity),
      });
      setSelectedItem(null);
      fetchPicklist();
    } catch (err) {
      handleError(err);
    } finally {
      setSaving(false);
    }
  };

  const splitItem = async (itemId) => {
    setSaving(true);
    try {
      await shipmentApi.splitShipmentItem(shipmentId, itemId);
      fetchPicklist();
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
      setSelectedItem(null);
      fetchPicklist();
    } catch (err) {
      handleError(err);
    } finally {
      setSaving(false);
    }
  };

  const validatePicklist = async () => {
    setSaving(true);
    try {
      const response = await shipmentApi.validatePicklist(shipmentId);
      setValidationValid(response.data?.data?.valid);
      setValidationErrors(response.data?.data?.errors ?? []);
    } catch (err) {
      handleError(err);
    } finally {
      setSaving(false);
    }
  };

  const clearPicklist = async () => {
    setSaving(true);
    try {
      await shipmentApi.clearPicklist(shipmentId);
      fetchPicklist();
    } catch (err) {
      handleError(err);
    } finally {
      setSaving(false);
    }
  };

  const next = async () => {
    setSaving(true);
    try {
      const response = await shipmentApi.validatePicklist(shipmentId);
      if (response.data?.data?.valid) {
        history.push(CREATE_SHIPMENT_URL.sending(shipmentId));
        return;
      }
      setValidationValid(false);
      setValidationErrors(response.data?.data?.errors ?? []);
    } catch (err) {
      handleError(err);
    } finally {
      setSaving(false);
    }
  };

  if (error) {
    return <div className="alert alert-danger m-3" role="alert">{error}</div>;
  }

  if (!data) {
    return null;
  }

  const binOptions = selectedItem
    ? data.binLocationsByProduct?.[selectedItem.product?.id] ?? []
    : [];

  return (
    <div className="d-flex flex-column m-3" data-testid="create-shipment-picking">
      <ShipmentWizardHeader shipment={data} currentStep="picking" />
      {validationValid === true && (
        <div className="alert alert-success" role="alert" data-testid="shipment-picking-validation-success">
          <Translate id="react.shipment.wizard.picklistValidated.label" defaultMessage="Picklist validated successfully" />
        </div>
      )}
      {validationValid === false && (
        <div className="alert alert-danger" role="alert" data-testid="shipment-picking-validation-errors">
          {(validationErrors ?? []).map((validationError) => (
            <div key={validationError}>{validationError}</div>
          ))}
        </div>
      )}
      <div className="card mb-3">
        <div className="card-header">
          <Translate id="react.shipment.wizard.pickShipmentItems.label" defaultMessage="Pick shipment items" />
        </div>
        <div className="card-body">
          <table className="table table-sm table-bordered" data-testid="shipment-picking-items">
            <thead>
              <tr>
                <th>{translate('react.shipment.container.label', 'Container')}</th>
                <th>{translate('react.shipment.item.product.label', 'Product')}</th>
                <th>{translate('react.shipment.item.lotNumber.label', 'Lot')}</th>
                <th>{translate('react.shipment.item.expirationDate.label', 'Expires')}</th>
                <th>{translate('react.shipment.item.binLocation.label', 'Bin location')}</th>
                <th className="text-right">{translate('react.shipment.item.quantity.label', 'Quantity')}</th>
                <th>{translate('react.shipment.item.uom.label', 'UOM')}</th>
                <th aria-label="actions" />
              </tr>
            </thead>
            <tbody>
              {!(data.shipmentItems ?? []).length && (
                <tr>
                  <td colSpan="8" className="text-center text-muted">
                    {translate('react.default.none.label', 'None')}
                  </td>
                </tr>
              )}
              {(data.shipmentItems ?? []).map((item) => (
                <tr key={item.id} className={selectedItem?.id === item.id ? 'table-active' : ''}>
                  <td>{item.container?.name}</td>
                  <td>
                    {item.product?.productCode}
                    {' '}
                    {item.product?.name}
                  </td>
                  <td>{item.inventoryItem?.lotNumber}</td>
                  <td>{item.inventoryItem?.expirationDate}</td>
                  <td>{item.binLocation?.name}</td>
                  <td className="text-right">{item.quantity}</td>
                  <td>{item.product?.unitOfMeasure || 'EA'}</td>
                  <td className="text-right">
                    {data.isOrigin && (
                      <>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-primary mr-1"
                          disabled={saving}
                          onClick={() => selectItem(item)}
                        >
                          <Translate id="react.shipment.wizard.pick.label" defaultMessage="Pick" />
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-secondary mr-1"
                          disabled={saving}
                          onClick={() => splitItem(item.id)}
                        >
                          <Translate id="react.shipment.wizard.split.label" defaultMessage="Split" />
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-danger"
                          disabled={saving}
                          onClick={() => deleteItem(item.id)}
                        >
                          <Translate id="react.default.button.delete.label" defaultMessage="Delete" />
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {selectedItem && (
            <form className="border rounded p-3" onSubmit={pickItem} data-testid="shipment-picking-editor">
              <h6>
                {selectedItem.product?.productCode}
                {' '}
                {selectedItem.product?.name}
              </h6>
              <table className="table table-sm table-bordered w-auto">
                <thead>
                  <tr>
                    <th aria-label="select" />
                    <th>{translate('react.shipment.item.binLocation.label', 'Bin location')}</th>
                    <th>{translate('react.shipment.item.lotNumber.label', 'Lot')}</th>
                    <th>{translate('react.shipment.item.expirationDate.label', 'Expires')}</th>
                    <th className="text-right">{translate('react.shipment.wizard.quantityAvailable.label', 'Quantity available')}</th>
                  </tr>
                </thead>
                <tbody>
                  {!binOptions.length && (
                    <tr>
                      <td colSpan="5" className="text-center text-muted">
                        {translate('react.default.none.label', 'None')}
                      </td>
                    </tr>
                  )}
                  {binOptions.map((binOption) => {
                    const key = `${binOption.binLocation?.id ?? 'default'}-${binOption.inventoryItem?.id}`;
                    return (
                      <tr key={key}>
                        <td className="text-center">
                          <input
                            type="radio"
                            name="shipment-picking-bin"
                            checked={selectedBin === binOption}
                            onChange={() => setSelectedBin(binOption)}
                            aria-label={binOption.binLocation?.name ?? 'Default'}
                          />
                        </td>
                        <td>{binOption.binLocation?.name ?? translate('react.default.default.label', 'Default')}</td>
                        <td>{binOption.inventoryItem?.lotNumber}</td>
                        <td>{binOption.inventoryItem?.expirationDate}</td>
                        <td className="text-right">{binOption.quantity}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <div className="form-row align-items-end">
                <div className="col-sm-2">
                  <label htmlFor="shipment-picking-quantity-input">
                    <Translate id="react.shipment.item.quantity.label" defaultMessage="Quantity" />
                  </label>
                  <input
                    id="shipment-picking-quantity-input"
                    type="number"
                    min="0"
                    className="form-control"
                    value={pickQuantity}
                    onChange={(event) => setPickQuantity(event.target.value)}
                  />
                </div>
                <div className="col-sm-4">
                  <button type="submit" className="btn btn-primary mr-2" disabled={saving || !selectedBin} data-testid="shipment-picking-save-button">
                    <Translate id="react.default.button.save.label" defaultMessage="Save" />
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    disabled={saving}
                    onClick={() => setSelectedItem(null)}
                  >
                    <Translate id="react.default.button.cancel.label" defaultMessage="Cancel" />
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>
      <div className="d-flex">
        <button
          type="button"
          className="btn btn-outline-secondary mr-2"
          onClick={() => history.push(CREATE_SHIPMENT_URL.packing(shipmentId))}
        >
          <Translate id="react.default.button.back.label" defaultMessage="Back" />
        </button>
        <button
          type="button"
          className="btn btn-primary mr-2"
          disabled={saving}
          onClick={next}
          data-testid="shipment-picking-next-button"
        >
          <Translate id="react.default.button.next.label" defaultMessage="Next" />
        </button>
        <button
          type="button"
          className="btn btn-outline-secondary mr-2"
          disabled={saving}
          onClick={validatePicklist}
          data-testid="shipment-picking-validate-button"
        >
          <Translate id="react.shipment.wizard.validatePicklist.label" defaultMessage="Validate picklist" />
        </button>
        {isSuperuser && (
          <button
            type="button"
            className="btn btn-outline-danger mr-2"
            disabled={saving}
            onClick={clearPicklist}
            data-testid="shipment-picking-clear-button"
          >
            <Translate id="react.shipment.wizard.clearPicklist.label" defaultMessage="Clear picklist" />
          </button>
        )}
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

export default CreateShipmentPicking;
