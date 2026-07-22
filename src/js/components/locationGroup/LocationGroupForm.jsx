import React from 'react';

import { confirmAlert } from 'react-confirm-alert';
import { Controller, useForm } from 'react-hook-form';
import { useDispatch } from 'react-redux';
import { useHistory, useParams } from 'react-router-dom';

import { hideSpinner, showSpinner } from 'actions';
import locationGroupApi from 'api/services/LocationGroupApi';
import Button from 'components/form-elements/Button';
import TextInput from 'components/form-elements/v2/TextInput';
import notification from 'components/Layout/notifications/notification';
import Section from 'components/Layout/v2/Section';
import { LOCATION_GROUP_URL } from 'consts/applicationUrls';
import NotificationType from 'consts/notificationTypes';
import useTranslate from 'hooks/useTranslate';
import useTranslation from 'hooks/useTranslation';
import Translate from 'utils/Translate';
import HeaderWrapper from 'wrappers/HeaderWrapper';
import PageWrapper from 'wrappers/PageWrapper';

const LocationGroupForm = () => {
  useTranslation('locationGroup', 'default');

  const { locationGroupId } = useParams();
  const history = useHistory();
  const dispatch = useDispatch();
  const translate = useTranslate();

  const getLocationGroup = async () => {
    const response = await locationGroupApi.getLocationGroupDetails(locationGroupId);
    const locationGroup = response?.data?.data;
    return {
      name: locationGroup?.name ?? '',
      version: locationGroup?.version,
      addressId: locationGroup?.address?.id ?? null,
      address: locationGroup?.address?.address ?? '',
      address2: locationGroup?.address?.address2 ?? '',
      city: locationGroup?.address?.city ?? '',
      stateOrProvince: locationGroup?.address?.stateOrProvince ?? '',
      postalCode: locationGroup?.address?.postalCode ?? '',
      country: locationGroup?.address?.country ?? '',
      description: locationGroup?.address?.description ?? '',
    };
  };

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    mode: 'onBlur',
    defaultValues: locationGroupId
      ? getLocationGroup
      : { name: '' },
  });

  const onSubmit = async (values) => {
    if (locationGroupId) {
      const payload = {
        name: values.name,
        version: values.version,
        address: {
          ...(values.addressId ? { id: values.addressId } : {}),
          address: values.address,
          address2: values.address2,
          city: values.city,
          stateOrProvince: values.stateOrProvince,
          postalCode: values.postalCode,
          country: values.country,
          description: values.description,
        },
      };
      await locationGroupApi.updateLocationGroup(locationGroupId, payload);
      notification(NotificationType.SUCCESS)({
        message: translate('react.locationGroup.update.success.label', 'Location group has been updated successfully'),
      });
      history.push(LOCATION_GROUP_URL.list());
      return;
    }
    await locationGroupApi.createLocationGroup({ name: values.name });
    notification(NotificationType.SUCCESS)({
      message: translate('react.locationGroup.create.success.label', 'Location group has been created successfully'),
    });
    history.push(LOCATION_GROUP_URL.list());
  };

  const deleteLocationGroup = async () => {
    dispatch(showSpinner());
    try {
      const { status } = await locationGroupApi.deleteLocationGroup(locationGroupId);
      if (status === 204) {
        notification(NotificationType.SUCCESS)({
          message: translate('react.locationGroup.delete.success.label', 'Location group has been deleted successfully'),
        });
        history.push(LOCATION_GROUP_URL.list());
      }
    } finally {
      dispatch(hideSpinner());
    }
  };

  const onDelete = () => {
    confirmAlert({
      title: translate('react.default.areYouSure.label', 'Are you sure?'),
      message: translate(
        'react.locationGroup.delete.confirm.label',
        'Are you sure you want to delete this location group?',
      ),
      buttons: [
        {
          label: translate('react.default.yes.label', 'Yes'),
          onClick: deleteLocationGroup,
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
          {locationGroupId
            ? <Translate id="react.locationGroup.edit.label" defaultMessage="Edit Location Group" />
            : <Translate id="react.locationGroup.create.label" defaultMessage="Create Location Group" />}
        </span>
      </HeaderWrapper>
      <form onSubmit={handleSubmit(onSubmit)} className="p-3">
        <Section
          title={{ label: 'react.locationGroup.detailsSection.label', defaultMessage: 'Location Group Details' }}
        >
          <div className="row">
            <div className="col-lg-4 col-md-6 px-2 pt-2">
              <Controller
                name="name"
                control={control}
                rules={{
                  required: translate('react.default.error.requiredField.label', 'This field is required'),
                }}
                render={({ field }) => (
                  <TextInput
                    title={{ id: 'react.locationGroup.name.label', defaultMessage: 'Name' }}
                    required
                    errorMessage={errors.name?.message}
                    {...field}
                  />
                )}
              />
            </div>
          </div>
          {locationGroupId && (
            <div className="row">
              <div className="col-lg-4 col-md-6 px-2 pt-2">
                <Controller
                  name="address"
                  control={control}
                  render={({ field }) => (
                    <TextInput
                      title={{ id: 'react.locationGroup.address.label', defaultMessage: 'Street address' }}
                      {...field}
                    />
                  )}
                />
              </div>
              <div className="col-lg-4 col-md-6 px-2 pt-2">
                <Controller
                  name="address2"
                  control={control}
                  render={({ field }) => (
                    <TextInput
                      title={{ id: 'react.locationGroup.address2.label', defaultMessage: 'Street address 2' }}
                      {...field}
                    />
                  )}
                />
              </div>
              <div className="col-lg-4 col-md-6 px-2 pt-2">
                <Controller
                  name="city"
                  control={control}
                  render={({ field }) => (
                    <TextInput
                      title={{ id: 'react.locationGroup.city.label', defaultMessage: 'City' }}
                      {...field}
                    />
                  )}
                />
              </div>
              <div className="col-lg-4 col-md-6 px-2 pt-2">
                <Controller
                  name="stateOrProvince"
                  control={control}
                  render={({ field }) => (
                    <TextInput
                      title={{ id: 'react.locationGroup.stateOrProvince.label', defaultMessage: 'State/Province' }}
                      {...field}
                    />
                  )}
                />
              </div>
              <div className="col-lg-4 col-md-6 px-2 pt-2">
                <Controller
                  name="postalCode"
                  control={control}
                  render={({ field }) => (
                    <TextInput
                      title={{ id: 'react.locationGroup.postalCode.label', defaultMessage: 'Postal code' }}
                      {...field}
                    />
                  )}
                />
              </div>
              <div className="col-lg-4 col-md-6 px-2 pt-2">
                <Controller
                  name="country"
                  control={control}
                  render={({ field }) => (
                    <TextInput
                      title={{ id: 'react.locationGroup.country.label', defaultMessage: 'Country' }}
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
                      title={{ id: 'react.locationGroup.description.label', defaultMessage: 'Description' }}
                      {...field}
                    />
                  )}
                />
              </div>
            </div>
          )}
          <div className="d-flex gap-8 pt-3">
            <Button
              type="submit"
              defaultLabel={locationGroupId ? 'Update' : 'Create'}
              label={locationGroupId ? 'react.default.button.update.label' : 'react.default.button.create.label'}
              variant="primary"
              disabled={isSubmitting}
            />
            {locationGroupId && (
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
              onClick={() => history.push(LOCATION_GROUP_URL.list())}
            />
          </div>
        </Section>
      </form>
    </PageWrapper>
  );
};

export default LocationGroupForm;
