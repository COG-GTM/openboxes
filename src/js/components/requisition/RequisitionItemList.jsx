import React, { useEffect, useMemo, useState } from 'react';

import { getTranslate } from 'react-localize-redux';
import { useSelector } from 'react-redux';

import requisitionApi from 'api/services/RequisitionApi';
import { REQUISITION_ITEM_URL, REQUISITION_URL } from 'consts/applicationUrls';
import useTranslation from 'hooks/useTranslation';
import Select from 'utils/Select';
import Translate, { translateWithDefaultMessage } from 'utils/Translate';

const CANCEL_REASON_CODES = [
  'STOCKOUT', 'LOW_STOCK', 'EXPIRED', 'DAMAGED', 'SUBSTITUTION', 'PACKAGE_SIZE',
  'CLINICAL_OVERRIDE', 'INSUFFICIENT_CONSUMPTION', 'REPLACED_BY_FORMULARY_ITEM',
  'CANCELED_BY_REQUESTER', 'NON_FORMULARY_NO_SUBSTITUTION', 'NOT_STOCKED',
  'AVAILABLE_STOCK_RESERVED', 'COULD_NOT_LOCATE', 'DIFFERENT_LOCATION',
  'DATA_ENTRY_ERROR', 'SUPPLY_MAX_QUANTITY', 'NOT_ON_STOCK_LIST',
  'INSUFFICIENT_QUANTITY_RECONDITIONED', 'SUBSTITUTION_WITHIN_PRODUCT_GROUP',
  'SUPPLIED_BY_GOVERNMENT', 'APPROVED_CHANGE', 'EARLIER_EXPIRATION_DATE',
  'CONSUMED', 'RETURNED', 'FOUND', 'MISSING', 'STOLEN', 'RECOUNTED',
  'CORRECTION', 'SCRAPPED', 'REJECTED', 'REQUEST_ERROR',
  'NOT_NEEDED_BASED_ON_CONSUMPTION', 'CLINICAL_JUDGMENT',
  'INSUFFICIENT_QUANTITY_AVAILABLE', 'BACKORDER', 'DUPLICATE_REQUEST',
  'BIN_CORRECTION', 'LOT_CORRECTION', 'INCORRECT_LOT_PICKED',
  'FIX_NEGATIVE_INVENTORY', 'INBOUND_NOT_RECORDED', 'OUTBOUND_NOT_RECORDED',
  'RETURN_NOT_RECORDED', 'ERROR_IN_INBOUND', 'ERROR_IN_OUTBOUND',
  'BIN_LOCATION_MISSING', 'MISPLACED', 'OTHER',
];

const PAGE_SIZE = 10;

// Legacy requisitionItem/export expects MM/dd/yyyy dates
const toLegacyDate = (isoDate) => {
  if (!isoDate) {
    return null;
  }
  const [year, month, day] = isoDate.split('-');
  return `${month}/${day}/${year}`;
};

