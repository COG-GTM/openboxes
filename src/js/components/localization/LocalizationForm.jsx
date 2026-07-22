import React, { useEffect, useState } from 'react';

import { confirmAlert } from 'react-confirm-alert';
import { Controller, useForm } from 'react-hook-form';
import { useDispatch, useSelector } from 'react-redux';
import { useHistory, useParams } from 'react-router-dom';

import { hideSpinner, showSpinner } from 'actions';
import localizationOverrideApi from 'api/services/LocalizationOverrideApi';
import Button from 'components/form-elements/Button';
import SelectField from 'components/form-elements/v2/SelectField';
import TextInput from 'components/form-elements/v2/TextInput';
import notification from 'components/Layout/notifications/notification';
import Section from 'components/Layout/v2/Section';
import { LOCALIZATION_URL } from 'consts/applicationUrls';
import NotificationType from 'consts/notificationTypes';
import useTranslate from 'hooks/useTranslate';
import useTranslation from 'hooks/useTranslation';
import Translate from 'utils/Translate';
import HeaderWrapper from 'wrappers/HeaderWrapper';
import PageWrapper from 'wrappers/PageWrapper';

const toOption = (option) => ({ id: option.id, value: option.id, label: option.label });

const LocalizationForm = () => {
  useTranslation('localization', 'default');

  const { localizationId } = useParams();
  const history = useHistory();
  const dispatch = useDispatch();
  const translate = useTranslate();

  const activeLanguage = useSelector((state) => state.session.activeLanguage);

  const [localeOptions, setLocaleOptions] = useState([]);

  useEffect(() => {
    localizationOverrideApi.getLocaleOptions()
      .then((response) => setLocaleOptions(response?.data?.data?.map(toOption) ?? []));
  }, []);

  const goToList = () => {
    history.push(LOCALIZATION_URL.list());
  };

  const getLocalization = async () => {
    const response = await localizationOverrideApi.getLocalization(localizationId);
    const localization = response?.data?.data;
    return {
      code: localization?.code ?? '',
      locale: localization?.locale
        ? { id: localization.locale, value: localization.locale, label: localization.locale }
        : null,
      text: localization?.text ?? '',
    };
  };

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    mode: 'onBlur',
    defaultValues: localizationId
      ? getLocalization
      : {
        code: '',
        locale: activeLanguage
          ? { id: activeLanguage, value: activeLanguage, label: activeLanguage }
          : null,
        text: '',
      },
  });

  const onSubmit = async (values) => {
    const payload = {
      code: values.code,
      locale: values.locale?.id ?? null,
      text: values.text,
    };
    if (localizationId) {
      await localizationOverrideApi.updateLocalization(localizationId, payload);
      notification(NotificationType.SUCCESS)({
        message: translate('react.localization.update.success.label', 'Localization has been updated successfully'),
      });
    } else {
      await localizationOverrideApi.createLocalization(payload);
      notification(NotificationType.SUCCESS)({
        message: translate('react.localization.create.success.label', 'Localization has been created successfully'),
      });
    }
    goToList();
  };

  const deleteLocalization = async () => {
    dispatch(showSpinner());
    try {
      const { status } = await localizationOverrideApi.deleteLocalization(localizationId);
      if (status === 204) {
        notification(NotificationType.SUCCESS)({
          message: translate('react.localization.delete.success.label', 'Localization has been deleted successfully'),
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
        'react.localization.delete.confirm.label',
        'Are you sure you want to delete this localization?',
      ),
      buttons: [
        { label: translate('react.default.yes.label', 'Yes'), onClick: deleteLocalization },
        { label: translate('react.default.no.label', 'No') },
      ],
    });
  };

  return (
    <PageWrapper>
      <HeaderWrapper className="align-items-center h-auto py-3">
        <span className="title">
          {localizationId
            ? <Translate id="react.localization.edit.label" defaultMessage="Edit Localization" />
            : <Translate id="react.localization.create.label" defaultMessage="Create Localization" />}
        </span>
      </HeaderWrapper>
      <form onSubmit={handleSubmit(onSubmit)} className="p-3">
        <Section
          title={{ label: 'react.localization.detailsSection.label', defaultMessage: 'Localization Details' }}
        >
          <div className="row">
            <div className="col-lg-4 col-md-6 px-2 pt-2">
              <Controller
                name="code"
                control={control}
                rules={{
                  required: translate('react.default.error.requiredField.label', 'This field is required'),
                }}
                render={({ field }) => (
                  <TextInput
                    title={{ id: 'react.localization.code.label', defaultMessage: 'Code' }}
                    required
                    errorMessage={errors.code?.message}
                    {...field}
                  />
                )}
              />
            </div>
            <div className="col-lg-4 col-md-6 px-2 pt-2">
              <Controller
                name="locale"
                control={control}
                render={({ field }) => (
                  <SelectField
                    title={{ id: 'react.localization.locale.label', defaultMessage: 'Locale' }}
                    options={localeOptions}
                    {...field}
                  />
                )}
              />
            </div>
            <div className="col-lg-4 col-md-6 px-2 pt-2">
              <Controller
                name="text"
                control={control}
                render={({ field }) => (
                  <TextInput
                    title={{ id: 'react.localization.text.label', defaultMessage: 'Text' }}
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
            {localizationId && (
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

export default LocalizationForm;
