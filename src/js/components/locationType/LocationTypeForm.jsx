import React, { useEffect, useState } from 'react';

import { confirmAlert } from 'react-confirm-alert';
import { Controller, useForm } from 'react-hook-form';
import { useDispatch } from 'react-redux';
import { useParams } from 'react-router-dom';

import { hideSpinner, showSpinner } from 'actions';
import locationTypeApi from 'api/services/LocationTypeApi';
import Button from 'components/form-elements/Button';
import SelectField from 'components/form-elements/v2/SelectField';
import TextInput from 'components/form-elements/v2/TextInput';
import notification from 'components/Layout/notifications/notification';
import Section from 'components/Layout/v2/Section';
import { LOCATION_TYPE_URL } from 'consts/applicationUrls';
import NotificationType from 'consts/notificationTypes';
import useTranslate from 'hooks/useTranslate';
import useTranslation from 'hooks/useTranslation';
import Translate from 'utils/Translate';
import HeaderWrapper from 'wrappers/HeaderWrapper';
import PageWrapper from 'wrappers/PageWrapper';

const toOption = (value) => ({ id: value, value, label: value });

const LocationTypeForm = () => {
  useTranslation('locationType', 'default');

  const { locationTypeId } = useParams();
  const dispatch = useDispatch();
  const translate = useTranslate();

  const [locationTypeCodeOptions, setLocationTypeCodeOptions] = useState([]);
  const [supportedActivityOptions, setSupportedActivityOptions] = useState([]);

  useEffect(() => {
    locationTypeApi.getLocationTypeCodeOptions()
      .then((response) => {
        setLocationTypeCodeOptions(response?.data?.data?.map((option) => ({
          id: option.id,
          value: option.id,
          label: option.label,
        })) ?? []);
      });
    locationTypeApi.getSupportedActivities()
      .then((response) => {
        setSupportedActivityOptions(response?.data?.data?.map(toOption) ?? []);
      });
  }, []);

  // The legacy list/show screens are still GSP pages, so leave the SPA with a
  // full page load when returning to them.
  const goToList = () => {
    window.location.href = LOCATION_TYPE_URL.list();
  };

  const getLocationType = async () => {
    const response = await locationTypeApi.getLocationType(locationTypeId);
    const locationType = response?.data?.data;
    return {
      name: locationType?.name ?? '',
      description: locationType?.description ?? '',
      sortOrder: locationType?.sortOrder ?? '',
      locationTypeCode: locationType?.locationTypeCode
        ? toOption(locationType.locationTypeCode)
        : null,
      supportedActivities: (locationType?.supportedActivities ?? []).map(toOption),
    };
  };

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    mode: 'onBlur',
    defaultValues: locationTypeId
      ? getLocationType
      : {
        name: '', description: '', sortOrder: '', locationTypeCode: null, supportedActivities: [],
      },
  });

  const onSubmit = async (values) => {
    const payload = {
      name: values.name,
      description: values.description,
      sortOrder: values.sortOrder === '' || values.sortOrder === null
        ? null
        : Number(values.sortOrder),
      locationTypeCode: values.locationTypeCode?.id ?? null,
      supportedActivities: (values.supportedActivities ?? []).map((option) => option.id),
    };
    if (locationTypeId) {
      await locationTypeApi.updateLocationType(locationTypeId, payload);
      notification(NotificationType.SUCCESS)({
        message: translate('react.locationType.update.success.label', 'Location type has been updated successfully'),
      });
    } else {
      await locationTypeApi.createLocationType(payload);
      notification(NotificationType.SUCCESS)({
        message: translate('react.locationType.create.success.label', 'Location type has been created successfully'),
      });
    }
    goToList();
  };

  const deleteLocationType = async () => {
    dispatch(showSpinner());
    try {
      const { status } = await locationTypeApi.deleteLocationType(locationTypeId);
      if (status === 204) {
        notification(NotificationType.SUCCESS)({
          message: translate('react.locationType.delete.success.label', 'Location type has been deleted successfully'),
        });
        goToList();
      }
    } finally {
      dispatch(hideSpinner());
    }
  };

  const onDelete = () => {
    confirmAlert({
      title: translate('react.default.areYouSure.label', 'Are you sure?'),
      message: translate(
        'react.locationType.delete.confirm.label',
        'Are you sure you want to delete this location type?',
      ),
      buttons: [
        {
          label: translate('react.default.yes.label', 'Yes'),
          onClick: deleteLocationType,
        },
        {
          label: translate('react.default.no.label', 'No'),
        },
      ],
    });
  };

  return (
    <PageWrapper>
      <HeaderWrapper className="align-items-center h-auto py-3">
        <span className="title">
          {locationTypeId
            ? <Translate id="react.locationType.edit.label" defaultMessage="Edit Location Type" />
            : <Translate id="react.locationType.create.label" defaultMessage="Create Location Type" />}
        </span>
      </HeaderWrapper>
      <form onSubmit={handleSubmit(onSubmit)} className="p-3">
        <Section
          title={{ label: 'react.locationType.detailsSection.label', defaultMessage: 'Location Type Details' }}
        >
          <div className="row">
            <div className="col-lg-4 col-md-6 px-2 pt-2">
              <Controller
                name="locationTypeCode"
                control={control}
                rules={{
                  required: translate('react.default.error.requiredField.label', 'This field is required'),
                }}
                render={({ field }) => (
                  <SelectField
                    title={{ id: 'react.locationType.locationTypeCode.label', defaultMessage: 'Location Type Code' }}
                    required
                    options={locationTypeCodeOptions}
                    errorMessage={errors.locationTypeCode?.message}
                    {...field}
                  />
                )}
              />
            </div>
            <div className="col-lg-4 col-md-6 px-2 pt-2">
              <Controller
                name="name"
                control={control}
                rules={{
                  required: translate('react.default.error.requiredField.label', 'This field is required'),
                }}
                render={({ field }) => (
                  <TextInput
                    title={{ id: 'react.locationType.name.label', defaultMessage: 'Name' }}
                    required
                    errorMessage={errors.name?.message}
                    {...field}
                  />
                )}
              />
            </div>
            <div className="col-lg-4 col-md-6 px-2 pt-2">
              <Controller
                name="description"
                control={control}
                render={({ field }) => (
                  <TextInput
                    title={{ id: 'react.locationType.description.label', defaultMessage: 'Description' }}
                    {...field}
                  />
                )}
              />
            </div>
            <div className="col-lg-4 col-md-6 px-2 pt-2">
              <Controller
                name="supportedActivities"
                control={control}
                render={({ field }) => (
                  <SelectField
                    title={{ id: 'react.locationType.supportedActivities.label', defaultMessage: 'Supported Activities' }}
                    multiple
                    options={supportedActivityOptions}
                    {...field}
                  />
                )}
              />
            </div>
            <div className="col-lg-4 col-md-6 px-2 pt-2">
              <Controller
                name="sortOrder"
                control={control}
                render={({ field }) => (
                  <TextInput
                    type="number"
                    title={{ id: 'react.locationType.sortOrder.label', defaultMessage: 'Sort Order' }}
                    {...field}
                  />
                )}
              />
            </div>
          </div>
          <div className="d-flex gap-8 pt-3">
            <Button
              type="submit"
              defaultLabel="Save"
              label="react.default.button.save.label"
              variant="primary"
              disabled={isSubmitting}
            />
            {locationTypeId && (
              <Button
                defaultLabel="Delete"
                label="react.default.button.delete.label"
                variant="danger-outline"
                onClick={onDelete}
              />
            )}
            <Button
              defaultLabel="Cancel"
              label="react.default.button.cancel.label"
              variant="primary-outline"
              onClick={goToList}
            />
          </div>
        </Section>
      </form>
    </PageWrapper>
  );
};

export default LocationTypeForm;
