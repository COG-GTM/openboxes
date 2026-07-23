import React, { useEffect, useState } from 'react';

import { Controller, useForm } from 'react-hook-form';

import localizationOverrideApi from 'api/services/LocalizationOverrideApi';
import userApi from 'api/services/UserApi';
import Button from 'components/form-elements/Button';
import SelectField from 'components/form-elements/v2/SelectField';
import TextInput from 'components/form-elements/v2/TextInput';
import notification from 'components/Layout/notifications/notification';
import Section from 'components/Layout/v2/Section';
import { USER_URL } from 'consts/applicationUrls';
import NotificationType from 'consts/notificationTypes';
import useTranslate from 'hooks/useTranslate';
import useTranslation from 'hooks/useTranslation';
import Translate from 'utils/Translate';
import HeaderWrapper from 'wrappers/HeaderWrapper';
import PageWrapper from 'wrappers/PageWrapper';

const toOption = (option) => ({ id: option.id, value: option.id, label: option.label });

const UserCreate = () => {
  useTranslation('user', 'default');

  const translate = useTranslate();

  const [localeOptions, setLocaleOptions] = useState([]);

  useEffect(() => {
    localizationOverrideApi.getLocaleOptions()
      .then((response) => setLocaleOptions(response?.data?.data?.map(toOption) ?? []));
  }, []);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    mode: 'onBlur',
    defaultValues: {
      username: '',
      firstName: '',
      lastName: '',
      password: '',
      email: '',
      locale: null,
    },
  });

  const onSubmit = async (values) => {
    const response = await userApi.createUser({
      username: values.username,
      firstName: values.firstName,
      lastName: values.lastName,
      password: values.password,
      email: values.email,
      locale: values.locale?.id ?? null,
    });
    notification(NotificationType.SUCCESS)({
      message: translate('react.user.create.success.label', 'User has been created successfully'),
    });
    const userId = response?.data?.data?.id;
    window.location.assign(userId ? USER_URL.edit(userId) : USER_URL.list());
  };

  const fields = [
    {
      name: 'username', label: 'react.user.username.label', defaultMessage: 'Username', required: true,
    },
    {
      name: 'firstName', label: 'react.user.firstName.label', defaultMessage: 'First Name', required: true,
    },
    {
      name: 'lastName', label: 'react.user.lastName.label', defaultMessage: 'Last Name', required: true,
    },
    {
      name: 'password', label: 'react.user.password.label', defaultMessage: 'Password', required: true, type: 'password',
    },
    {
      name: 'email', label: 'react.user.email.label', defaultMessage: 'Email', required: false,
    },
  ];

  return (
    <PageWrapper>
      <HeaderWrapper className="align-items-center h-auto py-3">
        <span className="title">
          <Translate id="react.user.create.label" defaultMessage="Create User" />
        </span>
      </HeaderWrapper>
      <form onSubmit={handleSubmit(onSubmit)} className="p-3">
        <Section
          title={{ label: 'react.user.detailsSection.label', defaultMessage: 'User Details' }}
        >
          <div className="row">
            {fields.map((fieldConfig) => (
              <div key={fieldConfig.name} className="col-lg-4 col-md-6 px-2 pt-2">
                <Controller
                  name={fieldConfig.name}
                  control={control}
                  rules={fieldConfig.required ? {
                    required: translate('react.default.error.requiredField.label', 'This field is required'),
                  } : {}}
                  render={({ field }) => (
                    <TextInput
                      title={{ id: fieldConfig.label, defaultMessage: fieldConfig.defaultMessage }}
                      required={fieldConfig.required}
                      type={fieldConfig.type ?? 'text'}
                      errorMessage={errors[fieldConfig.name]?.message}
                      {...field}
                    />
                  )}
                />
              </div>
            ))}
            <div className="col-lg-4 col-md-6 px-2 pt-2">
              <Controller
                name="locale"
                control={control}
                render={({ field }) => (
                  <SelectField
                    title={{ id: 'react.user.locale.label', defaultMessage: 'Locale' }}
                    options={localeOptions}
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
            <a href={USER_URL.list()}>
              <Button
                defaultLabel="Cancel"
                label="react.default.button.cancel.label"
                variant="primary-outline"
              />
            </a>
          </div>
        </Section>
      </form>
    </PageWrapper>
  );
};

export default UserCreate;
