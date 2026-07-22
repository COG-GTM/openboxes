import React, { useEffect, useMemo, useState } from 'react';

import { getTranslate } from 'react-localize-redux';
import { useSelector } from 'react-redux';
import { useParams } from 'react-router-dom';
import Alert from 'react-s-alert';

import requisitionApi from 'api/services/RequisitionApi';
import RequisitionHeaderPanel from 'components/requisition/RequisitionHeaderPanel';
import RequisitionSummary from 'components/requisition/RequisitionSummary';
import { REQUISITION_URL } from 'consts/applicationUrls';
import useTranslation from 'hooks/useTranslation';
import { debouncePeopleFetch } from 'utils/option-utils';
import Select from 'utils/Select';
import Translate, { translateWithDefaultMessage } from 'utils/Translate';

const RequisitionPick = () => {
  const { requisitionId } = useParams();
  const [requisition, setRequisition] = useState(null);
  const [availableItems, setAvailableItems] = useState({});
  const [picker, setPicker] = useState(null);
  const [datePicked, setDatePicked] = useState('');
  const [selectedItem, setSelectedItem] = useState(null);
  const [pickQuantities, setPickQuantities] = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useTranslation('requisition', 'default', 'picklist');

  const translate = useSelector(
    (state) => translateWithDefaultMessage(getTranslate(state.localize)),
  );

  const debouncedPeopleFetch = useMemo(() => debouncePeopleFetch(500, 2), []);

  // syncPicklistFields is false when refreshing after a pick-line save so
  // unsaved "Picked by" / "Date picked" input is preserved
  const applyDetails = (data, syncPicklistFields = true) => {
    setRequisition(data);
    if (syncPicklistFields && data?.picklist) {
      setPicker(data.picklist.picker ?? null);
      setDatePicked(data.picklist.datePicked ?? '');
    }
    if (data?.availableItems) {
      setAvailableItems(data.availableItems);
    }
  };

  useEffect(() => {
    requisitionApi.pickRequisition(requisitionId)
      .then(({ data }) => applyDetails(data?.data))
      .catch((err) => {
        setError(err?.response?.data?.errorMessage || 'An error occurred while loading the pick list');
      });
  }, [requisitionId]);

  const openPickDialog = (item) => {
    const quantities = {};
    (availableItems[item.product?.id] ?? []).forEach((availableItem, index) => {
      const existing = (item.picklistItems ?? []).find(
        (picklistItem) => picklistItem.inventoryItemId === availableItem.inventoryItemId
          && (picklistItem.binLocation?.id ?? null) === (availableItem.binLocation?.id ?? null),
      );
      quantities[index] = existing
        ? { id: existing.id, quantity: existing.quantity }
        : { id: null, quantity: '' };
    });
    setPickQuantities(quantities);
    setSelectedItem(item);
  };

  const savePicklistItems = async () => {
    const availableForProduct = availableItems[selectedItem.product?.id] ?? [];
    setSaving(true);
    try {
      await requisitionApi.updatePicklistItems(requisitionId, {
        requisitionItemId: selectedItem.id,
        picklistItems: availableForProduct.map((availableItem, index) => ({
          id: pickQuantities[index]?.id ?? null,
          inventoryItemId: availableItem.inventoryItemId,
          binLocationId: availableItem.binLocation?.id ?? null,
          quantity: parseInt(pickQuantities[index]?.quantity, 10) || 0,
        })).filter((item) => item.id || item.quantity > 0),
      });
      // re-fetch so item quantities and available bin locations stay current
      const { data } = await requisitionApi.pickRequisition(requisitionId);
      applyDetails(data?.data, false);
      setSelectedItem(null);
    } catch (err) {
      const message = err?.response?.data?.errorMessage;
      if (message) {
        Alert.error(message);
      }
    } finally {
      setSaving(false);
    }
  };

  const savePicklist = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      await requisitionApi.updatePicklist(requisitionId, {
        pickerId: picker?.id ?? null,
        datePicked: datePicked || null,
      });
      window.location = REQUISITION_URL.picked(requisitionId);
    } catch (err) {
      const message = err?.response?.data?.errorMessage;
      if (message) {
        Alert.error(message);
      }
      setSaving(false);
    }
  };

  if (error) {
    return <div className="alert alert-danger m-3" role="alert">{error}</div>;
  }

  if (!requisition) {
    return null;
  }

  return (
    <div className="d-flex flex-column m-3">
      <RequisitionSummary requisition={requisition} currentStep="pick" />
      <div className="row">
        <div className="col-md-4">
          <RequisitionHeaderPanel requisition={requisition} />
          <div className="card mt-3">
            <div className="card-header">
              <Translate id="react.requisition.picklist.label" defaultMessage="Pick list" />
            </div>
            <form className="card-body" onSubmit={savePicklist}>
              <div className="form-group">
                <label htmlFor="picklist-picker-select">
                  <Translate id="react.requisition.pickedBy.label" defaultMessage="Picked by" />
                </label>
                <Select
                  async
                  loadOptions={debouncedPeopleFetch}
                  value={picker}
                  onChange={(value) => setPicker(value)}
                  valueKey="id"
                  labelKey="name"
                  id="picklist-picker-select"
                  dataTestId="picklist-picker-select"
                />
              </div>
              <div className="form-group">
                <label htmlFor="picklist-date-picked">
                  <Translate id="react.requisition.datePicked.label" defaultMessage="Date picked" />
                </label>
                <input
                  type="date"
                  id="picklist-date-picked"
                  className="form-control"
                  value={datePicked}
                  onChange={(event) => setDatePicked(event.target.value)}
                  data-testid="picklist-date-picked"
                />
              </div>
              <div className="d-flex justify-content-center">
                <a className="btn btn-outline-secondary mr-2" href={REQUISITION_URL.review(requisitionId)}>
                  <Translate id="react.default.button.back.label" defaultMessage="Back" />
                </a>
                <button type="submit" className="btn btn-primary" disabled={saving} data-testid="picklist-complete-button">
                  <Translate id="react.default.button.next.label" defaultMessage="Next" />
                </button>
              </div>
            </form>
          </div>
        </div>
        <div className="col-md-8">
          <div className="card">
            <div className="card-header">
              <Translate id="react.requisition.pickRequisitionItems.label" defaultMessage="Pick requisition items" />
            </div>
            <table className="table table-sm table-striped mb-0" data-testid="requisition-pick-table">
              <thead>
                <tr>
                  <th>{translate('react.product.productCode.label', 'Code')}</th>
                  <th>{translate('react.product.label', 'Product')}</th>
                  <th>{translate('react.requisition.quantityApproved.label', 'Approved')}</th>
                  <th>{translate('react.requisition.quantityPicked.label', 'Picked')}</th>
                  <th>{translate('react.requisition.quantityRemaining.label', 'Remaining')}</th>
                  <th>{translate('react.requisition.picklistItems.label', 'Pick list items')}</th>
                  <th aria-label="actions" />
                </tr>
              </thead>
              <tbody>
                {(requisition.requisitionItems ?? []).map((item) => (
                  <tr key={item.id}>
                    <td>{item.product?.productCode}</td>
                    <td>{item.product?.name}</td>
                    <td>{item.quantity - (item.quantityCanceled ?? 0)}</td>
                    <td>{item.quantityPicked}</td>
                    <td>{item.quantityRemaining}</td>
                    <td>
                      {(item.picklistItems ?? []).map((picklistItem) => (
                        <div key={picklistItem.id} className="small">
                          {`${picklistItem.quantity} x ${picklistItem.lotNumber || 'default'}`}
                          {picklistItem.binLocation ? ` [${picklistItem.binLocation.name}]` : ''}
                        </div>
                      ))}
                    </td>
                    <td>
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-primary"
                        onClick={() => openPickDialog(item)}
                        data-testid={`requisition-pick-button-${item.id}`}
                      >
                        <Translate id="react.requisition.button.pick.label" defaultMessage="Pick" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      {selectedItem && (
        <div
          className="modal d-block"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
          role="dialog"
          data-testid="requisition-pick-dialog"
        >
          <div className="modal-dialog modal-lg" role="document">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  {`${selectedItem.product?.productCode} - ${selectedItem.product?.name}`}
                </h5>
                <button type="button" className="close" onClick={() => setSelectedItem(null)}>
                  <span>&times;</span>
                </button>
              </div>
              <div className="modal-body">
                <table className="table table-sm">
                  <thead>
                    <tr>
                      <th>{translate('react.requisition.lotNumber.label', 'Lot number')}</th>
                      <th>{translate('react.requisition.expirationDate.label', 'Expiration date')}</th>
                      <th>{translate('react.requisition.binLocation.label', 'Bin location')}</th>
                      <th>{translate('react.requisition.quantityAvailable.label', 'Available')}</th>
                      <th>{translate('react.requisition.quantityPicked.label', 'Picked')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(availableItems[selectedItem.product?.id] ?? [])
                      .map((availableItem, index) => (
                        <tr key={`${availableItem.inventoryItemId}-${availableItem.binLocation?.id ?? 'default'}`}>
                          <td>{availableItem.lotNumber || 'default'}</td>
                          <td>{availableItem.expirationDate}</td>
                          <td>{availableItem.binLocation?.name || 'Default'}</td>
                          <td>{availableItem.quantityAvailable}</td>
                          <td style={{ width: '120px' }}>
                            <input
                              type="number"
                              min="0"
                              className="form-control form-control-sm"
                              value={pickQuantities[index]?.quantity ?? ''}
                              onChange={(event) => setPickQuantities((previous) => ({
                                ...previous,
                                [index]: { ...previous[index], quantity: event.target.value },
                              }))}
                              data-testid={`pick-dialog-quantity-${index}`}
                            />
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={() => setSelectedItem(null)}
                >
                  <Translate id="react.default.button.cancel.label" defaultMessage="Cancel" />
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={saving}
                  onClick={savePicklistItems}
                  data-testid="pick-dialog-save-button"
                >
                  <Translate id="react.default.button.save.label" defaultMessage="Save" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RequisitionPick;
