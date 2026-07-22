import React, { useEffect, useState } from 'react';

import { getTranslate } from 'react-localize-redux';
import { useSelector } from 'react-redux';
import Alert from 'react-s-alert';

import useTranslation from 'hooks/useTranslation';
import apiClient from 'utils/apiClient';
import Select from 'utils/Select';
import Translate, { translateWithDefaultMessage } from 'utils/Translate';
import PageWrapper from 'wrappers/PageWrapper';

import 'components/inventory/styles.scss';

// The legacy controller expects MM/dd/yyyy dates
const toLegacyDate = (isoDate) => {
  if (!isoDate) {
    return null;
  }
  const [year, month, day] = isoDate.split('-');
  return `${month}/${day}/${year}`;
};

const InventorySnapshotEditPage = () => {
  useTranslation('inventory');

  const [locations, setLocations] = useState([]);
  const [location, setLocation] = useState(null);
  const [date, setDate] = useState('');
  const [running, setRunning] = useState(false);

  const { currentLocation, translate } = useSelector((state) => ({
    currentLocation: state.session.currentLocation,
    translate: translateWithDefaultMessage(getTranslate(state.localize)),
  }));

  useEffect(() => {
    apiClient.get('/inventorySnapshot/locations')
      .then((response) => setLocations(response.data));
  }, []);

  useEffect(() => {
    if (currentLocation?.id && !location) {
      setLocation({ id: currentLocation.id, name: currentLocation.name });
    }
  }, [currentLocation?.id]);

  const refreshSnapshot = async () => {
    if (!location?.id || !date) {
      Alert.error(translate('react.inventorySnapshot.validation.label', 'Please select a location and date'));
      return;
    }
    setRunning(true);
    try {
      const response = await apiClient.get('/inventorySnapshot/update', {
        params: {
          date: toLegacyDate(date),
          'location.id': location.id,
        },
      });
      if (response.data?.error) {
        Alert.error(response.data.message);
      } else {
        Alert.success(translate('react.inventorySnapshot.triggered.label', 'Inventory snapshot refresh has been triggered'));
      }
    } catch (error) {
      Alert.error(error.response?.data?.message
        || translate('react.inventorySnapshot.failed.label', 'Unable to trigger inventory snapshot refresh'));
    } finally {
      setRunning(false);
    }
  };

  return (
    <PageWrapper className="inventory-snapshot-edit-page">
      <div className="list-page-header p-3 d-flex align-items-center justify-content-between">
        <h5 className="m-0">
          <Translate id="react.inventorySnapshot.edit.title.label" defaultMessage="Refresh Inventory Snapshot" />
        </h5>
      </div>
      <div className="list-page-filters d-flex align-items-end flex-wrap p-3">
        <div className="inventory-filter-select mr-3">
          <label htmlFor="inventory-snapshot-location">
            <Translate id="react.inventorySnapshot.location.label" defaultMessage="Location" />
          </label>
          <Select
            id="inventory-snapshot-location"
            options={locations}
            valueKey="id"
            labelKey="name"
            value={location}
            onChange={(value) => setLocation(value)}
          />
        </div>
        <div className="mr-3">
          <label htmlFor="inventory-snapshot-date">
            <Translate id="react.inventorySnapshot.date.label" defaultMessage="Date" />
          </label>
          <input
            id="inventory-snapshot-date"
            className="form-control"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
        <button
          type="button"
          className="btn btn-primary mb-1"
          onClick={refreshSnapshot}
          disabled={running}
        >
          <Translate id="react.inventorySnapshot.refresh.label" defaultMessage="Refresh Snapshot" />
        </button>
      </div>
    </PageWrapper>
  );
};

export default InventorySnapshotEditPage;
