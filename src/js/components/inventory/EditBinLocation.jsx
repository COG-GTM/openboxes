import React, { useEffect, useState } from 'react';

import queryString from 'query-string';
import { useSelector } from 'react-redux';
import { useHistory, useLocation } from 'react-router-dom';
import { getCurrentLocation } from 'selectors';

import { INVENTORY_ADJUST_STOCK, INVENTORY_BIN_LOCATION_DETAILS } from 'api/urls';
import notification from 'components/Layout/notifications/notification';
import Spinner from 'components/spinner/Spinner';
import { INVENTORY_ITEM_URL } from 'consts/applicationUrls';
import NotificationType from 'consts/notificationTypes';
import useTranslate from 'hooks/useTranslate';
import useTranslation from 'hooks/useTranslation';
import apiClient from 'utils/apiClient';
import PageWrapper from 'wrappers/PageWrapper';

const EditBinLocation = () => {
  useTranslation('inventory');
  const translate = useTranslate();
  const currentLocation = useSelector(getCurrentLocation);
  const location = useLocation();
  const history = useHistory();

  const params = queryString.parse(location.search);

  const [details, setDetails] = useState(null);
  const [reasonCodes, setReasonCodes] = useState([]);
  const [newQuantity, setNewQuantity] = useState('');
  const [reasonCode, setReasonCode] = useState('');
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!currentLocation?.id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    Promise.all([
      apiClient.get(INVENTORY_BIN_LOCATION_DETAILS, {
        params: {
          locationId: currentLocation?.id,
          productCode: params.productCode,
          binLocation: params.binLocation,
          lotNumber: params.lotNumber,
        },
      }),
      apiClient.get('/api/reasonCodes?activityCode=ADJUST_INVENTORY'),
    ])
      .then(([detailsResponse, reasonCodesResponse]) => {
        setDetails(detailsResponse.data.data);
        setNewQuantity(String(detailsResponse.data.data.quantityOnHand ?? ''));
        setReasonCodes(reasonCodesResponse.data.data);
      })
      .finally(() => setLoading(false));
  }, [currentLocation?.id, location.search]);

  const onSubmit = (event) => {
    event.preventDefault();
    setSaving(true);
    apiClient.post(INVENTORY_ADJUST_STOCK, {
      locationId: currentLocation?.id,
      inventoryItemId: details?.inventoryItem?.id,
      binLocationId: details?.binLocation?.id,
      currentQuantity: details?.quantityOnHand,
      newQuantity: Number(newQuantity),
      reasonCode: reasonCode || null,
      comment: comment || null,
    })
      .then(() => {
        notification(NotificationType.SUCCESS)({
          message: translate('react.adjustStock.saved.label', 'Stock adjusted'),
        });
        window.location = INVENTORY_ITEM_URL.showStockCard(details?.product?.id);
      })
      .finally(() => setSaving(false));
  };

  if (loading) {
    return <PageWrapper><Spinner /></PageWrapper>;
  }

  return (
    <PageWrapper>
      <div className="d-flex flex-column list-page-main p-3">
        <h1>{translate('react.adjustStock.title.label', 'Adjust Stock')}</h1>
        <form onSubmit={onSubmit} style={{ maxWidth: '40rem' }}>
          <dl className="row" data-testid="adjust-stock-details">
            <dt className="col-sm-4">{translate('react.adjustStock.product.label', 'Product')}</dt>
            <dd className="col-sm-8">
              {details?.product?.productCode}
              {' '}
              {details?.product?.name}
            </dd>
            <dt className="col-sm-4">{translate('react.adjustStock.binLocation.label', 'Bin Location')}</dt>
            <dd className="col-sm-8">{details?.binLocation?.name || translate('react.default.none.label', 'None')}</dd>
            <dt className="col-sm-4">{translate('react.adjustStock.lotNumber.label', 'Lot Number')}</dt>
            <dd className="col-sm-8">{details?.inventoryItem?.lotNumber || translate('react.default.none.label', 'None')}</dd>
            <dt className="col-sm-4">{translate('react.adjustStock.expirationDate.label', 'Expiration Date')}</dt>
            <dd className="col-sm-8">{details?.inventoryItem?.expirationDate || ''}</dd>
            <dt className="col-sm-4">{translate('react.adjustStock.currentQuantity.label', 'Current Quantity')}</dt>
            <dd className="col-sm-8" data-testid="adjust-stock-current-quantity">{details?.quantityOnHand}</dd>
          </dl>
          <div className="form-group">
            <label htmlFor="adjust-stock-new-quantity">
              {translate('react.adjustStock.newQuantity.label', 'New Quantity')}
            </label>
            <input
              id="adjust-stock-new-quantity"
              type="number"
              min="0"
              required
              className="form-control"
              value={newQuantity}
              onChange={(e) => setNewQuantity(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label htmlFor="adjust-stock-reason-code">
              {translate('react.adjustStock.reasonCode.label', 'Reason Code')}
            </label>
            <select
              id="adjust-stock-reason-code"
              required
              className="form-control"
              value={reasonCode}
              onChange={(e) => setReasonCode(e.target.value)}
            >
              <option value="">{translate('react.default.selectOne.label', 'Select one')}</option>
              {reasonCodes.map((option) => (
                <option key={option.id} value={option.id}>{option.name}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="adjust-stock-comment">
              {translate('react.adjustStock.comment.label', 'Comment')}
            </label>
            <textarea
              id="adjust-stock-comment"
              required
              className="form-control"
              rows={2}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
          </div>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {translate('react.default.button.save.label', 'Save')}
          </button>
          <button
            type="button"
            className="btn btn-outline-secondary ml-2"
            onClick={() => history.goBack()}
          >
            {translate('react.default.button.cancel.label', 'Cancel')}
          </button>
        </form>
      </div>
    </PageWrapper>
  );
};

export default EditBinLocation;
