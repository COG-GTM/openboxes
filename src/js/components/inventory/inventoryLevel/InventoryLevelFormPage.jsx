import React, { useCallback, useEffect, useState } from 'react';

import { getTranslate } from 'react-localize-redux';
import { useSelector } from 'react-redux';
import { useParams } from 'react-router-dom';
import Alert from 'react-s-alert';

import { INVENTORY_LEVEL_BY_ID, INVENTORY_LEVELS_API, LOCATION_BIN_LOCATIONS } from 'api/urls';
import { INVENTORY_LEVEL_URL, PRODUCT_URL } from 'consts/applicationUrls';
import useQueryParams from 'hooks/useQueryParams';
import useTranslation from 'hooks/useTranslation';
import apiClient from 'utils/apiClient';
import { debounceProductsFetch, fetchLocations } from 'utils/option-utils';
import Select from 'utils/Select';
import Translate, { translateWithDefaultMessage } from 'utils/Translate';
import PageWrapper from 'wrappers/PageWrapper';

import 'components/inventory/styles.scss';

const STATUS_OPTIONS = [
  'INACTIVE',
  'NOT_SUPPORTED',
  'SUPPORTED_NON_INVENTORY',
  'SUPPORTED',
  'STOCK',
  'FORMULARY',
];

const TABS = ['target', 'replenishment', 'receiving', 'forecasting'];

