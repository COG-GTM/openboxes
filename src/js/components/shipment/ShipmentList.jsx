import React, { useCallback, useEffect, useState } from 'react';

import { getTranslate } from 'react-localize-redux';
import { useSelector } from 'react-redux';
import { useLocation } from 'react-router-dom';
import Alert from 'react-s-alert';

import shipmentApi from 'api/services/ShipmentApi';
import { SHIPMENT_SHOW_URL } from 'consts/applicationUrls';
import useTranslation from 'hooks/useTranslation';
import Translate, { translateWithDefaultMessage } from 'utils/Translate';

// React version of the legacy shipment/list GSP: search filters, shipments
// grouped by status, and superuser bulk actions.
const ShipmentList = () => {
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const type = (queryParams.get('type') || 'outgoing').toLowerCase();
  const incoming = type === 'incoming';

  const [data, setData] = useState(null);
  const [options, setOptions] = useState(null);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    terms: queryParams.get('terms') || '',
    status: queryParams.get('status') || '',
    shipmentType: queryParams.get('shipmentType') || '',
    location: '',
    max: '100',
  });
  const [selected, setSelected] = useState({});
  const [processing, setProcessing] = useState(false);
  const translate = useSelector(
    (state) => translateWithDefaultMessage(getTranslate(state.localize)),
  );

  useTranslation('shipment', 'default');

  const fetchShipments = useCallback((currentFilters) => {
    const params = {
      type,
      terms: currentFilters.terms || null,
      status: currentFilters.status || null,
      shipmentType: currentFilters.shipmentType || null,
      max: currentFilters.max || null,
    };
    if (incoming) {
      params.origin = currentFilters.location || null;
    } else {
      params.destination = currentFilters.location || null;
    }
    shipmentApi.getShipmentList(params)
      .then((response) => {
        setData(response.data?.data);
        setSelected({});
      })
      .catch((err) => {
        setError(err?.response?.data?.errorMessage
          || translate('react.default.errors.error.label', 'An error occurred'));
      });
  }, [type, incoming]);

  useEffect(() => {
    shipmentApi.getListOptions()
      .then((response) => setOptions(response.data?.data))
      .catch(() => {});
    fetchShipments(filters);
  }, [type]);

  const search = (event) => {
    event.preventDefault();
    fetchShipments(filters);
  };

  const reset = () => {
    const cleared = {
      terms: '', status: '', shipmentType: '', location: '', max: '100',
    };
    setFilters(cleared);
    fetchShipments(cleared);
  };

  const runBulkAction = async (action, confirmMessage) => {
    const shipmentIds = Object.keys(selected).filter((id) => selected[id]);
    if (!shipmentIds.length) {
      Alert.warning(translate('react.shipment.list.noneSelected.label', 'Please select at least one shipment'));
      return;
    }
    // eslint-disable-next-line no-alert
    if (!window.confirm(confirmMessage)) {
      return;
    }
    setProcessing(true);
    try {
      await shipmentApi.bulkAction({ action, shipmentIds });
      fetchShipments(filters);
    } catch (err) {
      const errorData = err?.response?.data;
      Alert.error(errorData?.errorMessage
        || translate('react.default.errors.error.label', 'An error occurred'));
    } finally {
      setProcessing(false);
    }
  };

  if (error) {
    return <div className="alert alert-danger m-3" role="alert">{error}</div>;
  }

  if (!data) {
    return null;
  }

  const shipments = data.shipments ?? [];
  const statuses = shipments.reduce((acc, shipment) => {
    acc[shipment.status] = (acc[shipment.status] || 0) + 1;
    return acc;
  }, {});
  const selectStatus = (status) => {
    const next = { ...filters, status };
    setFilters(next);
    fetchShipments(next);
  };

  return (
    <div className="d-flex flex-column m-3" data-testid="shipment-list">
      <h4 data-testid="shipment-list-title">
        {incoming
          ? <Translate id="react.shipment.list.incoming.label" defaultMessage="Inbound shipments" />
          : <Translate id="react.shipment.list.outgoing.label" defaultMessage="Outbound shipments" />}
      </h4>
      <div className="card mb-3">
        <div className="card-header">
          <Translate id="react.default.filters.label" defaultMessage="Filters" />
        </div>
        <div className="card-body">
          <form onSubmit={search} className="form-row align-items-end" data-testid="shipment-list-filters">
            <div className="form-group col-md-3">
              <label htmlFor="shipment-list-terms">
                <Translate id="react.shipment.list.searchTerms.label" defaultMessage="Search terms" />
              </label>
              <input
                id="shipment-list-terms"
                className="form-control"
                value={filters.terms}
                onChange={(event) => setFilters({ ...filters, terms: event.target.value })}
              />
            </div>
            <div className="form-group col-md-2">
              <label htmlFor="shipment-list-status">
                <Translate id="react.shipment.status.label" defaultMessage="Status" />
              </label>
              <select
                id="shipment-list-status"
                className="form-control"
                value={filters.status}
                onChange={(event) => setFilters({ ...filters, status: event.target.value })}
              >
                <option value="">{translate('react.default.all.label', 'All')}</option>
                {(options?.statusCodes ?? []).map((status) => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </div>
            <div className="form-group col-md-2">
              <label htmlFor="shipment-list-shipment-type">
                <Translate id="react.shipment.shipmentType.label" defaultMessage="Shipment type" />
              </label>
              <select
                id="shipment-list-shipment-type"
                className="form-control"
                value={filters.shipmentType}
                onChange={(event) => setFilters({ ...filters, shipmentType: event.target.value })}
              >
                <option value="">{translate('react.default.all.label', 'All')}</option>
                {(options?.shipmentTypes ?? []).map((shipmentType) => (
                  <option key={shipmentType.id} value={shipmentType.id}>{shipmentType.name}</option>
                ))}
              </select>
            </div>
            <div className="form-group col-md-3">
              <label htmlFor="shipment-list-location">
                {incoming
                  ? translate('react.shipment.origin.label', 'Origin')
                  : translate('react.shipment.destination.label', 'Destination')}
              </label>
              <select
                id="shipment-list-location"
                className="form-control"
                value={filters.location}
                onChange={(event) => setFilters({ ...filters, location: event.target.value })}
              >
                <option value="">{translate('react.default.all.label', 'All')}</option>
                {(options?.locations ?? []).map((loc) => (
                  <option key={loc.id} value={loc.id}>{loc.name}</option>
                ))}
              </select>
            </div>
            <div className="form-group col-md-2">
              <button type="submit" className="btn btn-primary mr-2" data-testid="shipment-list-search-button">
                <Translate id="react.default.button.search.label" defaultMessage="Search" />
              </button>
              <button type="button" className="btn btn-outline-secondary" onClick={reset}>
                <Translate id="react.default.button.reset.label" defaultMessage="Reset" />
              </button>
            </div>
          </form>
        </div>
      </div>
      <div className="mb-2" data-testid="shipment-list-status-tabs">
        <button
          type="button"
          className={`btn btn-sm mr-2 ${!filters.status ? 'btn-primary' : 'btn-outline-primary'}`}
          onClick={() => selectStatus('')}
        >
          {translate('react.default.all.label', 'All')}
          {` (${shipments.length})`}
        </button>
        {Object.keys(statuses).map((status) => (
          <button
            key={status}
            type="button"
            className={`btn btn-sm mr-2 ${filters.status === status ? 'btn-primary' : 'btn-outline-primary'}`}
            onClick={() => selectStatus(status)}
          >
            {status}
            {` (${statuses[status]})`}
          </button>
        ))}
      </div>
      {data.isSuperuser && (
        <div className="mb-2" data-testid="shipment-list-bulk-actions">
          <button
            type="button"
            className="btn btn-sm btn-outline-secondary mr-2"
            disabled={processing}
            onClick={() => runBulkAction('receive', translate('react.shipment.list.confirmBulkReceive.label', 'Are you sure you want to receive the selected shipments?'))}
          >
            <Translate id="react.shipment.list.bulkReceive.label" defaultMessage="Receive selected" />
          </button>
          <button
            type="button"
            className="btn btn-sm btn-outline-secondary mr-2"
            disabled={processing}
            onClick={() => runBulkAction('markAsReceived', translate('react.shipment.list.confirmBulkMarkAsReceived.label', 'Are you sure you want to mark the selected shipments as received?'))}
          >
            <Translate id="react.shipment.list.bulkMarkAsReceived.label" defaultMessage="Mark as received" />
          </button>
          <button
            type="button"
            className="btn btn-sm btn-outline-secondary mr-2"
            disabled={processing}
            onClick={() => runBulkAction('rollback', translate('react.shipment.list.confirmBulkRollback.label', 'Are you sure you want to rollback the selected shipments?'))}
          >
            <Translate id="react.shipment.list.bulkRollback.label" defaultMessage="Rollback selected" />
          </button>
          <button
            type="button"
            className="btn btn-sm btn-outline-danger"
            disabled={processing}
            onClick={() => runBulkAction('delete', translate('react.shipment.list.confirmBulkDelete.label', 'Are you sure you want to delete the selected shipments?'))}
          >
            <Translate id="react.shipment.list.bulkDelete.label" defaultMessage="Delete selected" />
          </button>
        </div>
      )}
      <table className="table table-sm table-bordered bg-white" data-testid="shipment-list-table">
        <thead>
          <tr>
            {data.isSuperuser && <th aria-label="select" />}
            <th>{translate('react.shipment.status.label', 'Status')}</th>
            <th>{translate('react.shipment.shipmentNumber.label', 'Shipment number')}</th>
            <th>{translate('react.shipment.shipmentName.label', 'Shipment name')}</th>
            <th className="text-right">{translate('react.shipment.numItems.label', 'Number of items')}</th>
            <th>{translate('react.shipment.origin.label', 'Origin')}</th>
            <th>{translate('react.shipment.destination.label', 'Destination')}</th>
            <th>{translate('react.shipment.shippedOn.label', 'Shipped on')}</th>
            <th>{translate('react.shipment.deliveredOn.label', 'Delivered on')}</th>
            <th>{translate('react.default.lastUpdated.label', 'Last updated')}</th>
          </tr>
        </thead>
        <tbody>
          {!shipments.length && (
            <tr>
              <td colSpan={data.isSuperuser ? 10 : 9} className="text-center text-muted">
                {translate('react.shipment.list.empty.label', 'No shipments returned')}
              </td>
            </tr>
          )}
          {shipments.map((shipment) => (
            <tr key={shipment.id} data-testid="shipment-list-row">
              {data.isSuperuser && (
                <td className="text-center">
                  <input
                    type="checkbox"
                    aria-label={`select-${shipment.shipmentNumber}`}
                    checked={!!selected[shipment.id]}
                    onChange={(event) => setSelected({
                      ...selected,
                      [shipment.id]: event.target.checked,
                    })}
                  />
                </td>
              )}
              <td>{shipment.status}</td>
              <td>
                <a href={`${SHIPMENT_SHOW_URL.show(shipment.id)}?override=true`}>
                  {shipment.shipmentNumber}
                </a>
              </td>
              <td>
                <a href={`${SHIPMENT_SHOW_URL.show(shipment.id)}?override=true`}>
                  {shipment.name}
                </a>
              </td>
              <td className="text-right">{shipment.shipmentItemCount}</td>
              <td>{shipment.origin}</td>
              <td>{shipment.destination}</td>
              <td>
                {shipment.hasShipped ? shipment.actualShippingDate : shipment.expectedShippingDate}
              </td>
              <td>
                {shipment.wasReceived ? shipment.actualDeliveryDate : shipment.expectedDeliveryDate}
              </td>
              <td>{shipment.lastUpdated}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ShipmentList;
