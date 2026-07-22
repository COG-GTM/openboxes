import React, { useCallback, useEffect, useState } from 'react';

import { getTranslate } from 'react-localize-redux';
import { useSelector } from 'react-redux';
import { useParams } from 'react-router-dom';
import Alert from 'react-s-alert';

import requisitionApi from 'api/services/RequisitionApi';
import RequisitionSummary from 'components/requisition/RequisitionSummary';
import { REQUISITION_URL } from 'consts/applicationUrls';
import useTranslation from 'hooks/useTranslation';
import Translate, { translateWithDefaultMessage } from 'utils/Translate';

const RequisitionProcess = () => {
  const { requisitionId } = useParams();
  const [requisition, setRequisition] = useState(null);
  // picked quantity keyed by `${requisitionItemId}:${inventoryItemId}`
  const [pickedQuantities, setPickedQuantities] = useState({});
  const [picklistItemIds, setPicklistItemIds] = useState({});
  const [picklistId, setPicklistId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const translate = useSelector(
    (state) => translateWithDefaultMessage(getTranslate(state.localize)),
  );

  useTranslation('requisition', 'default');

  const fetchRequisition = useCallback(() => {
    requisitionApi.getRequisitionProcess(requisitionId)
      .then(({ data }) => {
        const fetched = data?.data;
        setRequisition(fetched);
        setPicklistId(fetched?.picklist?.id ?? null);
        const quantities = {};
        const itemIds = {};
        fetched?.picklist?.picklistItems?.forEach((picklistItem) => {
          const key = `${picklistItem.requisitionItem?.id}:${picklistItem.inventoryItem?.id}`;
          quantities[key] = picklistItem.quantity;
          itemIds[key] = picklistItem.id;
        });
        setPickedQuantities(quantities);
        setPicklistItemIds(itemIds);
      })
      .catch((err) => {
        setError(err?.response?.data?.errorMessage
          || translate('react.default.errors.error.label', 'An error occurred'));
      });
  }, [requisitionId]);

  useEffect(() => {
    fetchRequisition();
  }, [fetchRequisition]);

  const totalPicked = (requisitionItemId) =>
    Object.entries(pickedQuantities)
      .filter(([key]) => key.startsWith(`${requisitionItemId}:`))
      .reduce((sum, [, quantity]) => sum + (parseInt(quantity, 10) || 0), 0);

  const save = async () => {
    setSaving(true);
    try {
      const picklistItems = Object.entries(pickedQuantities)
        .map(([key, quantity]) => {
          const [requisitionItemId, inventoryItemId] = key.split(':');
          return {
            id: picklistItemIds[key] || null,
            requisitionItem: { id: requisitionItemId },
            inventoryItem: { id: inventoryItemId },
            quantity: parseInt(quantity, 10) || 0,
          };
        })
        .filter((item) => item.quantity > 0 || item.id);
      const payload = {
        id: picklistId,
        requisition: { id: requisitionId },
        picklistItems,
      };
      await requisitionApi.savePicklist(payload);
      Alert.success(translate('react.default.alert.saveSuccess.label', 'Saved successfully'));
      fetchRequisition();
    } catch (err) {
      const message = err?.response?.data?.errorMessage;
      if (message) {
        Alert.error(message);
      }
    } finally {
      setSaving(false);
    }
  };

  if (error) {
    return <div className="alert alert-danger m-3" role="alert">{error}</div>;
  }

  if (!requisition) {
    return null;
  }

  const originalItems = requisition.requisitionItems?.filter((item) => item.isOriginal) ?? [];

  return (
    <div className="d-flex flex-column m-3">
      <RequisitionSummary requisition={requisition} currentStep="pick" />
      <div className="card">
        <div className="card-header d-flex justify-content-between align-items-center">
          <Translate id="react.requisition.process.label" defaultMessage="Process requisition" />
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={save}
            disabled={saving}
            data-testid="requisition-process-save-button"
          >
            <Translate id="react.default.button.save.label" defaultMessage="Save" />
          </button>
        </div>
        <div className="card-body p-0" data-testid="requisition-process-items">
          {originalItems.map((item) => (
            <div key={item.id} className="border-bottom p-3">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <strong>
                  {item.product?.productCode}
                  {' '}
                  {item.product?.name}
                </strong>
                <span>
                  <Translate id="react.requisition.item.requested.label" defaultMessage="Requested" />
                  {': '}
                  {item.quantity}
                  {' | '}
                  <Translate id="react.requisition.item.picked.label" defaultMessage="Picked" />
                  {': '}
                  {totalPicked(item.id)}
                  {' | '}
                  <Translate id="react.requisition.item.remaining.label" defaultMessage="Remaining" />
                  {': '}
                  {(item.quantity || 0) - totalPicked(item.id)}
                </span>
              </div>
              <table className="table table-sm table-bordered mb-0">
                <thead>
                  <tr>
                    <th>{translate('react.requisition.item.lotNumber.label', 'Lot')}</th>
                    <th>{translate('react.requisition.item.expirationDate.label', 'Expiration date')}</th>
                    <th className="text-right">{translate('react.requisition.item.quantityOnHand.label', 'On hand')}</th>
                    <th className="text-right">{translate('react.requisition.item.picked.label', 'Picked')}</th>
                  </tr>
                </thead>
                <tbody>
                  {(requisition.productInventoryItemsMap?.[item.product?.id] ?? [])
                    .map((inventoryItem) => {
                      const key = `${item.id}:${inventoryItem.inventoryItemId}`;
                      return (
                        <tr key={inventoryItem.inventoryItemId}>
                          <td>{inventoryItem.lotNumber}</td>
                          <td>{inventoryItem.expirationDate}</td>
                          <td className="text-right">{inventoryItem.quantityOnHand}</td>
                          <td className="text-right" style={{ width: '10rem' }}>
                            <input
                              type="number"
                              min="0"
                              className="form-control form-control-sm text-right"
                              value={pickedQuantities[key] ?? ''}
                              onChange={(event) => setPickedQuantities((previous) => ({
                                ...previous,
                                [key]: event.target.value,
                              }))}
                            />
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      </div>
      <div className="d-flex justify-content-center mt-3">
        <a className="btn btn-outline-secondary mr-2" href={REQUISITION_URL.review(requisitionId)}>
          <Translate id="react.default.button.back.label" defaultMessage="Back" />
        </a>
        <a className="btn btn-primary" href={REQUISITION_URL.confirm(requisitionId)} data-testid="requisition-process-next">
          <Translate id="react.default.button.next.label" defaultMessage="Next" />
        </a>
      </div>
    </div>
  );
};

export default RequisitionProcess;
