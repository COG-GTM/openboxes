import React, { useEffect, useState } from 'react';

import { getTranslate } from 'react-localize-redux';
import { useSelector } from 'react-redux';
import { useParams } from 'react-router-dom';

import { TRANSACTION_ENTRY_API_BY_ID, TRANSACTION_ENTRY_BY_ID } from 'api/urls';
import { INVENTORY_URL } from 'consts/applicationUrls';
import useTranslation from 'hooks/useTranslation';
import apiClient from 'utils/apiClient';
import Select from 'utils/Select';
import Translate, { translateWithDefaultMessage } from 'utils/Translate';
import PageWrapper from 'wrappers/PageWrapper';

import 'components/inventory/styles.scss';

const EditTransactionEntryPage = () => {
  useTranslation('inventory');

  const { id } = useParams();

  const [entry, setEntry] = useState(null);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [message, setMessage] = useState(null);

  const { translate } = useSelector((state) => ({
    translate: translateWithDefaultMessage(getTranslate(state.localize)),
  }));

  useEffect(() => {
    apiClient.get(TRANSACTION_ENTRY_API_BY_ID(id))
      .then((response) => setEntry(response.data.data))
      .catch((error) => setLoadError(error.response?.status === 404 ? 'notFound' : 'error'));
  }, [id]);

  const save = async () => {
    if (entry.quantity == null) {
      setMessage({
        type: 'danger',
        text: translate('react.inventory.transaction.quantityRequired.label', 'Please enter a quantity for every line'),
      });
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      const payload = {
        binLocation: entry.binLocation?.id ? { id: entry.binLocation.id } : null,
        inventoryItem: { id: entry.inventoryItem?.id },
        quantity: entry.quantity,
        comments: entry.comments || '',
      };
      const response = await apiClient.put(TRANSACTION_ENTRY_API_BY_ID(id), payload);
      setEntry(response.data.data);
      setMessage({ type: 'success', text: translate('react.inventory.transaction.saved.label', 'Transaction saved') });
    } catch (error) {
      const text = error.response?.data?.errorMessage
        || error.response?.data?.errorMessages?.join(', ')
        || translate('react.inventory.transaction.saveError.label', 'Unable to save transaction');
      setMessage({ type: 'danger', text });
    } finally {
      setSaving(false);
    }
  };

  const deleteEntry = async () => {
    // eslint-disable-next-line no-alert
    if (!window.confirm(translate('react.default.button.delete.confirm.message', 'Are you sure?'))) {
      return;
    }
    try {
      await apiClient.delete(TRANSACTION_ENTRY_BY_ID(entry.transaction.id, entry.id));
      window.location.assign(INVENTORY_URL.showTransaction(entry.transaction.id));
    } catch (error) {
      const text = error.response?.data?.errorMessage
        || error.response?.data?.errorMessages?.join(', ')
        || translate('react.inventory.transactions.deleteFailed.label', 'Transaction could not be deleted');
      setMessage({ type: 'danger', text });
    }
  };

  if (!entry) {
    return (
      <PageWrapper className="inventory-list-page">
        <div className="p-3">
          {loadError === 'notFound' && (
            <div className="alert alert-danger" role="alert">
              <Translate id="react.inventory.transactionEntry.notFound.label" defaultMessage="Transaction entry not found" />
            </div>
          )}
          {loadError === 'error' && (
            <div className="alert alert-danger" role="alert">
              <Translate id="react.default.errors.error.label" defaultMessage="An error occurred" />
            </div>
          )}
          {!loadError && (
            <Translate id="react.default.loading.label" defaultMessage="Loading..." />
          )}
        </div>
      </PageWrapper>
    );
  }

  const inventoryItemOptions = (entry.availableInventoryItems || []).map((it) => ({
    id: it.id,
    label: it.lotNumber || translate('react.inventory.noLotNumber.label', 'No lot number'),
    expirationDate: it.expirationDate,
  }));
  const selectedInventoryItem = inventoryItemOptions
    .find((it) => it.id === entry.inventoryItem?.id);
  const binLocationOptions = (entry.availableBinLocations || []).map((it) => ({
    id: it.id,
    label: it.name,
  }));

  return (
    <PageWrapper className="inventory-list-page edit-transaction-page">
      <div className="list-page-header p-3 d-flex align-items-center justify-content-between">
        <h5 className="m-0">
          <Translate id="react.inventory.editTransactionEntry.title.label" defaultMessage="Edit transaction entry" />
          {entry.product && ` — ${entry.product.productCode} ${entry.product.name}`}
        </h5>
        <a href={INVENTORY_URL.showTransaction(entry.transaction.id)} className="btn btn-outline-secondary btn-sm">
          <Translate id="react.inventory.transactionEntry.backToTransaction.label" defaultMessage="Back to transaction" />
        </a>
      </div>
      {message && (
        <div className={`alert alert-${message.type} mx-3 mt-3`} role="alert">
          {message.text}
        </div>
      )}
      <div className="p-3 edit-transaction-header">
        <h6>
          <Translate id="react.inventory.transaction.header.label" defaultMessage="Transaction header" />
        </h6>
        <dl className="row mb-0" data-testid="transaction-summary">
          <dt className="col-sm-3">
            <Translate id="react.inventory.transaction.label" defaultMessage="Transaction" />
          </dt>
          <dd className="col-sm-9">
            {entry.transaction.transactionNumber || entry.transaction.id}
          </dd>
          <dt className="col-sm-3">
            <Translate id="react.inventory.transaction.type.label" defaultMessage="Transaction type" />
          </dt>
          <dd className="col-sm-9">{entry.transaction.transactionType?.name}</dd>
          <dt className="col-sm-3">
            <Translate id="react.inventory.transaction.date.label" defaultMessage="Date" />
          </dt>
          <dd className="col-sm-9">{entry.transaction.transactionDate}</dd>
        </dl>
      </div>
      <div className="p-3">
        <h6>
          <Translate id="react.inventory.transactionEntry.label" defaultMessage="Transaction entry" />
        </h6>
        <div className="form-row">
          <div className="form-group col-md-4">
            <label htmlFor="entry-product">
              <Translate id="react.inventory.product.label" defaultMessage="Product" />
            </label>
            <input
              id="entry-product"
              type="text"
              className="form-control"
              value={`${entry.product?.productCode || ''} ${entry.product?.name || ''}`.trim()}
              readOnly
            />
          </div>
          <div className="form-group col-md-4">
            <label htmlFor="entry-bin-location">
              <Translate id="react.inventory.binLocation.label" defaultMessage="Bin location" />
            </label>
            <Select
              id="entry-bin-location"
              options={binLocationOptions}
              valueKey="id"
              labelKey="label"
              value={entry.binLocation?.id
                ? { id: entry.binLocation.id, label: entry.binLocation.name }
                : null}
              onChange={(value) => setEntry({
                ...entry,
                binLocation: value ? { id: value.id, name: value.label } : null,
              })}
            />
          </div>
          <div className="form-group col-md-4">
            <label htmlFor="entry-inventory-item">
              <Translate id="react.inventory.lotNumber.label" defaultMessage="Lot number" />
            </label>
            <Select
              id="entry-inventory-item"
              options={inventoryItemOptions}
              valueKey="id"
              labelKey="label"
              value={selectedInventoryItem || (entry.inventoryItem?.id
                ? { id: entry.inventoryItem.id, label: entry.inventoryItem.lotNumber }
                : null)}
              onChange={(value) => setEntry({
                ...entry,
                inventoryItem: value
                  ? {
                    id: value.id,
                    lotNumber: value.label,
                    expirationDate: value.expirationDate,
                  }
                  : entry.inventoryItem,
              })}
            />
          </div>
        </div>
        <div className="form-row">
          <div className="form-group col-md-4">
            <label htmlFor="entry-quantity">
              <Translate id="react.inventory.quantity.label" defaultMessage="Quantity" />
            </label>
            <input
              id="entry-quantity"
              type="number"
              className="form-control"
              value={entry.quantity ?? ''}
              onChange={(e) => setEntry({
                ...entry,
                quantity: e.target.value === '' ? null : Number(e.target.value),
              })}
            />
          </div>
          <div className="form-group col-md-4">
            <label htmlFor="entry-uom">
              <Translate id="react.inventory.unitOfMeasure.label" defaultMessage="Unit of measure" />
            </label>
            <input
              id="entry-uom"
              type="text"
              className="form-control"
              value={entry.product?.unitOfMeasure || ''}
              readOnly
            />
          </div>
        </div>
        <div className="form-group">
          <label htmlFor="entry-comments">
            <Translate id="react.inventory.transactionEntry.comments.label" defaultMessage="Comments" />
          </label>
          <textarea
            id="entry-comments"
            className="form-control"
            rows={3}
            value={entry.comments || ''}
            onChange={(e) => setEntry({ ...entry, comments: e.target.value })}
          />
        </div>
        <div className="d-flex">
          <button
            type="button"
            className="btn btn-primary mr-2"
            disabled={saving}
            onClick={save}
          >
            <Translate id="react.default.button.update.label" defaultMessage="Update" />
          </button>
          <button
            type="button"
            className="btn btn-outline-danger mr-2"
            onClick={deleteEntry}
          >
            <Translate id="react.default.button.delete.label" defaultMessage="Delete" />
          </button>
          <a href={INVENTORY_URL.showTransaction(entry.transaction.id)} className="btn btn-outline-secondary">
            <Translate id="react.default.button.cancel.label" defaultMessage="Cancel" />
          </a>
        </div>
      </div>
    </PageWrapper>
  );
};

export default EditTransactionEntryPage;