const RequisitionItemList = () => {
  const [items, setItems] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [offset, setOffset] = useState(0);
  const [dateRequestedFrom, setDateRequestedFrom] = useState('');
  const [dateRequestedTo, setDateRequestedTo] = useState('');
  const [cancelReasonCodes, setCancelReasonCodes] = useState([]);
  const [error, setError] = useState(null);

  useTranslation('requisition', 'default');

  const translate = useSelector(
    (state) => translateWithDefaultMessage(getTranslate(state.localize)),
  );

  const reasonCodeOptions = useMemo(
    () => CANCEL_REASON_CODES.map((value) => ({ value, label: value })),
    [],
  );

  const fetchItems = (newOffset = 0) => {
    setError(null);
    requisitionApi.getCanceledRequisitionItems({
      dateRequestedFrom: dateRequestedFrom || null,
      dateRequestedTo: dateRequestedTo || null,
      cancelReasonCode: cancelReasonCodes.map((option) => option.value),
      max: PAGE_SIZE,
      offset: newOffset,
    })
      .then(({ data }) => {
        setItems(data?.data ?? []);
        setTotalCount(data?.totalCount ?? 0);
        setOffset(newOffset);
      })
      .catch((err) => {
        setError(err?.response?.data?.errorMessage || 'An error occurred while loading requisition items');
      });
  };

  useEffect(() => {
    fetchItems(0);
  }, []);

  const search = (event) => {
    event.preventDefault();
    fetchItems(0);
  };

  const exportParams = {
    ...(dateRequestedFrom ? { dateRequestedFrom: toLegacyDate(dateRequestedFrom) } : {}),
    ...(dateRequestedTo ? { dateRequestedTo: toLegacyDate(dateRequestedTo) } : {}),
    ...(cancelReasonCodes.length
      ? { cancelReasonCode: cancelReasonCodes.map((option) => option.value) } : {}),
  };

  return (
    <div className="d-flex flex-column m-3">
      {error && <div className="alert alert-danger" role="alert">{error}</div>}
      <div className="card mb-3">
        <div className="card-header d-flex justify-content-between align-items-center">
          <Translate id="react.requisitionItem.list.label" defaultMessage="Canceled requisition items" />
          <a
            className="btn btn-sm btn-outline-secondary"
            href={REQUISITION_ITEM_URL.export(exportParams)}
            data-testid="requisition-item-export-button"
          >
            <Translate id="react.default.button.export.label" defaultMessage="Export" />
          </a>
        </div>
        <form className="card-body" onSubmit={search}>
          <div className="form-row align-items-end">
            <div className="col-md-3">
              <label htmlFor="requisition-item-date-requested-from">
                <Translate id="react.requisitionItem.dateRequestedFrom.label" defaultMessage="Date requested from" />
              </label>
              <input
                type="date"
                id="requisition-item-date-requested-from"
                className="form-control"
                value={dateRequestedFrom}
                onChange={(event) => setDateRequestedFrom(event.target.value)}
                data-testid="requisition-item-date-requested-from"
              />
            </div>
            <div className="col-md-3">
              <label htmlFor="requisition-item-date-requested-to">
                <Translate id="react.requisitionItem.dateRequestedTo.label" defaultMessage="Date requested to" />
              </label>
              <input
                type="date"
                id="requisition-item-date-requested-to"
                className="form-control"
                value={dateRequestedTo}
                onChange={(event) => setDateRequestedTo(event.target.value)}
                data-testid="requisition-item-date-requested-to"
              />
            </div>
            <div className="col-md-4">
              <label htmlFor="requisition-item-cancel-reason-select">
                <Translate id="react.requisitionItem.cancelReasonCode.label" defaultMessage="Cancel reason code" />
              </label>
              <Select
                multi
                options={reasonCodeOptions}
                value={cancelReasonCodes}
                onChange={(value) => setCancelReasonCodes(value || [])}
                id="requisition-item-cancel-reason-select"
              />
            </div>
            <div className="col-md-2">
              <button
                type="submit"
                className="btn btn-primary btn-block"
                data-testid="requisition-item-search-button"
              >
                <Translate id="react.default.button.search.label" defaultMessage="Search" />
              </button>
            </div>
          </div>
        </form>
      </div>
      <div className="card">
        <div className="table-responsive">
          <table className="table table-sm table-striped mb-0" data-testid="requisition-item-list-table">
            <thead>
              <tr>
                <th>{translate('react.requisitionItem.requisition.label', 'Requisition')}</th>
                <th>{translate('react.requisition.dateRequested.label', 'Date requested')}</th>
                <th>{translate('react.default.product.label', 'Product')}</th>
                <th>{translate('react.requisitionItem.productGroup.label', 'Product group')}</th>
                <th>{translate('react.requisitionItem.cancelReasonCode.label', 'Cancel reason code')}</th>
                <th>{translate('react.requisitionItem.cancelComments.label', 'Cancel comments')}</th>
                <th className="text-right">{translate('react.requisitionItem.quantityApproved.label', 'Quantity approved')}</th>
                <th className="text-right">{translate('react.requisitionItem.quantityCanceled.label', 'Quantity canceled')}</th>
                <th className="text-right">{translate('react.requisitionItem.quantityRequested.label', 'Quantity requested')}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td>
                    <a href={REQUISITION_URL.show(item.requisition?.id)}>
                      {item.requisition?.requestNumber}
                      {' '}
                      {item.requisition?.name}
                    </a>
                  </td>
                  <td>{item.requisition?.dateRequested}</td>
                  <td>
                    {item.product?.productCode}
                    {' '}
                    {item.product?.name}
                  </td>
                  <td>{item.product?.genericProductName}</td>
                  <td>{item.cancelReasonCode}</td>
                  <td>{item.cancelComments}</td>
                  <td className="text-right">{item.quantityApproved}</td>
                  <td className="text-right">{item.quantityCanceled}</td>
                  <td className="text-right">{item.quantity}</td>
                </tr>
              ))}
              {!items.length && (
                <tr>
                  <td colSpan="9" className="text-center py-3">
                    <Translate id="react.default.noResults.label" defaultMessage="No results" />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="card-footer d-flex justify-content-between align-items-center">
          <span data-testid="requisition-item-total-count">
            {totalCount}
            {' '}
            <Translate id="react.default.results.label" defaultMessage="results" />
          </span>
          <div>
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary mr-2"
              disabled={offset <= 0}
              onClick={() => fetchItems(Math.max(offset - PAGE_SIZE, 0))}
              data-testid="requisition-item-previous-button"
            >
              <Translate id="react.default.button.previous.label" defaultMessage="Previous" />
            </button>
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary"
              disabled={offset + PAGE_SIZE >= totalCount}
              onClick={() => fetchItems(offset + PAGE_SIZE)}
              data-testid="requisition-item-next-button"
            >
              <Translate id="react.default.button.next.label" defaultMessage="Next" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RequisitionItemList;
