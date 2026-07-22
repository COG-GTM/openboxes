import React, { useCallback, useEffect, useState } from 'react';

import _ from 'lodash';
import { Form } from 'react-final-form';
import { getTranslate } from 'react-localize-redux';
import { useDispatch, useSelector } from 'react-redux';
import { useHistory, useParams } from 'react-router-dom';
import Alert from 'react-s-alert';

import { hideSpinner, showSpinner } from 'actions';
import locationApi from 'api/services/LocationApi';
import CheckboxField from 'components/form-elements/CheckboxField';
import ColorPickerField from 'components/form-elements/ColorPickerField';
import SelectField from 'components/form-elements/SelectField';
import TextField from 'components/form-elements/TextField';
import ActivityCode from 'consts/activityCode';
import { LOCATION_URL } from 'consts/applicationUrls';
import useTranslation from 'hooks/useTranslation';
import Checkbox from 'utils/Checkbox';
import { renderFormField } from 'utils/form-utils';
import {
  debounceLocationGroupsFetch,
  debounceLocationsFetch,
  debounceOrganizationsFetch,
  debouncePeopleFetch,
} from 'utils/option-utils';
import Translate, { translateWithDefaultMessage } from 'utils/Translate';
import splitTranslation from 'utils/translation-utils';
import PageWrapper from 'wrappers/PageWrapper';

function validate(values) {
  const errors = {};

  if (!values.name) {
    errors.name = 'react.default.error.requiredField.label';
  }
  const organizationRequired = ['DEPOT', 'SUPPLIER']
    .includes(values.locationType?.locationTypeCode);
  if (organizationRequired && !values.organization) {
    errors.organization = 'react.default.error.requiredField.label';
  }
  if (!values.locationType) {
    errors.locationType = 'react.default.error.requiredField.label';
  }
  if (values.supportedActivities?.length > 1
    && values.supportedActivities?.find((activity) => activity.value === ActivityCode.NONE)) {
    errors.supportedActivities = 'react.locationsConfiguration.error.supportedActivities.label';
  }

  return errors;
}

