import React, { useEffect, useState } from 'react';

import { Controller, useForm } from 'react-hook-form';
import { useHistory, useParams } from 'react-router-dom';
import Alert from 'react-s-alert';

import preferenceTypeApi from 'api/services/PreferenceTypeApi';
import Button from 'components/form-elements/Button';
import SelectField from 'components/form-elements/v2/SelectField';
import TextInput from 'components/form-elements/v2/TextInput';
import notification from 'components/Layout/notifications/notification';
import Section from 'components/Layout/v2/Section';
import { PREFERENCE_TYPE_URL } from 'consts/applicationUrls';
import NotificationType from 'consts/notificationTypes';
import useTranslate from 'hooks/useTranslate';
import useTranslation from 'hooks/useTranslation';
import Translate from 'utils/Translate';
import HeaderWrapper from 'wrappers/HeaderWrapper';
import PageWrapper from 'wrappers/PageWrapper';

const PreferenceTypeForm = () => {
  useTranslation('preferenceType', 'default');

  const { preferenceTypeId } = useParams();
  const history = useHistory();
  const translate = useTranslate();

  const [validationCodeOptions, setValidationCodeOptions] = useState([]);

  useEffect(() => {
    preferenceTypeApi.getValidationCodeOptions()
      .then((response) => {
        setValidationCodeOptions(response?.data?.data?.map((option) => ({
          id: option.id,
          value: option.id,
          label: option.label,
        })) ?? []);
      });
  }, []);

  const goToList = () => {
    history.push(PREFERENCE_TYPE_URL.list());
  };

  const getPreferenceType = async () => {
    const response = await preferenceTypeApi.getPreferenceType(preferenceTypeId);
    const preferenceType = response?.data?.data;
    return {
      name: preferenceType?.name ?? '',
      validationCode: preferenceType?.validationCode
        ? {
          id: preferenceType.validationCode,
          value: preferenceType.validationCode,
          label: preferenceType.validationCode,
        }
        : null,
    };
  };

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    mode: 'onBlur',
    defaultValues: preferenceTypeId
      ? getPreferenceType
      : { name: '', validationCode: { id: 'DEFAULT', value: 'DEFAULT', label: 'DEFAULT' } },
  });

  const onSubmit = async (values) => {
    const payload = {
      name: values.name,
      validationCode: values.validationCode?.id ?? null,
    };
    try {
      if (preferenceTypeId) {
        await preferenceTypeApi.updatePreferenceType(preferenceTypeId, payload);
        notification(NotificationType.SUCCESS)({
          message: translate('react.preferenceType.update.success.label', 'Preference type has been updated successfully'),
        });
      } else {
        await preferenceTypeApi.createPreferenceType(payload);
        notification(NotificationType.SUCCESS)({
          message: translate('react.preferenceType.create.success.label', 'Preference type has been created successfully'),
        });
      }
      goToList();
    } catch (error) {
      const message = error?.response?.data?.errorMessage
        || error?.response?.data?.errorMessages?.join('; ');
      if (message) {
        Alert.error(message);
      }
    }
  };

  return (
    <PageWrapper>
      <HeaderWrapper className="align-items-center h-auto py-3">
        <span className="title">
          {preferenceTypeId
            ? <Translate id="react.preferenceType.edit.label" defaultMessage="Edit Preference Type" />
            : <Translate id="react.preferenceType.create.label" defaultMessage="Create Preference Type" />}
        </span>
      </HeaderWrapper>
      <form onSubmit={handleSubmit(onSubmit)} className="p-3">
        <Section
          title={{ label: 'react.preferenceType.detailsSection.label', defaultMessage: 'Preference Type Details' }}
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
                    title={{ id: 'react.preferenceType.name.label', defaultMessage: 'Name' }}
                    required
                    errorMessage={errors.name?.message}
                    {...field}
                  />
                )}
              />
            </div>
            <div className="col-lg-4 col-md-6 px-2 pt-2">
              <Controller
                name="validationCode"
                control={control}
                render={({ field }) => (
                  <SelectField
                    title={{ id: 'react.preferenceType.validationCode.label', defaultMessage: 'Validation Code' }}
                    options={validationCodeOptions}
                    errorMessage={errors.validationCode?.message}
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

export default PreferenceTypeForm;
