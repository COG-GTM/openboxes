import React, { useEffect, useState } from 'react';

import { confirmAlert } from 'react-confirm-alert';
import { Controller, useForm } from 'react-hook-form';
import { useDispatch } from 'react-redux';
import { useHistory, useParams } from 'react-router-dom';

import { hideSpinner, showSpinner } from 'actions';
import personApi from 'api/services/PersonApi';
import Button from 'components/form-elements/Button';
import Checkbox from 'components/form-elements/v2/Checkbox';
import TextInput from 'components/form-elements/v2/TextInput';
import notification from 'components/Layout/notifications/notification';
import Section from 'components/Layout/v2/Section';
import { PERSON_URL } from 'consts/applicationUrls';
import NotificationType from 'consts/notificationTypes';
import useTranslate from 'hooks/useTranslate';
import useTranslation from 'hooks/useTranslation';
import Translate from 'utils/Translate';
import HeaderWrapper from 'wrappers/HeaderWrapper';
import PageWrapper from 'wrappers/PageWrapper';

const PersonForm = () => {
  useTranslation('person', 'default');

  const { personId } = useParams();
  const history = useHistory();
  const dispatch = useDispatch();
  const translate = useTranslate();

  const [details, setDetails] = useState(null);

  const emptyValues = {
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: '',
    active: true,
  };

  const getPerson = async () => {
    const response = await personApi.getPersonDetails(personId);
    const person = response?.data?.data;
    setDetails(person);
    return {
      firstName: person?.firstName ?? '',
      lastName: person?.lastName ?? '',
      email: person?.email ?? '',
      phoneNumber: person?.phoneNumber ?? '',
      active: Boolean(person?.active),
    };
  };

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    mode: 'onBlur',
    defaultValues: emptyValues,
  });

  // Fetch and reset on every personId change so the form is correctly
  // populated even when routed between create/edit without a remount.
  useEffect(() => {
    if (personId) {
      getPerson().then((values) => reset(values));
      return;
    }
    setDetails(null);
    reset(emptyValues);
  }, [personId]);

  const onSubmit = async (values) => {
    const payload = {
      firstName: values.firstName,
      lastName: values.lastName,
      email: values.email,
      phoneNumber: values.phoneNumber,
      active: values.active,
    };
    if (personId) {
      try {
        await personApi.updatePerson(personId, {
          ...payload,
          ...(details?.version != null ? { version: details.version } : {}),
        });
      } catch (error) {
        // apiClient's response interceptor already notifies the user
        return;
      }
      notification(NotificationType.SUCCESS)({
        message: translate('react.person.update.success.label', 'Person has been updated successfully'),
      });
      history.push(PERSON_URL.list());
      return;
    }
    try {
      await personApi.createPerson(payload);
    } catch (error) {
      // apiClient's response interceptor already notifies the user
      return;
    }
    notification(NotificationType.SUCCESS)({
      message: translate('react.person.create.success.label', 'Person has been created successfully'),
    });
    history.push(PERSON_URL.list());
  };

  const deletePerson = async () => {
    dispatch(showSpinner());
    try {
      const { status } = await personApi.deletePerson(personId);
      if (status === 204) {
        notification(NotificationType.SUCCESS)({
          message: translate('react.person.delete.success.label', 'Person has been deleted successfully'),
        });
        history.push(PERSON_URL.list());
      }
    } finally {
      dispatch(hideSpinner());
    }
  };

  const onDelete = () => {
    confirmAlert({
      title: translate('react.default.areYouSure.label', 'Are you sure?'),
      message: translate(
        'react.person.delete.confirm.label',
        'Are you sure you want to delete this person?',
      ),
      buttons: [
        {
          label: translate('react.default.yes.label', 'Yes'),
          onClick: deletePerson,
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
          {personId
            ? <Translate id="react.person.edit.label" defaultMessage="Edit Person" />
            : <Translate id="react.person.create.label" defaultMessage="Add Person" />}
        </span>
      </HeaderWrapper>
      <form onSubmit={handleSubmit(onSubmit)} className="p-3">
        <Section
          title={{ label: 'react.person.detailsSection.label', defaultMessage: 'Person Details' }}
        >
          <div className="row">
            <div className="col-lg-4 col-md-6 px-2 pt-2">
              <Controller
                name="firstName"
                control={control}
                rules={{ required: translate('react.default.error.requiredField.label', 'This field is required') }}
                render={({ field }) => (
                  <TextInput
                    title={{ id: 'react.person.firstName.label', defaultMessage: 'First Name' }}
                    hasErrors={Boolean(errors.firstName?.message)}
                    errorMessage={errors.firstName?.message}
                    required
                    {...field}
                  />
                )}
              />
            </div>
            <div className="col-lg-4 col-md-6 px-2 pt-2">
              <Controller
                name="lastName"
                control={control}
                rules={{ required: translate('react.default.error.requiredField.label', 'This field is required') }}
                render={({ field }) => (
                  <TextInput
                    title={{ id: 'react.person.lastName.label', defaultMessage: 'Last Name' }}
                    hasErrors={Boolean(errors.lastName?.message)}
                    errorMessage={errors.lastName?.message}
                    required
                    {...field}
                  />
                )}
              />
            </div>
          </div>
          <div className="row">
            <div className="col-lg-4 col-md-6 px-2 pt-2">
              <Controller
                name="email"
                control={control}
                render={({ field }) => (
                  <TextInput
                    title={{ id: 'react.person.email.label', defaultMessage: 'Email' }}
                    type="email"
                    hasErrors={Boolean(errors.email?.message)}
                    errorMessage={errors.email?.message}
                    {...field}
                  />
                )}
              />
            </div>
            <div className="col-lg-4 col-md-6 px-2 pt-2">
              <Controller
                name="phoneNumber"
                control={control}
                render={({ field }) => (
                  <TextInput
                    title={{ id: 'react.person.phoneNumber.label', defaultMessage: 'Phone Number' }}
                    hasErrors={Boolean(errors.phoneNumber?.message)}
                    errorMessage={errors.phoneNumber?.message}
                    {...field}
                  />
                )}
              />
            </div>
          </div>
          <div className="row">
            <div className="col-lg-4 col-md-6 px-2 pt-2">
              <Controller
                name="active"
                control={control}
                render={({ field }) => (
                  <Checkbox
                    title={{ id: 'react.person.active.label', defaultMessage: 'Active' }}
                    {...field}
                  />
                )}
              />
            </div>
          </div>
          {personId && details?.type && (
            <div className="px-2 pt-3" data-testid="person-type">
              <span className="font-weight-bold">
                <Translate id="react.person.type.label" defaultMessage="Type" />
                {': '}
              </span>
              {details.type}
              {' '}
              {details.type === 'Person' && (
                <a href={PERSON_URL.convertPersonToUser(personId)}>
                  <Translate id="react.person.convertPersonToUser.label" defaultMessage="Convert Person to User" />
                </a>
              )}
              {details.type === 'User' && (
                <a href={PERSON_URL.convertUserToPerson(personId)}>
                  <Translate id="react.person.convertUserToPerson.label" defaultMessage="Convert User to Person" />
                </a>
              )}
            </div>
          )}
          <div className="d-flex gap-8 pt-3">
            <Button
              type="submit"
              disabled={isSubmitting}
              defaultLabel={personId ? 'Update' : 'Create'}
              label={personId ? 'react.default.button.update.label' : 'react.default.button.create.label'}
              variant="primary"
            />
            {personId && (
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
              onClick={() => history.push(PERSON_URL.list())}
            />
          </div>
        </Section>
      </form>
    </PageWrapper>
  );
};

export default PersonForm;
