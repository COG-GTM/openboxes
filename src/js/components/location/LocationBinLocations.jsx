import React, { useEffect, useMemo, useState } from 'react';

import _ from 'lodash';
import { confirmAlert } from 'react-confirm-alert';
import { getTranslate } from 'react-localize-redux';
import { useSelector } from 'react-redux';
import { useParams } from 'react-router-dom';

import locationApi from 'api/services/LocationApi';
import DataTable, { TableCell } from 'components/DataTable';
import CheckboxField from 'components/form-elements/CheckboxField';
import SelectField from 'components/form-elements/SelectField';
import TextField from 'components/form-elements/TextField';
import AddBinModal from 'components/locations-configuration/modals/AddBinModal';
import ImportBinModal from 'components/locations-configuration/modals/ImportBinModal';
import { LOCATION_URL } from 'consts/applicationUrls';
import useTranslation from 'hooks/useTranslation';
import StatusIndicator from 'utils/StatusIndicator';
import Translate, { translateWithDefaultMessage } from 'utils/Translate';
import splitTranslation from 'utils/translation-utils';
import ListTableTitleWrapper from 'wrappers/ListTableTitleWrapper';
import ListTableWrapper from 'wrappers/ListTableWrapper';
import PageWrapper from 'wrappers/PageWrapper';

import 'react-confirm-alert/src/react-confirm-alert.css';

const BIN_FIELDS = {
  active: {
    type: CheckboxField,
    label: 'react.locationsConfiguration.addZone.status.label',
    defaultMessage: 'Status',
    attributes: {
      withLabel: true,
      label: 'Active',
    },
  },
  name: {
    type: TextField,
    label: 'react.locationsConfiguration.name.label',
    defaultMessage: 'Name',
    attributes: {
      required: true,
    },
  },
  locationType: {
    type: SelectField,
    label: 'react.locationsConfiguration.binType.label',
    defaultMessage: 'Bin Type',
    attributes: {
      required: true,
      valueKey: 'id',
      labelKey: 'name',
    },
    getDynamicAttr: ({ binTypes }) => ({
      options: binTypes,
    }),
  },
  zoneLocation: {
    type: SelectField,
    label: 'react.locationsConfiguration.zoneLocation.label',
    defaultMessage: 'Zone Location',
    attributes: {
      valueKey: 'id',
      labelKey: 'name',
    },
    getDynamicAttr: ({ zoneData }) => ({
      options: zoneData,
    }),
  },
};

const binValidate = (values) => {
  const requiredFields = ['name', 'locationType'];
  return Object.keys(BIN_FIELDS)
    .reduce((acc, fieldName) => {
      if (!values[fieldName] && requiredFields.includes(fieldName)) {
        return {
          ...acc,
          [fieldName]: 'react.default.error.requiredField.label',
        };
      }
      return acc;
    }, {});
};

