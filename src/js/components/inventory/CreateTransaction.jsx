import React, { useEffect, useState } from 'react';

import queryString from 'query-string';
import { useSelector } from 'react-redux';
import { useHistory, useLocation } from 'react-router-dom';
import { getCurrentLocation } from 'selectors';

import { INVENTORY_TRANSACTION_CANDIDATES, TRANSACTION_API } from 'api/urls';
import notification from 'components/Layout/notifications/notification';
import Spinner from 'components/spinner/Spinner';
import { INVENTORY_ITEM_URL } from 'consts/applicationUrls';
import NotificationType from 'consts/notificationTypes';
import useTranslate from 'hooks/useTranslate';
import useTranslation from 'hooks/useTranslation';
import apiClient from 'utils/apiClient';
import { fetchLocations } from 'utils/option-utils';
import PageWrapper from 'wrappers/PageWrapper';

const TRANSFER_IN_CODE = 'CREDIT';
// The legacy GSP fell back to the "consumed" template when no transaction
// type was given (e.g. the record-stock link on the product page)
const CONSUMPTION_TYPE_ID = '2';
// Transfer In / Transfer Out (see Constants.TRANSFER_IN/OUT_TRANSACTION_TYPE_ID)
const TRANSFER_IN_TYPE_ID = '8';
const TRANSFER_OUT_TYPE_ID = '9';
const TRANSFER_TYPE_IDS = [TRANSFER_IN_TYPE_ID, TRANSFER_OUT_TYPE_ID];

// The legacy source/destination pickers only listed locations supporting the
// relevant activity (LocationService.getTransactionSources/Destinations)
const TRANSFER_ACTIVITY_CODES = {
  [TRANSFER_IN_TYPE_ID]: ['SEND_STOCK'],
  [TRANSFER_OUT_TYPE_ID]: ['RECEIVE_STOCK'],
};

