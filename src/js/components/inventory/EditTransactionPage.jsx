import React, { useEffect, useState } from 'react';

import { getTranslate } from 'react-localize-redux';
import { useSelector } from 'react-redux';
import { useParams } from 'react-router-dom';

import {
  TRANSACTION_BY_ID,
  TRANSACTION_ENTRY_BY_ID,
  TRANSACTION_LOCATION_OPTIONS,
  TRANSACTION_TYPE_OPTIONS,
} from 'api/urls';
import { INVENTORY_ITEM_URL, INVENTORY_URL } from 'consts/applicationUrls';
import useTranslation from 'hooks/useTranslation';
import apiClient from 'utils/apiClient';
import Select from 'utils/Select';
import Translate, { translateWithDefaultMessage } from 'utils/Translate';
import PageWrapper from 'wrappers/PageWrapper';

import 'components/inventory/styles.scss';

const EditTransactionPage = () => {
  useTranslation('inventory');

  const { id } = useParams();

  const [transaction, setTransaction] = useState(null);
  const [transactionTypes, setTransactionTypes] = useState([]);
  const [locations, setLocations] = useState([]);
  const [saving, setSaving] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [message, setMessage] = useState(null);

  const { translate } = useSelector((state) => ({
    translate: translateWithDefaultMessage(getTranslate(state.localize)),
  }));

  useEffect(() => {
    apiClient.get(TRANSACTION_BY_ID(id))
      .then((response) => setTransaction(response.data.data))
      .catch(() => setNotFound(true));
    apiClient.get(TRANSACTION_TYPE_OPTIONS)
      .then((response) => setTransactionTypes(response.data.data));
    apiClient.get(TRANSACTION_LOCATION_OPTIONS)
      .then((response) => setLocations(response.data.data));
  }, [id]);

  const updateEntry = (entryId, values) => {
    setTransaction({
      ...transaction,
      transactionEntries: transaction.transactionEntries.map((entry) => (
        entry.id === entryId ? { ...entry, ...values } : entry
      )),
    });
  };

  const save = async () => {
    if (transaction.transactionEntries.some((entry) => entry.quantity == null)) {
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
        transactionDate: transaction.transactionDate,
        transactionType: transaction.transactionType?.id
          ? { id: transaction.transactionType.id }
          : null,
        source: transaction.source?.id ? { id: transaction.source.id } : null,
        destination: transaction.destination?.id
          ? { id: transaction.destination.id }
          : null,
        comment: transaction.comment || '',
        transactionEntries: transaction.transactionEntries.map((entry) => ({
          id: entry.id,
          inventoryItem: { id: entry.inventoryItem?.id },
          quantity: entry.quantity,
        })),
      };
      const response = await apiClient.put(TRANSACTION_BY_ID(id), payload);
      setTransaction(response.data.data);
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

  const deleteEntry = async (entryId) => {
    try {
      const response = await apiClient.delete(TRANSACTION_ENTRY_BY_ID(id, entryId));
      setTransaction(response.data.data);
    } catch (error) {
      const text = error.response?.data?.errorMessage
        || error.response?.data?.errorMessages?.join(', ')
        || translate('react.inventory.transaction.saveError.label', 'Unable to save transaction');
      setMessage({ type: 'danger', text });
    }
  };

  if (!transaction) {
    return (
      <PageWrapper className="inventory-list-page">
        <div className="p-3">
          {notFound ? (
            <div className="alert alert-danger" role="alert">
              <Translate id="react.inventory.transaction.notFound.label" defaultMessage="Transaction not found" />
            </div>
          ) : (
            <Translate id="react.default.loading.label" defaultMessage="Loading..." />
          )}
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper className="inventory-list-page edit-transaction-page">
      <div className="list-page-header p-3 d-flex align-items-center justify-content-between">
        <h5 className="m-0">
          <Translate id="react.inventory.editTransaction.title.label" defaultMessage="Edit transaction" />
          {transaction.transactionNumber && ` — ${transaction.transactionNumber}`}
        </h5>
        <a href={INVENTORY_URL.listTransactions()} className="btn btn-outline-secondary btn-sm">
          <Translate id="react.inventory.transaction.backToList.label" defaultMessage="Back to transactions" />
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
        <div className="form-row">
          <div className="form-group col-md-3">
            <label htmlFor="transaction-date">
              <Translate id="react.inventory.transaction.date.label" defaultMessage="Date" />
            </label>
            <input
              id="transaction-date"
              type="text"
              className="form-control"
              value={transaction.transactionDate || ''}
              onChange={(e) => setTransaction({ ...transaction, transactionDate: e.target.value })}
            />
          </div>
          <div className="form-group col-md-3">
            <label htmlFor="transaction-type">
              <Translate id="react.inventory.transaction.type.label" defaultMessage="Transaction type" />
            </label>
            <Select
              id="transaction-type"
              options={transactionTypes.map((it) => ({ id: it.id, label: it.name }))}
              valueKey="id"
              labelKey="label"
              value={transaction.transactionType?.id
                ? { id: transaction.transactionType.id, label: transaction.transactionType.name }
                : null}
              onChange={(value) => setTransaction({
                ...transaction,
                transactionType: value ? { id: value.id, name: value.label } : null,
              })}
            />
          </div>
          <div className="form-group col-md-3">
            <label htmlFor="transaction-source">
              <Translate id="react.inventory.transaction.source.label" defaultMessage="Source" />
            </label>
            <Select
              id="transaction-source"
              options={locations.map((it) => ({ id: it.id, label: it.name }))}
              valueKey="id"
              labelKey="label"
              value={transaction.source?.id
                ? { id: transaction.source.id, label: transaction.source.name }
                : null}
              onChange={(value) => setTransaction({
                ...transaction,
                source: value ? { id: value.id, name: value.label } : null,
              })}
            />
          </div>
          <div className="form-group col-md-3">
            <label htmlFor="transaction-destination">
              <Translate id="react.inventory.transaction.destination.label" defaultMessage="Destination" />
            </label>
            <Select
              id="transaction-destination"
              options={locations.map((it) => ({ id: it.id, label: it.name }))}
              valueKey="id"
              labelKey="label"
              value={transaction.destination?.id
                ? { id: transaction.destination.id, label: transaction.destination.name }
                : null}
              onChange={(value) => setTransaction({
                ...transaction,
                destination: value ? { id: value.id, name: value.label } : null,
              })}
            />
          </div>
        </div>
        <div className="form-group">
          <label htmlFor="transaction-comment">
            <Translate id="react.inventory.transaction.comment.label" defaultMessage="Comment" />
          </label>
          <textarea
            id="transaction-comment"
            className="form-control"
            rows={2}
            value={transaction.comment || ''}
            onChange={(e) => setTransaction({ ...transaction, comment: e.target.value })}
          />
        </div>
      </div>
      <div className="p-3">
        <h6>
          <Translate id="react.inventory.transaction.details.label" defaultMessage="Transaction details" />
        </h6>
        <table className="table table-sm">
          <thead>
            <tr>
              <th scope="col">
                <Translate id="react.inventory.product.label" defaultMessage="Product" />
              </th>
              <th scope="col">
                <Translate id="react.inventory.binLocation.label" defaultMessage="Bin location" />
              </th>
              <th scope="col">
                <Translate id="react.inventory.lotNumber.label" defaultMessage="Lot number" />
              </th>
              <th scope="col">
                <Translate id="react.inventory.expirationDate.label" defaultMessage="Expiration date" />
              </th>
              <th scope="col">
                <Translate id="react.inventory.quantity.label" defaultMessage="Quantity" />
              </th>
              <th aria-label="actions" />
            </tr>
          </thead>
          <tbody>
            {transaction.transactionEntries.map((entry) => {
              const inventoryItemOptions = (
                transaction.inventoryItemsByProduct?.[entry.product?.id] || []
              ).map((it) => ({
                id: it.id,
                label: it.lotNumber || translate('react.inventory.noLotNumber.label', 'No lot number'),
                expirationDate: it.expirationDate,
              }));
              const selectedInventoryItem = inventoryItemOptions
                .find((it) => it.id === entry.inventoryItem?.id);
              return (
                <tr key={entry.id}>
                  <td>
                    <a href={INVENTORY_ITEM_URL.showStockCard(entry.product?.id)}>
                      {entry.product?.name}
                    </a>
                  </td>
                  <td>{entry.binLocation?.name}</td>
                  <td className="edit-transaction-lot-select">
                    <Select
                      id={`lot-select-${entry.id}`}
                      options={inventoryItemOptions}
                      valueKey="id"
                      labelKey="label"
                      value={selectedInventoryItem || (entry.inventoryItem?.id
                        ? { id: entry.inventoryItem.id, label: entry.inventoryItem.lotNumber }
                        : null)}
                      onChange={(value) => updateEntry(entry.id, {
                        inventoryItem: value
                          ? {
                            id: value.id,
                            lotNumber: value.label,
                            expirationDate: value.expirationDate,
                          }
                          : entry.inventoryItem,
                      })}
                    />
                  </td>
                  <td>
                    {selectedInventoryItem?.expirationDate
                      || entry.inventoryItem?.expirationDate}
                  </td>
                  <td className="edit-transaction-quantity">
                    <input
                      type="number"
                      className="form-control form-control-sm"
                      value={entry.quantity ?? ''}
                      onChange={(e) => updateEntry(entry.id, {
                        quantity: e.target.value === '' ? null : Number(e.target.value),
                      })}
                    />
                  </td>
                  <td>
                    <button
                      type="button"
                      className="btn btn-outline-danger btn-sm"
                      onClick={() => deleteEntry(entry.id)}
                    >
                      <Translate id="react.default.button.delete.label" defaultMessage="Delete" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <button
          type="button"
          className="btn btn-primary"
          disabled={saving}
          onClick={save}
        >
          <Translate id="react.default.button.save.label" defaultMessage="Save" />
        </button>
      </div>
    </PageWrapper>
  );
};

export default EditTransactionPage;
