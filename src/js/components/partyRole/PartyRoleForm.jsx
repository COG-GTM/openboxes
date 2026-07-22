import React, { useEffect, useState } from 'react';

import { confirmAlert } from 'react-confirm-alert';
import { Controller, useForm } from 'react-hook-form';
import { useDispatch } from 'react-redux';
import { useHistory, useLocation, useParams } from 'react-router-dom';

import { hideSpinner, showSpinner } from 'actions';
import partyApi from 'api/services/PartyApi';
import Button from 'components/form-elements/Button';
import SelectField from 'components/form-elements/v2/SelectField';
import TextInput from 'components/form-elements/v2/TextInput';
import notification from 'components/Layout/notifications/notification';
import Section from 'components/Layout/v2/Section';
import { PARTY_ROLE_URL, PARTY_URL } from 'consts/applicationUrls';
import NotificationType from 'consts/notificationTypes';
import useTranslate from 'hooks/useTranslate';
import useTranslation from 'hooks/useTranslation';
import Translate from 'utils/Translate';
import HeaderWrapper from 'wrappers/HeaderWrapper';
import PageWrapper from 'wrappers/PageWrapper';

// Instant (ISO-8601, UTC) -> value for <input type="datetime-local"> (local time)
const toDateTimeLocal = (value) => {
  if (!value) {
    return '';
  }
  const date = new Date(value);
  const pad = (num) => `${num}`.padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const toInstant = (value) => (value ? new Date(value).toISOString() : null);

const PartyRoleForm = () => {
  useTranslation('partyRole', 'default');

  const { partyRoleId } = useParams();
  const history = useHistory();
  const location = useLocation();
  const dispatch = useDispatch();
  const translate = useTranslate();

  const [partyOptions, setPartyOptions] = useState([]);
  const [roleTypeOptions, setRoleTypeOptions] = useState([]);

  useEffect(() => {
    partyApi.getPartyOptions()
      .then((response) => {
        setPartyOptions(response?.data?.data?.map((option) => ({
          id: option.id,
          value: option.id,
          label: option.label,
        })) ?? []);
      });
    partyApi.getRoleTypeOptions()
      .then((response) => {
        setRoleTypeOptions(response?.data?.data?.map((option) => ({
          id: option.id,
          value: option.id,
          label: option.label,
        })) ?? []);
      });
  }, []);

  // "party.id" is the query param the legacy GSP screens used to link here.
  const searchParams = new URLSearchParams(location.search);
  const preselectedPartyId = searchParams.get('partyId') ?? searchParams.get('party.id');

  const emptyValues = {
    party: preselectedPartyId
      ? { id: preselectedPartyId, value: preselectedPartyId, label: preselectedPartyId }
      : null,
    roleType: null,
    startDate: '',
    endDate: '',
  };

  const getPartyRole = async () => {
    const response = await partyApi.getPartyRoleDetails(partyRoleId);
    const partyRole = response?.data?.data;
    return {
      party: partyRole?.party
        ? { id: partyRole.party.id, value: partyRole.party.id, label: partyRole.party.id }
        : null,
      roleType: partyRole?.roleType
        ? { id: partyRole.roleType, value: partyRole.roleType, label: partyRole.roleType }
        : null,
      startDate: toDateTimeLocal(partyRole?.startDate),
      endDate: toDateTimeLocal(partyRole?.endDate),
    };
  };

  const {
    control,
    handleSubmit,
    reset,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm({
    mode: 'onBlur',
    defaultValues: emptyValues,
  });

  useEffect(() => {
    if (partyRoleId) {
      getPartyRole().then((values) => reset(values));
      return;
    }
    reset(emptyValues);
  }, [partyRoleId]);

  // Navigate client-side to the owning party's React show screen so the
  // success toast survives; navigating to the legacy partyRole list would
  // require a full page reload that tears down the SPA before it renders.
  const navigateAfterSave = (partyId) => {
    if (partyId) {
      history.push(PARTY_URL.show(partyId));
      return;
    }
    window.location.assign(PARTY_ROLE_URL.list());
  };

  const onSubmit = async (values) => {
    const payload = {
      party: values.party?.id ?? null,
      roleType: values.roleType?.id ?? null,
      startDate: toInstant(values.startDate),
      endDate: toInstant(values.endDate),
    };
    if (partyRoleId) {
      try {
        await partyApi.updatePartyRole(partyRoleId, payload);
      } catch (error) {
        // apiClient's response interceptor already notifies the user
        return;
      }
      notification(NotificationType.SUCCESS)({
        message: translate('react.partyRole.update.success.label', 'Party role has been updated successfully'),
      });
      navigateAfterSave(values.party?.id);
      return;
    }
    try {
      await partyApi.createPartyRole(payload);
    } catch (error) {
      // apiClient's response interceptor already notifies the user
      return;
    }
    notification(NotificationType.SUCCESS)({
      message: translate('react.partyRole.create.success.label', 'Party role has been created successfully'),
    });
    navigateAfterSave(values.party?.id);
  };

  const deletePartyRole = async () => {
    dispatch(showSpinner());
    try {
      const { status } = await partyApi.deletePartyRole(partyRoleId);
      if (status === 204) {
        notification(NotificationType.SUCCESS)({
          message: translate('react.partyRole.delete.success.label', 'Party role has been deleted successfully'),
        });
        navigateAfterSave(getValues('party')?.id);
      }
    } finally {
      dispatch(hideSpinner());
    }
  };

  const onDelete = () => {
    confirmAlert({
      title: translate('react.default.areYouSure.label', 'Are you sure?'),
      message: translate(
        'react.partyRole.delete.confirm.label',
        'Are you sure you want to delete this party role?',
      ),
      buttons: [
        {
          label: translate('react.default.yes.label', 'Yes'),
          onClick: deletePartyRole,
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
          {partyRoleId
            ? <Translate id="react.partyRole.edit.label" defaultMessage="Edit Party Role" />
            : <Translate id="react.partyRole.create.label" defaultMessage="Create Party Role" />}
        </span>
      </HeaderWrapper>
      <form onSubmit={handleSubmit(onSubmit)} className="p-3">
        <Section
          title={{ label: 'react.partyRole.detailsSection.label', defaultMessage: 'Party Role Details' }}
        >
          <div className="row">
            <div className="col-lg-4 col-md-6 px-2 pt-2">
              <Controller
                name="party"
                control={control}
                render={({ field }) => (
                  <SelectField
                    title={{ id: 'react.partyRole.party.label', defaultMessage: 'Party' }}
                    placeholder={translate('react.default.selectField.placeholder.label', 'Select')}
                    options={partyOptions}
                    hasErrors={Boolean(errors.party?.message)}
                    errorMessage={errors.party?.message}
                    required
                    {...field}
                  />
                )}
              />
            </div>
            <div className="col-lg-4 col-md-6 px-2 pt-2">
              <Controller
                name="roleType"
                control={control}
                render={({ field }) => (
                  <SelectField
                    title={{ id: 'react.partyRole.roleType.label', defaultMessage: 'Role Type' }}
                    placeholder={translate('react.default.selectField.placeholder.label', 'Select')}
                    options={roleTypeOptions}
                    hasErrors={Boolean(errors.roleType?.message)}
                    errorMessage={errors.roleType?.message}
                    required
                    {...field}
                  />
                )}
              />
            </div>
          </div>
          {partyRoleId && (
            <div className="row">
              <div className="col-lg-4 col-md-6 px-2 pt-2">
                <Controller
                  name="startDate"
                  control={control}
                  render={({ field }) => (
                    <TextInput
                      type="datetime-local"
                      title={{ id: 'react.partyRole.startDate.label', defaultMessage: 'Start Date' }}
                      {...field}
                    />
                  )}
                />
              </div>
              <div className="col-lg-4 col-md-6 px-2 pt-2">
                <Controller
                  name="endDate"
                  control={control}
                  render={({ field }) => (
                    <TextInput
                      type="datetime-local"
                      title={{ id: 'react.partyRole.endDate.label', defaultMessage: 'End Date' }}
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
              disabled={isSubmitting}
              defaultLabel={partyRoleId ? 'Update' : 'Create'}
              label={partyRoleId ? 'react.default.button.update.label' : 'react.default.button.create.label'}
              variant="primary"
            />
            {partyRoleId && (
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
              onClick={() => window.location.assign(PARTY_ROLE_URL.list())}
            />
          </div>
        </Section>
      </form>
    </PageWrapper>
  );
};

export default PartyRoleForm;