const DETAILS_FIELDS = {
  active: {
    type: CheckboxField,
    label: 'react.locationsConfiguration.locationStatus.label',
    defaultMessage: 'Location Status',
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
  locationNumber: {
    type: TextField,
    label: 'react.locationsConfiguration.locationNumber.label',
    defaultMessage: 'Location Number',
  },
  organization: {
    type: SelectField,
    label: 'react.locationsConfiguration.organization.label',
    defaultMessage: 'Organization',
    attributes: {
      async: true,
      showValueTooltip: true,
      openOnClick: false,
      autoload: false,
      cache: false,
      options: [],
      filterOptions: (options) => options,
    },
    getDynamicAttr: ({ debouncedOrganizationsFetch, organizationRequired }) => ({
      loadOptions: debouncedOrganizationsFetch,
      required: organizationRequired,
    }),
  },
  locationGroup: {
    type: SelectField,
    label: 'react.locationsConfiguration.locationGroup.label',
    defaultMessage: 'Location Group',
    attributes: {
      async: true,
      showValueTooltip: true,
      openOnClick: false,
      autoload: false,
      cache: false,
      options: [],
      filterOptions: (options) => options,
    },
    getDynamicAttr: ({ debouncedLocationGroupsFetch }) => ({
      loadOptions: debouncedLocationGroupsFetch,
    }),
  },
  manager: {
    type: SelectField,
    label: 'react.locationsConfiguration.manager.label',
    defaultMessage: 'Manager',
    attributes: {
      async: true,
      showValueTooltip: true,
      openOnClick: false,
      autoload: false,
      cache: false,
      options: [],
      labelKey: 'name',
      filterOptions: (options) => options,
    },
    getDynamicAttr: ({ debouncedPeopleFetch }) => ({
      loadOptions: debouncedPeopleFetch,
    }),
  },
};

const PARENT_FIELDS = {
  parentLocation: {
    type: SelectField,
    label: 'react.location.parentLocation.label',
    defaultMessage: 'Parent Location',
    attributes: {
      async: true,
      showValueTooltip: true,
      openOnClick: false,
      autoload: false,
      cache: false,
      options: [],
      filterOptions: (options) => options,
    },
    getDynamicAttr: ({ debouncedLocationsFetch }) => ({
      loadOptions: debouncedLocationsFetch,
    }),
  },
};

const ZONE_FIELD = {
  zone: {
    type: SelectField,
    label: 'react.location.zoneLocation.label',
    defaultMessage: 'Zone Location',
    attributes: {
      showValueTooltip: true,
      valueKey: 'id',
      labelKey: 'name',
    },
    getDynamicAttr: ({ zoneOptions }) => ({
      options: zoneOptions,
    }),
  },
};

const STYLE_FIELDS = {
  bgColor: {
    type: ColorPickerField,
    label: 'react.locationsConfiguration.backgroundColor.label',
    defaultMessage: 'Background color',
  },
  fgColor: {
    type: ColorPickerField,
    label: 'react.locationsConfiguration.foregroundColor.label',
    defaultMessage: 'Foreground color',
  },
};

const ADDRESS_FIELDS = {
  'address.address': {
    type: TextField,
    label: 'react.location.address.address.label',
    defaultMessage: 'Street address',
  },
  'address.address2': {
    type: TextField,
    label: 'react.location.address.address2.label',
    defaultMessage: 'Street address 2',
  },
  'address.city': {
    type: TextField,
    label: 'react.location.address.city.label',
    defaultMessage: 'City',
  },
  'address.stateOrProvince': {
    type: TextField,
    label: 'react.location.address.stateOrProvince.label',
    defaultMessage: 'State/Province',
  },
  'address.postalCode': {
    type: TextField,
    label: 'react.location.address.postalCode.label',
    defaultMessage: 'Postal code',
  },
  'address.country': {
    type: TextField,
    label: 'react.location.address.country.label',
    defaultMessage: 'Country',
  },
};

const LocationEdit = () => {
  useTranslation('location', 'locationsConfiguration');

  const { locationId } = useParams();
  const history = useHistory();
  const dispatch = useDispatch();

  const [initialValues, setInitialValues] = useState({ active: true });
  const [details, setDetails] = useState(null);
  const [locationTypes, setLocationTypes] = useState([]);
  const [supportedActivityOptions, setSupportedActivityOptions] = useState([]);
  const [useDefaultActivities, setUseDefaultActivities] = useState(true);
  const [zoneOptions, setZoneOptions] = useState([]);

  const {
    debounceTime,
    minSearchLength,
    locale,
    translate,
  } = useSelector((state) => ({
    debounceTime: state.session.searchConfig.debounceTime,
    minSearchLength: state.session.searchConfig.minSearchLength,
    locale: state.session.activeLanguage,
    translate: translateWithDefaultMessage(getTranslate(state.localize)),
  }));

  const debouncedPeopleFetch = useCallback(
    debouncePeopleFetch(debounceTime, minSearchLength),
    [debounceTime, minSearchLength],
  );
  const debouncedLocationGroupsFetch = useCallback(
    debounceLocationGroupsFetch(debounceTime, minSearchLength),
    [debounceTime, minSearchLength],
  );
  const debouncedOrganizationsFetch = useCallback(
    debounceOrganizationsFetch(debounceTime, minSearchLength, [], true),
    [debounceTime, minSearchLength],
  );
  const debouncedLocationsFetch = useCallback(
    debounceLocationsFetch(debounceTime, minSearchLength, [], true),
    [debounceTime, minSearchLength],
  );

  const activityOption = (value) => ({
    value,
    label: translate(`react.locationsConfiguration.ActivityCode.${value}`, value),
  });

  const getDefaultActivities = (locationType) =>
    _.map(locationType?.supportedActivities ?? [], activityOption);

  const fetchLocationTypes = () => {
    locationApi.getLocationTypes().then((response) => {
      const types = _.map(response.data.data, (locationType) => ({
        ...locationType,
        label: splitTranslation(locationType.name, locale),
      }));
      setLocationTypes(types);
    });
  };

  const fetchSupportedActivities = () => {
    locationApi.getSupportedActivities().then((response) => {
      setSupportedActivityOptions(_.map(response.data.data, activityOption));
    });
  };

  const fetchDetails = () => {
    locationApi.getLocationDetails(locationId).then((response) => {
      const location = response.data.data;
      if (!location) {
        history.push(LOCATION_URL.list());
        return;
      }
      setDetails(location);
      setUseDefaultActivities(location.useDefaultActivities);
      if (location.isInternalLocation && location.parentLocation?.id) {
        locationApi.getZoneLocations(location.parentLocation.id)
          .then((res) => setZoneOptions(res.data.data ?? []));
      }
      setInitialValues({
        ...location,
        organization: location.organization
          ? {
            ...location.organization,
            value: location.organization.id,
            label: `${location.organization.code ?? ''} ${location.organization.name}`.trim(),
          }
          : '',
        locationGroup: location.locationGroup
          ? {
            ...location.locationGroup,
            value: location.locationGroup.id,
            label: location.locationGroup.name,
          }
          : '',
        manager: location.manager
          ? {
            ...location.manager,
            value: location.manager.id,
            label: location.manager.name,
          }
          : '',
        parentLocation: location.parentLocation
          ? {
            ...location.parentLocation,
            value: location.parentLocation.id,
            label: location.parentLocation.name,
          }
          : '',
        zone: location.zone ? location.zone : '',
        locationType: location.locationType
          ? {
            ...location.locationType,
            value: location.locationType.id,
            label: splitTranslation(location.locationType.name, locale),
          }
          : '',
        supportedActivities: _.map(location.supportedActivities, activityOption),
      });
    });
  };

  useEffect(() => {
    fetchLocationTypes();
    fetchSupportedActivities();
    if (locationId) {
      fetchDetails();
    }
  }, [locationId]);

  const isInternalLocation = details?.isInternalLocation;
  const isZoneLocation = details?.isZoneLocation;
  const showAddress = !isInternalLocation && !isZoneLocation;

  const onSubmit = (values) => {
    dispatch(showSpinner());
    const payload = {
      name: values.name,
      locationNumber: values.locationNumber,
      active: values.active,
      bgColor: values.bgColor,
      fgColor: values.fgColor,
      organization: values.organization ? { id: values.organization.id } : null,
      locationGroup: values.locationGroup ? { id: values.locationGroup.id } : null,
      manager: values.manager ? { id: values.manager.id } : null,
      locationType: values.locationType ? { id: values.locationType.id } : null,
      supportedActivities: _.map(values.supportedActivities, (activity) => activity.value),
      address: values.address,
    };
    if (isInternalLocation || isZoneLocation) {
      payload.parentLocation = values.parentLocation ? { id: values.parentLocation.id } : null;
    }
    if (isInternalLocation) {
      payload.zone = values.zone ? { id: values.zone.id } : null;
    }

    const request = locationId
      ? locationApi.updateLocation(locationId, payload, { useDefaultActivities })
      : locationApi.createLocation(payload, { useDefaultActivities });

    request
      .then((response) => {
        dispatch(hideSpinner());
        Alert.success(translate('react.locationsConfiguration.alert.locationSaveCompleted.label', 'Location was successfully saved!'), { timeout: 3000 });
        const saved = response.data.data;
        if (!locationId && saved?.id) {
          history.push(LOCATION_URL.edit(saved.id));
        } else {
          fetchDetails();
        }
      })
      .catch(() => {
        dispatch(hideSpinner());
        return Promise.reject(new Error(translate('react.location.error.saveLocation.label', 'Could not save location')));
      });
  };

  return (
    <PageWrapper>
      <div className="d-flex flex-column">
        <div className="submit-buttons d-flex align-items-center justify-content-between p-2">
          <span className="font-weight-bold">
            {locationId
              ? (
                <>
                  <Translate id="react.location.editLocation.label" defaultMessage="Edit Location" />
                  {details?.name ? `: ${details.name}` : ''}
                </>
              )
              : <Translate id="react.location.createLocation.label" defaultMessage="Create Location" />}
          </span>
          {locationId && (
            <div className="btn-group">
              {!isInternalLocation && (
                <a className="btn btn-outline-primary btn-xs" href={LOCATION_URL.showZoneLocations(locationId)}>
                  <Translate id="react.location.zoneLocations.label" defaultMessage="Zone Locations" />
                </a>
              )}
              {!isInternalLocation && (
                <a className="btn btn-outline-primary btn-xs" href={LOCATION_URL.showBinLocations(locationId)}>
                  <Translate id="react.location.binLocations.label" defaultMessage="Bin Locations" />
                </a>
              )}
              {isInternalLocation && (
                <a className="btn btn-outline-primary btn-xs" href={LOCATION_URL.showContents(locationId)}>
                  <Translate id="react.location.contents.label" defaultMessage="Contents" />
                </a>
              )}
              <a className="btn btn-outline-primary btn-xs" href={LOCATION_URL.uploadLogo(locationId)}>
                <Translate id="react.location.uploadLogo.label" defaultMessage="Upload Logo" />
              </a>
            </div>
          )}
        </div>
        <Form
          onSubmit={onSubmit}
          validate={validate}
          initialValues={initialValues}
          mutators={{
            resetSupportedActivities: ([locationType], state, utils) => {
              utils.changeValue(state, 'supportedActivities', () => getDefaultActivities(locationType));
            },
          }}
          render={({
            form: { mutators: { resetSupportedActivities } },
            handleSubmit,
            values,
          }) => (
            <form onSubmit={handleSubmit} className="w-100">
              <div className="classic-form with-description">
                <div className="form-title">
                  <Translate id="react.locationsConfiguration.details.label" defaultMessage="Details" />
                </div>
                {_.map(
                  DETAILS_FIELDS,
                  (fieldConfig, fieldName) => renderFormField(fieldConfig, fieldName, {
                    debouncedLocationGroupsFetch,
                    debouncedOrganizationsFetch,
                    debouncedPeopleFetch,
                    organizationRequired: ['DEPOT', 'SUPPLIER']
                      .includes(values.locationType?.locationTypeCode),
                  }),
                )}
                {(isInternalLocation || isZoneLocation) && _.map(
                  PARENT_FIELDS,
                  (fieldConfig, fieldName) => renderFormField(fieldConfig, fieldName, {
                    debouncedLocationsFetch,
                  }),
                )}
                {isInternalLocation && _.map(
                  ZONE_FIELD,
                  (fieldConfig, fieldName) => renderFormField(fieldConfig, fieldName, {
                    zoneOptions,
                  }),
                )}

                <div className="form-title">
                  <Translate id="react.locationsConfiguration.typeAndActivities.label" defaultMessage="Location Type and Supported Activities" />
                </div>
                <SelectField
                  fieldName="locationType"
                  fieldConfig={{
                    label: 'react.locationsConfiguration.locationType.label',
                    defaultMessage: 'Location Type',
                    attributes: {
                      className: 'multi-select',
                      required: true,
                      valueKey: 'id',
                    },
                    getDynamicAttr: ({ locationTypeOptions }) => ({
                      options: locationTypeOptions,
                      onChange: (val) => { resetSupportedActivities(val); },
                    }),
                  }}
                  locationTypeOptions={locationTypes}
                />
                <div className="d-flex w-100 ml-1 pt-2 justify-content-between align-items-center">
                  <Checkbox
                    id="useDefaultActivities"
                    value={useDefaultActivities}
                    onChange={(val) => setUseDefaultActivities(val)}
                    withLabel
                    label={translate('react.locationsConfiguration.useDefaultActivities.label', 'Use default settings for Supported Activities')}
                  />
                  <button
                    type="button"
                    className="btn btn-primary btn-xs"
                    onClick={() => {
                      setUseDefaultActivities(true);
                      resetSupportedActivities(values.locationType);
                    }}
                  >
                    <span>
                      <i className="fa fa-refresh pr-2" />
                      <Translate id="react.locationsConfiguration.resetToDefault.label" defaultMessage="Reset to default settings" />
                    </span>
                  </button>
                </div>
                <div className="location-supported-activities">
                  <SelectField
                    fieldName="supportedActivities"
                    fieldConfig={{
                      attributes: {
                        multi: true,
                      },
                      getDynamicAttr: ({ activityOptions, useDefault }) => ({
                        disabled: useDefault,
                        options: activityOptions,
                      }),
                    }}
                    activityOptions={supportedActivityOptions}
                    useDefault={useDefaultActivities}
                  />
                </div>

                <div className="form-title">
                  <Translate id="react.locationsConfiguration.style.label" defaultMessage="Style" />
                </div>
                {_.map(
                  STYLE_FIELDS,
                  (fieldConfig, fieldName) => renderFormField(fieldConfig, fieldName, {}),
                )}

                {showAddress && (
                  <>
                    <div className="form-title">
                      <Translate id="react.location.address.label" defaultMessage="Address" />
                    </div>
                    {_.map(
                      ADDRESS_FIELDS,
                      (fieldConfig, fieldName) => renderFormField(fieldConfig, fieldName, {}),
                    )}
                  </>
                )}

                <div className="submit-buttons d-flex justify-content-between pt-3">
                  <button
                    type="button"
                    className="btn btn-outline-primary btn-xs"
                    onClick={() => history.push(LOCATION_URL.list())}
                  >
                    <Translate id="react.default.button.cancel.label" defaultMessage="Cancel" />
                  </button>
                  <button type="submit" className="btn btn-primary btn-xs">
                    <Translate id="react.default.button.save.label" defaultMessage="Save" />
                  </button>
                </div>
              </div>
            </form>
          )}
        />
      </div>
    </PageWrapper>
  );
};

export default LocationEdit;
