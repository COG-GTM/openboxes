import React, { useEffect, useMemo, useState } from 'react';

import moment from 'moment';
import queryString from 'query-string';
import { getTranslate } from 'react-localize-redux';
import { useSelector } from 'react-redux';
import { useHistory, useLocation } from 'react-router-dom';

import requisitionApi from 'api/services/RequisitionApi';
import { REQUISITION_URL } from 'consts/applicationUrls';
import useTranslation from 'hooks/useTranslation';
import { debounceLocationsFetch, debouncePeopleFetch, debounceUsersFetch } from 'utils/option-utils';
import Select from 'utils/Select';
import Translate, { translateWithDefaultMessage } from 'utils/Translate';

// Mirrors RequisitionStatus.list() used by the legacy status button bar
const REQUISITION_STATUSES = [
  'CREATED', 'EDITING', 'VERIFYING', 'PICKING', 'PICKED', 'CHECKING',
  'ISSUED', 'CANCELED', 'PENDING', 'REQUESTED', 'PENDING_APPROVAL',
  'APPROVED', 'REJECTED',
];

const REQUISITION_TYPES = ['STOCK', 'NON_STOCK', 'ADHOC', 'DEFAULT'];

const PAGE_SIZE = 25;

const prettyDate = (value) => {
  if (!value) {
    return null;
  }
  return value.split(' ')[0];
};

const DATE_TIME_FORMAT = 'DD/MMM/YYYY HH:mm:ss';

// Mirrors the legacy "time to process" column: dateIssued (or the furthest
// milestone reached) minus dateCreated, rendered as a rough duration.
const timeToProcess = (row) => {
  const end = row.dateIssued || row.dateChecked || row.datePicked
    || row.dateVerified || row.lastUpdated;
  if (!end || !row.dateCreated) {
    return null;
  }
  const ms = moment(end, DATE_TIME_FORMAT).valueOf()
    - moment(row.dateCreated, DATE_TIME_FORMAT).valueOf();
  if (Number.isNaN(ms) || ms < 0) {
    return null;
  }
  const days = Math.floor(ms / (24 * 3600 * 1000));
  const hours = Math.floor((ms % (24 * 3600 * 1000)) / (3600 * 1000));
  const minutes = Math.floor((ms % (3600 * 1000)) / (60 * 1000));
  if (days > 0) {
    return `${days}d ${hours}h`;
  }
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
};