const CreateTransaction = () => {
  useTranslation('inventory');
  const translate = useTranslate();
  const currentLocation = useSelector(getCurrentLocation);
  const location = useLocation();
  const history = useHistory();

  const params = queryString.parse(location.search);
  const transactionTypeId = params['transactionType.id'] || CONSUMPTION_TYPE_ID;
  const productIds = [].concat(params['product.id'] || []);
  const inventoryItemIds = [].concat(params['inventoryItem.id'] || []);

  const [transactionType, setTransactionType] = useState(null);
  const [rows, setRows] = useState([]);
  const [quantities, setQuantities] = useState({});
  const [comment, setComment] = useState('');
  const [otherLocationId, setOtherLocationId] = useState('');
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!currentLocation?.id || (!productIds.length && !inventoryItemIds.length)) {
      setLoading(false);
      return;
    }
    setLoading(true);
    apiClient.get(INVENTORY_TRANSACTION_CANDIDATES, {
      params: {
        locationId: currentLocation?.id,
        transactionTypeId,
        'product.id': productIds,
        'inventoryItem.id': inventoryItemIds,
      },
      paramsSerializer: (parameters) => queryString.stringify(parameters),
    })
      .then((response) => {
        setRows(response.data.data);
        setTransactionType(response.data.transactionType);
      })
      .finally(() => setLoading(false));
    fetchLocations({ activityCodes: TRANSFER_ACTIVITY_CODES[transactionTypeId] })
      .then((fetched) => setLocations(fetched.filter((l) => l.id !== currentLocation.id)));
  }, [currentLocation?.id, location.search]);

  const isTransfer = TRANSFER_TYPE_IDS.includes(transactionType?.id);
  const isTransferIn = transactionType?.transactionCode === TRANSFER_IN_CODE;

  const rowKey = (row, index) => `${row.inventoryItem?.id ?? 'none'}-${row.binLocation?.id ?? 'none'}-${index}`;

  const onSubmit = () => {
    const entries = rows
      .map((row, index) => ({
        inventoryItemId: row.inventoryItem?.id,
        productId: row.product?.id,
        lotNumber: row.inventoryItem?.lotNumber,
        expirationDate: row.inventoryItem?.expirationDate,
        binLocationId: row.binLocation?.id,
        quantity: quantities[rowKey(row, index)],
      }))
      .filter((entry) => entry.quantity !== undefined && entry.quantity !== ''
        && Number(entry.quantity) !== 0)
      .map((entry) => ({ ...entry, quantity: Number(entry.quantity) }));

    if (!entries.length) {
      notification(NotificationType.ERROR_OUTLINED)({
        message: translate('react.recordTransaction.noEntries.label', 'Enter at least one quantity'),
      });
      return;
    }

    setSaving(true);
    apiClient.post(TRANSACTION_API, {
      transactionTypeId,
      locationId: currentLocation?.id,
      comment: comment || null,
      sourceId: isTransferIn ? otherLocationId || null : null,
      destinationId: !isTransferIn ? otherLocationId || null : null,
      entries,
    })
      .then(() => {
        notification(NotificationType.SUCCESS)({
          message: translate('react.recordTransaction.saved.label', 'Transaction saved'),
        });
        if (productIds.length === 1) {
          window.location = INVENTORY_ITEM_URL.showStockCard(rows[0]?.product?.id);
        } else {
          history.goBack();
        }
      })
      .finally(() => setSaving(false));
  };

  if (loading) {
    return <PageWrapper><Spinner /></PageWrapper>;
  }

  return (
    <PageWrapper>
      <div className="d-flex flex-column list-page-main p-3">
        <h1>
          {translate('react.recordTransaction.title.label', 'Record transaction')}
          {transactionType ? ` — ${transactionType.name}` : ''}
        </h1>
        {!productIds.length && !inventoryItemIds.length && (
          <div className="alert alert-warning">
            {translate('react.recordTransaction.noProducts.label', 'You must select at least one product or inventory item')}
          </div>
        )}
        {isTransfer && (
          <div className="mb-3" style={{ maxWidth: '25rem' }}>
            <label htmlFor="transaction-other-location">
              {isTransferIn
                ? translate('react.recordTransaction.source.label', 'Source')
                : translate('react.recordTransaction.destination.label', 'Destination')}
            </label>
            <select
              id="transaction-other-location"
              className="form-control"
              value={otherLocationId}
              onChange={(e) => setOtherLocationId(e.target.value)}
            >
              <option value="">{translate('react.default.none.label', 'None')}</option>
              {locations
                .filter((option) => option.id !== currentLocation?.id)
                .map((option) => (
                  <option key={option.id} value={option.id}>{option.label}</option>
                ))}
            </select>
          </div>
        )}
        <div className="table-responsive">
          <table className="table table-bordered table-sm" data-testid="record-transaction-table">
            <thead>
              <tr>
                <th>{translate('react.recordTransaction.productCode.label', 'Code')}</th>
                <th>{translate('react.recordTransaction.product.label', 'Product')}</th>
                <th>{translate('react.recordTransaction.binLocation.label', 'Bin Location')}</th>
                <th>{translate('react.recordTransaction.lotNumber.label', 'Lot Number')}</th>
                <th>{translate('react.recordTransaction.expirationDate.label', 'Expiration Date')}</th>
                <th className="text-right">{translate('react.recordTransaction.quantityOnHand.label', 'QoH')}</th>
                <th className="text-right">{translate('react.recordTransaction.quantity.label', 'Quantity')}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={rowKey(row, index)}>
                  <td>{row.product?.productCode}</td>
                  <td>
                    <a href={INVENTORY_ITEM_URL.showStockCard(row.product?.id)}>
                      {row.product?.name}
                    </a>
                  </td>
                  <td>{row.binLocation?.name}</td>
                  <td>{row.inventoryItem?.lotNumber}</td>
                  <td>{row.inventoryItem?.expirationDate}</td>
                  <td className="text-right">{row.quantityOnHand}</td>
                  <td className="text-right" style={{ width: '8rem' }}>
                    <input
                      type="number"
                      className="form-control text-right"
                      aria-label={`quantity-${index}`}
                      value={quantities[rowKey(row, index)] ?? ''}
                      onChange={(e) => setQuantities({
                        ...quantities,
                        [rowKey(row, index)]: e.target.value,
                      })}
                    />
                  </td>
                </tr>
              ))}
              {!rows.length && (
                <tr>
                  <td colSpan={7}>
                    {translate('react.default.noResultsFound.label', 'No results found')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="mb-3" style={{ maxWidth: '40rem' }}>
          <label htmlFor="transaction-comment">
            {translate('react.recordTransaction.comment.label', 'Comment')}
          </label>
          <textarea
            id="transaction-comment"
            className="form-control"
            rows={2}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
        </div>
        <div>
          <button
            type="button"
            className="btn btn-primary"
            disabled={saving || !rows.length}
            onClick={onSubmit}
          >
            {translate('react.default.button.save.label', 'Save')}
          </button>
          <button
            type="button"
            className="btn btn-outline-secondary ml-2"
            onClick={() => history.goBack()}
          >
            {translate('react.default.button.cancel.label', 'Cancel')}
          </button>
        </div>
      </div>
    </PageWrapper>
  );
};

export default CreateTransaction;
