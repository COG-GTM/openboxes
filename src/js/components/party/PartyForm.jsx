import React, { useEffect, useState } from 'react';

import { confirmAlert } from 'react-confirm-alert';
import { Controller, useForm } from 'react-hook-form';
import { useDispatch } from 'react-redux';
import { useHistory, useParams } from 'react-router-dom';

import { hideSpinner, showSpinner } from 'actions';
import partyApi from 'api/services/PartyApi';
import Button from 'components/form-elements/Button';
import SelectField from 'components/form-elements/v2/SelectField';
import notification from 'components/Layout/notifications/notification';
import Section from 'components/Layout/v2/Section';
import { PARTY_ROLE_URL, PARTY_URL } from 'consts/applicationUrls';
import NotificationType from 'consts/notificationTypes';
import useTranslate from 'hooks/useTranslate';
import useTranslation from 'hooks/useTranslation';
import Translate from 'utils/Translate';
import HeaderWrapper from 'wrappers/HeaderWrapper';
import PageWrapper from 'wrappers/PageWrapper';

const PartyForm = () => {
  useTranslation('party', 'default');

  const { partyId } = useParams();
  const history = useHistory();
  const dispatch = useDispatch();
  const translate = useTranslate();

  const [partyTypeOptions, setPartyTypeOptions] = useState([]);
  const [details, setDetails] = useState(null);

  useEffect(() => {
    partyApi.getPartyTypeOptions()
      .then((response) => {
        setPartyTypeOptions(response?.data?.data?.map((option) => ({
          id: option.id,
          value: option.id,
          label: option.label,
        })) ?? []);
      });
  }, []);

  const getParty = async () => {
    const response = await partyApi.getPartyDetails(partyId);
    const party = response?.data?.data;
    setDetails(party);
    return {
      partyType: party?.partyType
        ? {
          id: party.partyType.id,
          value: party.partyType.id,
          label: party.partyType.name,
        }
        : null,
    };
  };

  const emptyValues = { partyType: null };

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    mode: 'onBlur',
    defaultValues: emptyValues,
  });

  // Fetch and reset on every partyId change so the form is correctly
  // populated even when routed between create/edit without a remount.
  useEffect(() => {
    if (partyId) {
      getParty().then((values) => reset(values));
      return;
    }
    setDetails(null);
    reset(emptyValues);
  }, [partyId]);

  const onSubmit = async (values) => {
    const payload = { partyType: values.partyType?.id ?? null };
    if (partyId) {
      try {
        await partyApi.updateParty(partyId, payload);
      } catch (error) {
        // apiClient's response interceptor already notifies the user
        return;
      }
      notification(NotificationType.SUCCESS)({
        message: translate('react.party.update.success.label', 'Party has been updated successfully'),
      });
      history.push(PARTY_URL.list());
      return;
    }
    try {
      await partyApi.createParty(payload);
    } catch (error) {
      // apiClient's response interceptor already notifies the user
      return;
    }
    notification(NotificationType.SUCCESS)({
      message: translate('react.party.create.success.label', 'Party has been created successfully'),
    });
    history.push(PARTY_URL.list());
  };

  const deleteParty = async () => {
    dispatch(showSpinner());
    try {
      const { status } = await partyApi.deleteParty(partyId);
      if (status === 204) {
        notification(NotificationType.SUCCESS)({
          message: translate('react.party.delete.success.label', 'Party has been deleted successfully'),
        });
        history.push(PARTY_URL.list());
      }
    } finally {
      dispatch(hideSpinner());
    }
  };

  const onDelete = () => {
    confirmAlert({
      title: translate('react.default.areYouSure.label', 'Are you sure?'),
      message: translate(
        'react.party.delete.confirm.label',
        'Are you sure you want to delete this party?',
      ),
      buttons: [
        {
          label: translate('react.default.yes.label', 'Yes'),
          onClick: deleteParty,
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
          {partyId
            ? <Translate id="react.party.edit.label" defaultMessage="Edit Party" />
            : <Translate id="react.party.create.label" defaultMessage="Create Party" />}
        </span>
      </HeaderWrapper>
      <form onSubmit={handleSubmit(onSubmit)} className="p-3">
        <Section
          title={{ label: 'react.party.detailsSection.label', defaultMessage: 'Party Details' }}
        >
          <div className="row">
            <div className="col-lg-4 col-md-6 px-2 pt-2">
              <Controller
                name="partyType"
                control={control}
                render={({ field }) => (
                  <SelectField
                    title={{ id: 'react.party.partyType.label', defaultMessage: 'Party Type' }}
                    placeholder={translate('react.default.selectField.placeholder.label', 'Select')}
                    options={partyTypeOptions}
                    hasErrors={Boolean(errors.partyType?.message)}
                    errorMessage={errors.partyType?.message}
                    required
                    {...field}
                  />
                )}
              />
            </div>
          </div>
          {partyId && (
            <div className="px-2 pt-3" data-testid="party-roles">
              <span className="font-weight-bold">
                <Translate id="react.party.roles.label" defaultMessage="Roles" />
              </span>
              <ul className="list-unstyled mb-0">
                {(details?.roles ?? []).map((role) => (
                  <li key={role.id}>
                    <a href={PARTY_ROLE_URL.show(role.id)}>{role.name}</a>
                  </li>
                ))}
              </ul>
              <a href={PARTY_ROLE_URL.create(partyId)}>
                <Translate id="react.party.addPartyRole.label" defaultMessage="Add Party Role" />
              </a>
            </div>
          )}
          <div className="d-flex gap-8 pt-3">
            <Button
              type="submit"
              disabled={isSubmitting}
              defaultLabel={partyId ? 'Update' : 'Create'}
              label={partyId ? 'react.default.button.update.label' : 'react.default.button.create.label'}
              variant="primary"
            />
            {partyId && (
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
              onClick={() => history.push(PARTY_URL.list())}
            />
          </div>
        </Section>
      </form>
    </PageWrapper>
  );
};

export default PartyForm;