const InventoryLevelFormPage = () => {
  useTranslation('inventoryLevel');

  const { id } = useParams();
  const queryParams = useQueryParams();

  const [activeTab, setActiveTab] = useState('target');
  const [locations, setLocations] = useState([]);
  const [binLocations, setBinLocations] = useState([]);
  const [version, setVersion] = useState(null);
  const [saving, setSaving] = useState(false);

  // Legacy domain default for new inventory levels is SUPPORTED
  const [status, setStatus] = useState(id ? null : { id: 'SUPPORTED', label: 'SUPPORTED' });
  const [product, setProduct] = useState(null);
  const [location, setLocation] = useState(null);
  const [internalLocation, setInternalLocation] = useState(null);
  const [abcClass, setAbcClass] = useState('');
  const [comments, setComments] = useState('');
  const [minQuantity, setMinQuantity] = useState('');
  const [reorderQuantity, setReorderQuantity] = useState('');
  const [maxQuantity, setMaxQuantity] = useState('');
  const [expectedLeadTimeDays, setExpectedLeadTimeDays] = useState('');
  const [replenishmentPeriodDays, setReplenishmentPeriodDays] = useState('');
  const [replenishmentLocation, setReplenishmentLocation] = useState(null);
  const [preferredBinLocation, setPreferredBinLocation] = useState(null);
  const [forecastQuantity, setForecastQuantity] = useState('');
  const [forecastPeriodDays, setForecastPeriodDays] = useState('');

  const {
    currentLocation, debounceTime, minSearchLength, translate,
  } = useSelector((state) => ({
    currentLocation: state.session.currentLocation,
    debounceTime: state.session.searchConfig.debounceTime,
    minSearchLength: state.session.searchConfig.minSearchLength,
    translate: translateWithDefaultMessage(getTranslate(state.localize)),
  }));

  const debouncedProductsFetch = useCallback(
    debounceProductsFetch(debounceTime, minSearchLength, currentLocation?.id),
    [debounceTime, minSearchLength, currentLocation?.id],
  );

  useEffect(() => {
    fetchLocations({ activityCodes: ['MANAGE_INVENTORY'] })
      .then((fetchedLocations) => setLocations(fetchedLocations));
  }, []);

  useEffect(() => {
    const facilityId = location?.id || currentLocation?.id;
    if (!facilityId) {
      return;
    }
    apiClient.get(LOCATION_BIN_LOCATIONS(facilityId))
      .then((response) => setBinLocations(response.data.data));
  }, [location?.id, currentLocation?.id]);

  useEffect(() => {
    if (!id && currentLocation?.id) {
      setLocation({ id: currentLocation.id, label: currentLocation.name });
    }
  }, [id, currentLocation?.id]);

  useEffect(() => {
    if (!id) {
      return;
    }
    apiClient.get(INVENTORY_LEVEL_BY_ID(id)).then((response) => {
      const level = response.data.data;
      setVersion(level.version);
      setStatus(level.status ? { id: level.status, label: level.status } : null);
      setProduct(level.product
        ? { id: level.product.id, label: `${level.product.productCode} - ${level.product.name}` }
        : null);
      setLocation(level.facility
        ? { id: level.facility.id, label: level.facility.name }
        : null);
      setInternalLocation(level.internalLocation
        ? { id: level.internalLocation.id, label: level.internalLocation.name }
        : null);
      setAbcClass(level.abcClass || '');
      setComments(level.comments || '');
      setMinQuantity(level.minQuantity ?? '');
      setReorderQuantity(level.reorderQuantity ?? '');
      setMaxQuantity(level.maxQuantity ?? '');
      setExpectedLeadTimeDays(level.expectedLeadTimeDays ?? '');
      setReplenishmentPeriodDays(level.replenishmentPeriodDays ?? '');
      setReplenishmentLocation(level.replenishmentLocation
        ? { id: level.replenishmentLocation.id, label: level.replenishmentLocation.name }
        : null);
      setPreferredBinLocation(level.preferredBinLocation
        ? { id: level.preferredBinLocation.id, label: level.preferredBinLocation.name }
        : null);
      setForecastQuantity(level.forecastQuantity ?? '');
      setForecastPeriodDays(level.forecastPeriodDays ?? '');
    });
  }, [id]);

  const save = async () => {
    setSaving(true);
    const payload = {
      status: status?.id || null,
      internalLocation: internalLocation ? { id: internalLocation.id } : null,
      preferredBinLocation: preferredBinLocation ? { id: preferredBinLocation.id } : null,
      replenishmentLocation: replenishmentLocation ? { id: replenishmentLocation.id } : null,
      abcClass: abcClass || null,
      comments: comments || null,
      minQuantity,
      reorderQuantity,
      maxQuantity,
      expectedLeadTimeDays,
      replenishmentPeriodDays,
      forecastQuantity,
      forecastPeriodDays,
    };
    try {
      let productId;
      if (id) {
        payload.version = version;
        const response = await apiClient.put(INVENTORY_LEVEL_BY_ID(id), payload);
        productId = response.data.data.product?.id;
      } else {
        payload.product = product ? { id: product.id } : null;
        payload.location = { id: location?.id || currentLocation?.id };
        const response = await apiClient.post(INVENTORY_LEVELS_API, payload);
        productId = response.data.data.product?.id;
      }
      // Mirror legacy redirect: back to redirectUrl if given, otherwise product edit
      window.location = queryParams?.redirectUrl || PRODUCT_URL.edit(productId);
    } catch (error) {
      Alert.error(error.response?.data?.errorMessage
        || error.response?.data?.errorMessages?.join(', ')
        || translate('react.inventoryLevel.saveFailed.label', 'Inventory level could not be saved'));
      setSaving(false);
    }
  };

  const numberField = (labelId, defaultLabel, value, setter, inputId) => (
    <div className="form-group row">
      <label className="col-sm-4 col-form-label" htmlFor={inputId}>
        <Translate id={labelId} defaultMessage={defaultLabel} />
      </label>
      <div className="col-sm-4">
        <input
          id={inputId}
          className="form-control"
          type="number"
          value={value}
          onChange={(e) => setter(e.target.value)}
        />
      </div>
    </div>
  );

  return (
    <PageWrapper className="inventory-level-form-page">
      <div className="list-page-header p-3 d-flex align-items-center justify-content-between">
        <h5 className="m-0">
          {id
            ? <Translate id="react.inventoryLevel.edit.title.label" defaultMessage="Edit Inventory Level" />
            : <Translate id="react.inventoryLevel.create.title.label" defaultMessage="Add Inventory Level" />}
        </h5>
        <a className="btn btn-outline-primary" href={INVENTORY_LEVEL_URL.list()}>
          <Translate id="react.inventoryLevel.list.title.label" defaultMessage="Inventory Levels" />
        </a>
      </div>
      <div className="p-3" style={{ maxWidth: '900px' }}>
        <ul className="nav nav-tabs mb-3">
          {TABS.map((tab) => (
            <li className="nav-item" key={tab}>
              <button
                type="button"
                className={`nav-link btn btn-link ${activeTab === tab ? 'active' : ''}`}
                onClick={() => setActiveTab(tab)}
              >
                <Translate
                  id={`react.inventoryLevel.tab.${tab}.label`}
                  defaultMessage={tab.charAt(0).toUpperCase() + tab.slice(1)}
                />
              </button>
            </li>
          ))}
        </ul>
        {activeTab === 'target' && (
          <div data-testid="tab-target">
            <div className="form-group row">
              <label className="col-sm-4 col-form-label" htmlFor="inventory-level-status">
                <Translate id="react.inventoryLevel.status.label" defaultMessage="Status" />
              </label>
              <div className="col-sm-6">
                <Select
                  id="inventory-level-status"
                  options={STATUS_OPTIONS.map((value) => ({ id: value, label: value }))}
                  value={status}
                  onChange={(value) => setStatus(value)}
                />
              </div>
            </div>
            <div className="form-group row">
              <label className="col-sm-4 col-form-label" htmlFor="inventory-level-product">
                <Translate id="react.inventoryLevel.product.label" defaultMessage="Product" />
              </label>
              <div className="col-sm-6">
                <Select
                  id="inventory-level-product"
                  async
                  loadOptions={debouncedProductsFetch}
                  cache={false}
                  value={product}
                  onChange={(value) => setProduct(value)}
                  disabled={!!id}
                />
              </div>
            </div>
            <div className="form-group row">
              <label className="col-sm-4 col-form-label" htmlFor="inventory-level-location">
                <Translate id="react.inventoryLevel.facility.label" defaultMessage="Facility" />
              </label>
              <div className="col-sm-6">
                <Select
                  id="inventory-level-location"
                  options={locations}
                  value={location}
                  onChange={(value) => setLocation(value)}
                  disabled={!!id}
                />
              </div>
            </div>
            <div className="form-group row">
              <label className="col-sm-4 col-form-label" htmlFor="inventory-level-bin-location">
                <Translate id="react.inventoryLevel.binLocation.label" defaultMessage="Bin Location" />
              </label>
              <div className="col-sm-6">
                <Select
                  id="inventory-level-bin-location"
                  options={binLocations}
                  valueKey="id"
                  labelKey="name"
                  value={internalLocation}
                  onChange={(value) => setInternalLocation(value)}
                />
              </div>
            </div>
            <div className="form-group row">
              <label className="col-sm-4 col-form-label" htmlFor="inventory-level-abc-class">
                <Translate id="react.inventoryLevel.abcClass.label" defaultMessage="ABC Analysis Class" />
              </label>
              <div className="col-sm-4">
                <input
                  id="inventory-level-abc-class"
                  className="form-control"
                  type="text"
                  value={abcClass}
                  onChange={(e) => setAbcClass(e.target.value)}
                />
              </div>
            </div>
            <div className="form-group row">
              <label className="col-sm-4 col-form-label" htmlFor="inventory-level-comments">
                <Translate id="react.inventoryLevel.comments.label" defaultMessage="Comments" />
              </label>
              <div className="col-sm-6">
                <textarea
                  id="inventory-level-comments"
                  className="form-control"
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                />
              </div>
            </div>
          </div>
        )}
        {activeTab === 'replenishment' && (
          <div data-testid="tab-replenishment">
            {numberField('react.inventoryLevel.minQuantity.label', 'Min Quantity', minQuantity, setMinQuantity, 'inventory-level-min-quantity')}
            {numberField('react.inventoryLevel.reorderQuantity.label', 'Reorder Quantity', reorderQuantity, setReorderQuantity, 'inventory-level-reorder-quantity')}
            {numberField('react.inventoryLevel.maxQuantity.label', 'Max Quantity', maxQuantity, setMaxQuantity, 'inventory-level-max-quantity')}
            {numberField('react.inventoryLevel.expectedLeadTimeDays.label', 'Expected Lead Time (days)', expectedLeadTimeDays, setExpectedLeadTimeDays, 'inventory-level-lead-time')}
            {numberField('react.inventoryLevel.replenishmentPeriodDays.label', 'Replenishment Period (days)', replenishmentPeriodDays, setReplenishmentPeriodDays, 'inventory-level-replenishment-period')}
            <div className="form-group row">
              <label className="col-sm-4 col-form-label" htmlFor="inventory-level-replenishment-location">
                <Translate id="react.inventoryLevel.replenishmentLocation.label" defaultMessage="Replenishment Source" />
              </label>
              <div className="col-sm-6">
                <Select
                  id="inventory-level-replenishment-location"
                  options={binLocations}
                  valueKey="id"
                  labelKey="name"
                  value={replenishmentLocation}
                  onChange={(value) => setReplenishmentLocation(value)}
                />
              </div>
            </div>
          </div>
        )}
        {activeTab === 'receiving' && (
          <div data-testid="tab-receiving">
            <div className="form-group row">
              <label className="col-sm-4 col-form-label" htmlFor="inventory-level-preferred-bin">
                <Translate id="react.inventoryLevel.preferredBinLocation.label" defaultMessage="Preferred Putaway Location" />
              </label>
              <div className="col-sm-6">
                <Select
                  id="inventory-level-preferred-bin"
                  options={binLocations}
                  valueKey="id"
                  labelKey="name"
                  value={preferredBinLocation}
                  onChange={(value) => setPreferredBinLocation(value)}
                  disabled={!!internalLocation}
                />
              </div>
            </div>
          </div>
        )}
        {activeTab === 'forecasting' && (
          <div data-testid="tab-forecasting">
            {numberField('react.inventoryLevel.forecastQuantity.label', 'Forecast Quantity', forecastQuantity, setForecastQuantity, 'inventory-level-forecast-quantity')}
            {numberField('react.inventoryLevel.forecastPeriodDays.label', 'Forecast Period (days)', forecastPeriodDays, setForecastPeriodDays, 'inventory-level-forecast-period')}
          </div>
        )}
        <div className="mt-3">
          <button
            type="button"
            className="btn btn-primary mr-2"
            onClick={save}
            disabled={saving || (!id && !product)}
          >
            <Translate id="react.default.button.save.label" defaultMessage="Save" />
          </button>
          {id && (
            <a className="btn btn-outline-secondary" href={INVENTORY_LEVEL_URL.show(id)}>
              <Translate id="react.default.button.show.label" defaultMessage="Show" />
            </a>
          )}
        </div>
      </div>
    </PageWrapper>
  );
};

export default InventoryLevelFormPage;
