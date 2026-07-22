import React, { useMemo } from 'react';

import PropTypes from 'prop-types';

import { debounceLocationsFetch, debouncePeopleFetch } from 'utils/option-utils';
import Select from 'utils/Select';
import Translate from 'utils/Translate';

const REPLENISHMENT_TYPE_CODES = ['PUSH', 'PULL'];

const SORT_BY_CODES = [
  { value: 'DEFAULT', label: 'Sort by date added' },
  { value: 'CATEGORY', label: 'Sort by category' },
  { value: 'SORT_INDEX', label: 'Sort by sort index' },
];

const StockListTemplateHeaderForm = ({
  form, setField, onSubmit, saving, submitLabel, submitDefaultMessage,
}) => {
  const debouncedPeopleFetch = useMemo(() => debouncePeopleFetch(500, 2), []);
  const debouncedLocationsFetch = useMemo(() => debounceLocationsFetch(500, 2, null, true), []);

  return (
    <form className="card-body" onSubmit={onSubmit}>
      <div className="form-group row">
        <label className="col-sm-3 col-form-label" htmlFor="stocklist-template-name">
          <Translate id="react.default.name.label" defaultMessage="Name" />
        </label>
        <div className="col-sm-6">
          <input
            id="stocklist-template-name"
            className="form-control"
            required
            value={form.name || ''}
            onChange={(event) => setField('name', event.target.value)}
            data-testid="stocklist-template-name-input"
          />
        </div>
      </div>
      <div className="form-group row">
        <label className="col-sm-3 col-form-label" htmlFor="stocklist-template-origin-select">
          <Translate id="react.requisition.origin.label" defaultMessage="Origin" />
        </label>
        <div className="col-sm-6">
          <Select
            async
            loadOptions={debouncedLocationsFetch}
            value={form.origin}
            onChange={(value) => setField('origin', value)}
            valueKey="id"
            labelKey="name"
            id="stocklist-template-origin-select"
            dataTestId="stocklist-template-origin-select"
          />
        </div>
      </div>
      <div className="form-group row">
        <label className="col-sm-3 col-form-label" htmlFor="stocklist-template-destination-select">
          <Translate id="react.requisition.destination.label" defaultMessage="Destination" />
        </label>
        <div className="col-sm-6">
          <Select
            async
            loadOptions={debouncedLocationsFetch}
            value={form.destination}
            onChange={(value) => setField('destination', value)}
            valueKey="id"
            labelKey="name"
            id="stocklist-template-destination-select"
            dataTestId="stocklist-template-destination-select"
          />
        </div>
      </div>
      <div className="form-group row">
        <label className="col-sm-3 col-form-label" htmlFor="stocklist-template-requested-by-select">
          <Translate id="react.requisition.requestedBy.label" defaultMessage="Requested by" />
        </label>
        <div className="col-sm-6">
          <Select
            async
            loadOptions={debouncedPeopleFetch}
            value={form.requestedBy}
            onChange={(value) => setField('requestedBy', value)}
            valueKey="id"
            labelKey="name"
            id="stocklist-template-requested-by-select"
            dataTestId="stocklist-template-requested-by-select"
          />
        </div>
      </div>
      <div className="form-group row">
        <label className="col-sm-3 col-form-label" htmlFor="stocklist-template-replenishment-period">
          <Translate id="react.stockListTemplate.replenishmentPeriod.label" defaultMessage="Replenishment period (days)" />
        </label>
        <div className="col-sm-6">
          <input
            type="number"
            min="0"
            id="stocklist-template-replenishment-period"
            className="form-control"
            value={form.replenishmentPeriod ?? ''}
            onChange={(event) => setField('replenishmentPeriod', event.target.value)}
            data-testid="stocklist-template-replenishment-period"
          />
        </div>
      </div>
      <div className="form-group row">
        <label className="col-sm-3 col-form-label" htmlFor="stocklist-template-replenishment-type-select">
          <Translate id="react.stockListTemplate.replenishmentTypeCode.label" defaultMessage="Replenishment type" />
        </label>
        <div className="col-sm-6">
          <Select
            options={REPLENISHMENT_TYPE_CODES.map((value) => ({ value, label: value }))}
            value={form.replenishmentTypeCode
              ? { value: form.replenishmentTypeCode, label: form.replenishmentTypeCode } : null}
            onChange={(value) => setField('replenishmentTypeCode', value?.value ?? value ?? null)}
            id="stocklist-template-replenishment-type-select"
          />
        </div>
      </div>
      <div className="form-group row">
        <label className="col-sm-3 col-form-label" htmlFor="stocklist-template-sort-by-select">
          <Translate id="react.stockListTemplate.sortByCode.label" defaultMessage="Sort order" />
        </label>
        <div className="col-sm-6">
          <Select
            options={SORT_BY_CODES}
            value={form.sortByCode
              ? SORT_BY_CODES.find((option) => option.value === form.sortByCode) : null}
            onChange={(value) => setField('sortByCode', value?.value ?? value ?? null)}
            id="stocklist-template-sort-by-select"
          />
        </div>
      </div>
      <div className="form-group row">
        <label className="col-sm-3 col-form-label" htmlFor="stocklist-template-description">
          <Translate id="react.default.description.label" defaultMessage="Description" />
        </label>
        <div className="col-sm-6">
          <textarea
            id="stocklist-template-description"
            className="form-control"
            rows="3"
            value={form.description || ''}
            onChange={(event) => setField('description', event.target.value)}
            data-testid="stocklist-template-description"
          />
        </div>
      </div>
      <div className="d-flex justify-content-center">
        <button
          type="submit"
          className="btn btn-primary"
          disabled={saving}
          data-testid="stocklist-template-save-button"
        >
          <Translate id={submitLabel} defaultMessage={submitDefaultMessage} />
        </button>
      </div>
    </form>
  );
};

export default StockListTemplateHeaderForm;

StockListTemplateHeaderForm.propTypes = {
  form: PropTypes.shape({}).isRequired,
  setField: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
  saving: PropTypes.bool,
  submitLabel: PropTypes.string,
  submitDefaultMessage: PropTypes.string,
};

StockListTemplateHeaderForm.defaultProps = {
  saving: false,
  submitLabel: 'react.default.button.save.label',
  submitDefaultMessage: 'Save',
};
