import React, { useEffect, useState } from 'react';

import { getTranslate } from 'react-localize-redux';
import { useSelector } from 'react-redux';

import { INTERNAL_LOCATIONS, RECORD_STOCK, RECORD_STOCK_SAVE } from 'api/urls';
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

const formatDate = (date) => {
  const pad = (n) => `${n}`.padStart(2, '0');
  return `${pad(date.getMonth() + 1)}/${pad(date.getDate())}/${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const RecordStockPage = () => {
  useTranslation('stockCard', 'inventory');

  const productId = useProductId();
  const [recordStock, setRecordStock] = useState(null);
  const [rows, setRows] = useState([]);
  const [comment, setComment] = useState('');
  const [saving, setSaving] = useState(false);
  const [transactionDate] = useState(new Date());
  const [binLocations, setBinLocations] = useState([]);

  const { currentLocation, user, translate } = useSelector((state) => ({
    currentLocation: state.session.currentLocation,
    user: state.session.user,
    translate: translateWithDefaultMessage(getTranslate(state.localize)),
  }));

  useEffect(() => {
    if (!productId || !currentLocation?.id) {
      return;
    }
    apiClient.get(RECORD_STOCK(currentLocation.id), { params: { 'product.id': productId } })
      .then((response) => {
        const { data } = response.data;
        setRecordStock(data);
        setRows(data.recordInventoryRows.map((row) => ({ ...row, existing: true })));
      });
    apiClient.get(INTERNAL_LOCATIONS, { params: { 'location.id': currentLocation.id } })
      .then((response) => setBinLocations(response.data.data || []))
      .catch(() => setBinLocations([]));
  }, [productId, currentLocation?.id]);

  const addRow = () => {
    setRows([...rows, {
      id: null,
      lotNumber: '',
      binLocation: null,
      expirationDate: '',
      oldQuantity: 0,
      newQuantity: 0,
      comment: '',
      existing: false,
    }]);
  };

  const updateRow = (index, field, value) => {
    setRows(rows.map((row, i) => (i === index ? { ...row, [field]: value } : row)));
  };

  const removeRow = (index) => {
    setRows(rows.filter((_, i) => i !== index));
  };

  const save = async () => {
    setSaving(true);
    try {
      await apiClient.post(RECORD_STOCK_SAVE(currentLocation.id), {
        product: { id: productId },
        inventory: { id: recordStock?.inventory?.id },
        transactionDate: `${transactionDate.toISOString().slice(0, 19)}Z`,
        comment,
        recordInventoryRows: rows.map((row) => ({
          id: row.id || null,
          binLocation: row.binLocation?.id ? { id: row.binLocation.id } : null,
          lotNumber: row.lotNumber || '',
          expirationDate: row.expirationDate ? `${row.expirationDate.slice(0, 10)}T00:00:00Z` : null,
          oldQuantity: row.oldQuantity ?? 0,
          newQuantity: row.newQuantity ?? 0,
          comment: row.comment || '',
        })),
      });
      window.location = INVENTORY_ITEM_URL.showStockCard(productId);
    } catch (error) {
      const message = error?.response?.data?.errorMessage
        || translate('react.stockCard.recordStock.error.label', 'An error occurred while saving');
      notification(NotificationType.ERROR_OUTLINED)({ message });
      setSaving(false);
    }
  };

  const product = recordStock?.product;

  return (
    <PageWrapper className="record-stock-page">
      <StockCardHeader productId={productId} activeScreen="recordStock" />
      <div className="p-3">
        <h5>
          <Translate id="react.stockCard.recordStock.title.label" defaultMessage="Record Stock" />
        </h5>
        <div className="mb-2">
          <div>
            <Translate id="react.stockCard.product.label" defaultMessage="Product" />
            {': '}
            <strong>{product ? `${product.productCode} ${product.name}` : ''}</strong>
          </div>
          <div>
            <Translate id="react.stockCard.location.label" defaultMessage="Location" />
            {': '}
            <strong>{currentLocation?.name}</strong>
          </div>
          <div>
            <Translate id="react.stockCard.recordedBy.label" defaultMessage="Recorded by" />
            {': '}
            <strong>{user?.name || user?.username}</strong>
          </div>
          <div>
            <Translate id="react.stockCard.date.label" defaultMessage="Date" />
            {': '}
            <strong>{formatDate(transactionDate)}</strong>
          </div>
        </div>
        <div className="form-group" style={{ maxWidth: '500px' }}>
          <label htmlFor="record-stock-comment">
            <Translate id="react.stockCard.comments.label" defaultMessage="Comments" />
          </label>
          <textarea
            id="record-stock-comment"
            className="form-control"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
        </div>
        <table className="table table-sm">
          <thead>
            <tr>
              <th>{translate('react.stockCard.binLocation.label', 'Bin Location')}</th>
              <th>{translate('react.stockCard.lotNumber.label', 'Lot Number')}</th>
              <th>{translate('react.stockCard.expirationDate.label', 'Expiration Date')}</th>
              <th className="text-right">{translate('react.stockCard.previousQuantity.label', 'Previous Quantity')}</th>
              <th className="text-right">{translate('react.stockCard.newQuantity.label', 'New Quantity')}</th>
              <th>{translate('react.stockCard.comments.label', 'Comments')}</th>
              <th>{translate('react.stockCard.actions.label', 'Actions')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              // eslint-disable-next-line react/no-array-index-key
              <tr key={index}>
                <td>
                  {row.existing
                    ? (row.binLocation?.name || translate('react.stockCard.default.label', 'Default'))
                    : (
                      <select
                        className="form-control form-control-sm"
                        aria-label="Bin location"
                        value={row.binLocation?.id || ''}
                        onChange={(e) => updateRow(index, 'binLocation', e.target.value ? binLocations.find((it) => it.id === e.target.value) : null)}
                      >
                        <option value="">{translate('react.stockCard.default.label', 'Default')}</option>
                        {binLocations.map((bin) => (
                          <option key={bin.id} value={bin.id}>{bin.name}</option>
                        ))}
                      </select>
                    )}
                </td>
                <td>
                  {row.existing
                    ? (row.lotNumber || translate('react.stockCard.default.label', 'Default'))
                    : (
                      <input
                        className="form-control form-control-sm"
                        aria-label="Lot number"
                        value={row.lotNumber || ''}
                        onChange={(e) => updateRow(index, 'lotNumber', e.target.value)}
                      />
                    )}
                </td>
                <td>
                  {row.existing
                    ? (row.expirationDate || translate('react.stockCard.never.label', 'Never'))
                    : (
                      <input
                        type="date"
                        className="form-control form-control-sm"
                        aria-label="Expiration date"
                        value={row.expirationDate || ''}
                        onChange={(e) => updateRow(index, 'expirationDate', e.target.value)}
                      />
                    )}
                </td>
                <td className="text-right">{row.oldQuantity}</td>
                <td className="text-right">
                  <input
                    type="number"
                    className="form-control form-control-sm text-right"
                    aria-label="New quantity"
                    value={row.newQuantity ?? ''}
                    onChange={(e) => updateRow(index, 'newQuantity', e.target.value === '' ? null : Number(e.target.value))}
                  />
                </td>
                <td>
                  <input
                    className="form-control form-control-sm"
                    aria-label="Row comment"
                    value={row.comment || ''}
                    onChange={(e) => updateRow(index, 'comment', e.target.value)}
                  />
                </td>
                <td>
                  {!row.existing && (
                    <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => removeRow(index)}>
                      <Translate id="react.default.button.delete.label" defaultMessage="Delete" />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <button type="button" className="btn btn-outline-secondary mr-2" onClick={addRow}>
          <Translate id="react.stockCard.recordStock.addRow.label" defaultMessage="Add New Lot Number" />
        </button>
        <button type="button" className="btn btn-primary mr-2" disabled={saving || !recordStock} onClick={save}>
          <Translate id="react.stockCard.recordStock.save.label" defaultMessage="Record Stock" />
        </button>
        <a className="btn btn-outline-secondary" href={INVENTORY_ITEM_URL.showStockCard(productId)}>
          <Translate id="react.default.button.cancel.label" defaultMessage="Cancel" />
        </a>
      </div>
    </PageWrapper>
  );
};

export default RecordStockPage;