const RequisitionList = () => {
  const history = useHistory();
  const location = useLocation();
  const query = queryString.parse(location.search);

  const [rows, setRows] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [statistics, setStatistics] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [q, setQ] = useState(query.q || '');
  const [status, setStatus] = useState(query.status || null);
  const [type, setType] = useState(query.type || null);
  const [destination, setDestination] = useState(null);
  const [requestedBy, setRequestedBy] = useState(null);
  const [createdBy, setCreatedBy] = useState(null);
  const [updatedBy, setUpdatedBy] = useState(null);
  const [relatedToMe, setRelatedToMe] = useState(query.relatedToMe === 'true');
  const [offset, setOffset] = useState(0);

  useTranslation('requisition', 'default');

  const translate = useSelector(
    (state) => translateWithDefaultMessage(getTranslate(state.localize)),
  );

  const debouncedPeopleFetch = useMemo(() => debouncePeopleFetch(500, 2), []);
  const debouncedUsersFetch = useMemo(() => debounceUsersFetch(500, 2), []);
  const debouncedLocationsFetch = useMemo(() => debounceLocationsFetch(500, 2, null, true), []);

  const fetchRequisitions = (fetchOffset = offset) => {
    setLoading(true);
    const params = {
      q: q || undefined,
      status: status || undefined,
      type: type || undefined,
      destinationId: destination?.id || undefined,
      requestedById: requestedBy?.id || undefined,
      createdById: createdBy?.id || undefined,
      updatedById: updatedBy?.id || undefined,
      relatedToMe: relatedToMe || undefined,
      max: PAGE_SIZE,
      offset: fetchOffset,
    };
    requisitionApi.getRequisitions(params)
      .then(({ data }) => {
        setRows(data?.data ?? []);
        setTotalCount(data?.totalCount ?? 0);
        setStatistics(data?.statistics ?? {});
        setError(null);
      })
      .catch((err) => {
        setError(err?.response?.data?.errorMessage || 'An error occurred while loading requisitions');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchRequisitions();
  }, [status, relatedToMe, offset]);

  const search = (event) => {
    event.preventDefault();
    if (offset !== 0) {
      setOffset(0);
    } else {
      fetchRequisitions(0);
    }
  };

  // legacy export actions bind these params onto a Requisition criteria object
  const exportParams = {
    q: q || undefined,
    status: status || undefined,
    type: type || undefined,
    'destination.id': destination?.id || undefined,
    'requestedBy.id': requestedBy?.id || undefined,
    'createdBy.id': createdBy?.id || undefined,
    'updatedBy.id': updatedBy?.id || undefined,
    relatedToMe: relatedToMe || undefined,
  };

  const selectStatus = (value) => {
    setStatus(value);
    setOffset(0);
    history.replace({
      pathname: location.pathname,
      search: queryString.stringify({ ...query, status: value || undefined }),
    });
  };

  return (
    <div className="d-flex flex-column m-3">
      <div className="d-flex justify-content-between align-items-center mb-2">
        <h4 data-testid="requisition-list-title">
          <Translate id="react.requisition.list.label" defaultMessage="List Requisitions" />
          {` (${totalCount})`}
        </h4>
        <div>
          <a className="btn btn-outline-secondary btn-sm mr-2" href={REQUISITION_URL.exportRequisitions(exportParams)}>
            <Translate id="react.requisition.button.exportRequisitions.label" defaultMessage="Export requisitions" />
          </a>
          <a className="btn btn-outline-secondary btn-sm" href={REQUISITION_URL.exportRequisitionItems(exportParams)}>
            <Translate id="react.requisition.button.exportRequisitionItems.label" defaultMessage="Export requisition items" />
          </a>
        </div>
      </div>
      <div className="mb-2" data-testid="requisition-status-buttons">
        <button
          type="button"
          className={`btn btn-sm mr-1 mb-1 ${relatedToMe ? 'btn-primary' : 'btn-outline-secondary'}`}
          onClick={() => { setRelatedToMe(!relatedToMe); setOffset(0); }}
        >
          <Translate id="react.requisition.relatedToMe.label" defaultMessage="My requisitions" />
          {` (${statistics.MINE ?? 0})`}
        </button>
        <button
          type="button"
          className={`btn btn-sm mr-1 mb-1 ${!status ? 'btn-primary' : 'btn-outline-secondary'}`}
          onClick={() => selectStatus(null)}
        >
          <Translate id="react.default.all.label" defaultMessage="All" />
          {` (${statistics.ALL ?? 0})`}
        </button>
        {REQUISITION_STATUSES.filter((value) => statistics[value] > 0).map((value) => (
          <button
            key={value}
            type="button"
            className={`btn btn-sm mr-1 mb-1 ${status === value ? 'btn-primary' : 'btn-outline-secondary'}`}
            onClick={() => selectStatus(value)}
          >
            {`${value} (${statistics[value]})`}
          </button>
        ))}
      </div>
      {error && <div className="alert alert-danger" role="alert">{error}</div>}
      <div className="row">
        <div className="col-md-3">
          <div className="card">
            <div className="card-header">
              <Translate id="react.default.filters.label" defaultMessage="Filters" />
            </div>
            <form className="card-body" onSubmit={search}>
              <div className="form-group">
                <label htmlFor="requisition-search-field">
                  <Translate id="react.default.search.label" defaultMessage="Search" />
                </label>
                <input
                  id="requisition-search-field"
                  data-testid="requisition-search-field"
                  className="form-control"
                  value={q}
                  onChange={(event) => setQ(event.target.value)}
                  placeholder="Search by requisition number, name, etc"
                />
              </div>
              <div className="form-group">
                <label htmlFor="requisition-type-select">
                  <Translate id="react.requisition.requisitionType.label" defaultMessage="Requisition type" />
                </label>
                <Select
                  options={REQUISITION_TYPES.map((value) => ({ value, label: value }))}
                  value={type ? { value: type, label: type } : null}
                  onChange={(value) => setType(value?.value ?? value ?? null)}
                  id="requisition-type-select"
                />
              </div>
              <div className="form-group">
                <label htmlFor="requisition-destination-filter">
                  <Translate id="react.requisition.destination.label" defaultMessage="Destination" />
                </label>
                <Select
                  async
                  loadOptions={debouncedLocationsFetch}
                  value={destination}
                  onChange={(value) => setDestination(value)}
                  valueKey="id"
                  labelKey="name"
                  id="requisition-destination-filter"
                />
              </div>
              <div className="form-group">
                <label htmlFor="requisition-requested-by-filter">
                  <Translate id="react.requisition.requestedBy.label" defaultMessage="Requested by" />
                </label>
                <Select
                  async
                  loadOptions={debouncedPeopleFetch}
                  value={requestedBy}
                  onChange={(value) => setRequestedBy(value)}
                  valueKey="id"
                  labelKey="name"
                  id="requisition-requested-by-filter"
                />
              </div>
              <div className="form-group">
                <label htmlFor="requisition-created-by-filter">
                  <Translate id="react.default.createdBy.label" defaultMessage="Created by" />
                </label>
                <Select
                  async
                  loadOptions={debouncedUsersFetch}
                  value={createdBy}
                  onChange={(value) => setCreatedBy(value)}
                  valueKey="id"
                  labelKey="name"
                  id="requisition-created-by-filter"
                />
              </div>
              <div className="form-group">
                <label htmlFor="requisition-updated-by-filter">
                  <Translate id="react.default.updatedBy.label" defaultMessage="Updated by" />
                </label>
                <Select
                  async
                  loadOptions={debouncedUsersFetch}
                  value={updatedBy}
                  onChange={(value) => setUpdatedBy(value)}
                  valueKey="id"
                  labelKey="name"
                  id="requisition-updated-by-filter"
                />
              </div>
              <button type="submit" className="btn btn-primary" data-testid="requisition-search-button">
                <Translate id="react.default.search.label" defaultMessage="Search" />
              </button>
            </form>
          </div>
        </div>
        <div className="col-md-9">
          <div className="card">
            <div className="card-header">
              <Translate id="react.requisition.requisitions.label" defaultMessage="Requisitions" />
            </div>
            <table className="table table-sm table-striped mb-0" data-testid="requisition-list-table">
              <thead>
                <tr>
                  <th>{translate('react.default.numItems.label', '# items')}</th>
                  <th>{translate('react.requisition.status.label', 'Status')}</th>
                  <th>{translate('react.requisition.requestNumber.label', 'Request number')}</th>
                  <th>{translate('react.requisition.requisitionType.label', 'Type')}</th>
                  <th>{translate('react.default.name.label', 'Name')}</th>
                  <th>{translate('react.requisition.requestedBy.label', 'Requested by')}</th>
                  <th>{translate('react.requisition.dateRequested.label', 'Date requested')}</th>
                  <th>{translate('react.requisition.dateIssued.label', 'Date issued')}</th>
                  <th>{translate('react.requisition.timeToProcess.label', 'Time to process')}</th>
                </tr>
              </thead>
              <tbody>
                {!loading && !rows.length && (
                  <tr>
                    <td colSpan="9" className="text-center text-muted">
                      <Translate
                        id="react.requisition.noRequisitionsMatchingCriteria.label"
                        defaultMessage="No requisitions matching criteria"
                      />
                    </td>
                  </tr>
                )}
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td>{row.requisitionItemCount}</td>
                    <td><span className="badge badge-info">{row.status}</span></td>
                    <td>
                      <a href={REQUISITION_URL.show(row.id)}>
                        <strong>{row.requestNumber}</strong>
                      </a>
                    </td>
                    <td>{row.type}</td>
                    <td><a href={REQUISITION_URL.show(row.id)}>{row.name}</a></td>
                    <td>{row.requestedBy || <span className="text-muted">None</span>}</td>
                    <td>{row.dateRequested}</td>
                    <td>{prettyDate(row.dateIssued)}</td>
                    <td>{timeToProcess(row)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {totalCount > PAGE_SIZE && (
              <div
                className="d-flex justify-content-between align-items-center"
                data-testid="requisition-list-pagination"
              >
                <button
                  type="button"
                  className="btn btn-outline-secondary btn-sm"
                  disabled={offset === 0}
                  onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
                >
                  <Translate id="react.default.button.previous.label" defaultMessage="Previous" />
                </button>
                <span className="text-muted">
                  {`${offset + 1} - ${Math.min(offset + PAGE_SIZE, totalCount)} / ${totalCount}`}
                </span>
                <button
                  type="button"
                  className="btn btn-outline-secondary btn-sm"
                  disabled={offset + PAGE_SIZE >= totalCount}
                  onClick={() => setOffset(offset + PAGE_SIZE)}
                >
                  <Translate id="react.default.button.next.label" defaultMessage="Next" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RequisitionList;