const LocationBinLocations = () => {
  useTranslation('location', 'locationsConfiguration');

  const { locationId } = useParams();

  const [location, setLocation] = useState(null);
  const [binLocations, setBinLocations] = useState([]);
  const [zoneData, setZoneData] = useState([]);
  const [binTypes, setBinTypes] = useState([]);
  const [loading, setLoading] = useState(true);

  const { locale, translate } = useSelector((state) => ({
    locale: state.session.activeLanguage,
    translate: translateWithDefaultMessage(getTranslate(state.localize)),
  }));

  const fetchBinLocations = () => {
    setLoading(true);
    locationApi.getBinLocations(locationId)
      .then((response) => {
        setBinLocations(response.data.data ?? []);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    locationApi.getLocationDetails(locationId)
      .then((response) => setLocation(response.data.data));
    locationApi.getZoneLocations(locationId)
      .then((response) => setZoneData(response.data.data ?? []));
    locationApi.getLocationTypes()
      .then((response) => {
        const types = _.map(response.data.data, (locationType) => ({
          ...locationType,
          label: splitTranslation(locationType.name, locale),
        }));
        setBinTypes(types.filter(({ locationTypeCode }) => locationTypeCode === 'BIN_LOCATION' || locationTypeCode === 'INTERNAL'));
      });
    fetchBinLocations();
  }, [locationId]);

  const deleteBinLocation = (binLocation) => {
    confirmAlert({
      title: translate('react.locationsConfiguration.deleteZoneConfirm.title.label', 'Deleting a location'),
      message: translate(
        'react.locationsConfiguration.deleteZoneConfirm.subtitle.label',
        'If you press \'Yes\', this will delete the location. If you decide not to delete the location, press \'No\'',
      ),
      buttons: [
        {
          label: translate('react.default.yes.label', 'Yes'),
          onClick: () => {
            locationApi.deleteLocation(binLocation.id).then(() => fetchBinLocations());
          },
        },
        {
          label: translate('react.default.no.label', 'No'),
        },
      ],
    });
  };

  const columns = useMemo(() => [
    {
      Header: <Translate id="react.location.column.status.label" defaultMessage="Status" />,
      accessor: 'active',
      width: 100,
      className: 'active-circle d-flex justify-content-center',
      headerClassName: 'header justify-content-center',
      Cell: (row) => (
        <StatusIndicator
          variant={row.original.active ? 'success' : 'danger'}
          status={row.original.active ? 'Active' : 'Inactive'}
        />
      ),
    },
    {
      Header: <Translate id="react.location.column.binLocation.label" defaultMessage="Bin Location" />,
      accessor: 'name',
      minWidth: 250,
      Cell: (row) => (
        <TableCell
          {...row}
          tooltip
          link={LOCATION_URL.edit(row.original.id)}
        />
      ),
    },
    {
      Header: <Translate id="react.location.column.zone.label" defaultMessage="Zone" />,
      accessor: 'zone.name',
      minWidth: 150,
      Cell: (row) => <TableCell {...row} tooltip />,
    },
    {
      Header: <Translate id="react.location.column.locationType.label" defaultMessage="Location Type" />,
      accessor: 'locationType.name',
      minWidth: 150,
      Cell: (row) => (
        <TableCell
          {...row}
          value={splitTranslation(row.original.locationType?.name, locale)}
        />
      ),
    },
    {
      Header: <Translate id="react.default.actions.label" defaultMessage="Actions" />,
      width: 150,
      sortable: false,
      Cell: (row) => (
        <div className="d-flex align-items-center justify-content-center w-100" style={{ gap: '12px' }}>
          <a href={LOCATION_URL.showContents(row.original.id)} title={translate('react.location.showContents.label', 'Show contents')}>
            <i className="fa fa-search action-icons icon-pointer" aria-hidden="true" />
          </a>
          <a href={LOCATION_URL.edit(row.original.id)} title={translate('react.default.button.edit.label', 'Edit')}>
            <i className="fa fa-pencil action-icons icon-pointer" aria-hidden="true" />
          </a>
          <i
            className="fa fa-trash-o action-icons icon-pointer"
            aria-hidden="true"
            role="button"
            tabIndex={0}
            onClick={() => deleteBinLocation(row.original)}
            onKeyPress={() => deleteBinLocation(row.original)}
          />
        </div>
      ),
    },
  ], [locale]);

  return (
    <PageWrapper>
      <ListTableWrapper>
        <ListTableTitleWrapper>
          <span>
            <Translate id="react.location.binLocations.label" defaultMessage="Bin Locations" />
            {location?.name ? `: ${location.name}` : ''}
            &nbsp;
            (
            {binLocations.length}
            )
          </span>
          <div className="d-flex align-items-center" style={{ gap: '3px' }}>
            {!location?.isZoneLocation && (
              <AddBinModal
                FIELDS={BIN_FIELDS}
                validate={binValidate}
                locationId={locationId}
                addBinLocation={fetchBinLocations}
                binTypes={binTypes}
                zoneData={zoneData}
              />
            )}
            {!location?.isZoneLocation && (
              <ImportBinModal
                locationId={locationId}
                onResponse={fetchBinLocations}
              />
            )}
            <a className="btn btn-outline-primary add-zonebin-btn btn-xs" href={LOCATION_URL.exportBinLocations(locationId)}>
              <i className="fa fa-arrow-up mr-1" aria-hidden="true" />
              <Translate id="react.locationsConfiguration.exportBinLocations.label" defaultMessage="Export Bin Locations" />
            </a>
            <a className="btn btn-outline-primary btn-xs" href={LOCATION_URL.edit(locationId)}>
              <Translate id="react.location.backToLocation.label" defaultMessage="Back to location" />
            </a>
          </div>
        </ListTableTitleWrapper>
        <DataTable
          columns={columns}
          data={binLocations}
          loading={loading}
          defaultPageSize={10}
          noDataText={translate('react.location.noBinLocations.label', 'No bin locations')}
        />
      </ListTableWrapper>
    </PageWrapper>
  );
};

export default LocationBinLocations;
