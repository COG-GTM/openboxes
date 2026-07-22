import React, { useEffect, useState } from 'react';

import { confirmAlert } from 'react-confirm-alert';
import { Controller, useForm } from 'react-hook-form';
import { useDispatch } from 'react-redux';
import { useHistory, useParams } from 'react-router-dom';

import { hideSpinner, showSpinner } from 'actions';
import glAccountTypeApi from 'api/services/GlAccountTypeApi';
import Button from 'components/form-elements/Button';
import SelectField from 'components/form-elements/v2/SelectField';
import TextInput from 'components/form-elements/v2/TextInput';
import notification from 'components/Layout/notifications/notification';
import Section from 'components/Layout/v2/Section';
import { GL_ACCOUNT_TYPE_URL } from 'consts/applicationUrls';
import NotificationType from 'consts/notificationTypes';
import useTranslate from 'hooks/useTranslate';
import useTranslation from 'hooks/useTranslation';
import Translate from 'utils/Translate';
import HeaderWrapper from 'wrappers/HeaderWrapper';
import PageWrapper from 'wrappers/PageWrapper';

const GlAccountTypeForm = () => {
  useTranslation('glAccountType', 'default');

  const { glAccountTypeId } = useParams();
  const history = useHistory();
  const dispatch = useDispatch();
  const translate = useTranslate();

  const [glAccountTypeCodeOptions, setGlAccountTypeCodeOptions] = useState([]);

  useEffect(() => {
    glAccountTypeApi.getGlAccountTypeCodeOptions()
      .then((response) => {
        setGlAccountTypeCodeOptions(response?.data?.data?.map((option) => ({
          id: option.id,
          value: option.value,
          label: option.label,
        })) ?? []);
      });
  }, []);

  const getGlAccountType = async () => {
    const response = await glAccountTypeApi.getGlAccountType(glAccountTypeId);
    const glAccountType = response?.data?.data;
    return {
      code: glAccountType?.code ?? '',
      name: glAccountType?.name ?? '',
      glAccountTypeCode: glAccountType?.glAccountTypeCode
        ? {
          id: glAccountType.glAccountTypeCode,
          value: glAccountType.glAccountTypeCode,
          label: glAccountType.glAccountTypeCode,
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
    defaultValues: glAccountTypeId
      ? getGlAccountType
      : { code: '', name: '', glAccountTypeCode: null },
  });

  const onSubmit = async (values) => {
    const payload = {
      code: values.code,
      name: values.name,
      glAccountTypeCode: values.glAccountTypeCode?.value ?? null,
    };
    if (glAccountTypeId) {
      await glAccountTypeApi.updateGlAccountType(glAccountTypeId, payload);
      notification(NotificationType.SUCCESS)({
        message: translate('react.glAccountType.update.success.label', 'GL account type has been updated successfully'),
      });
      history.push(GL_ACCOUNT_TYPE_URL.list());
      return;
    }
    const response = await glAccountTypeApi.createGlAccountType(payload);
    notification(NotificationType.SUCCESS)({
      message: translate('react.glAccountType.create.success.label', 'GL account type has been created successfully'),
    });
    history.push(GL_ACCOUNT_TYPE_URL.edit(response?.data?.data?.id));
  };

  const deleteGlAccountType = async () => {
    dispatch(showSpinner());
    try {
      const { status } = await glAccountTypeApi.deleteGlAccountType(glAccountTypeId);
      if (status === 204) {
        notification(NotificationType.SUCCESS)({
          message: translate('react.glAccountType.delete.success.label', 'GL account type has been deleted successfully'),
        });
        history.push(GL_ACCOUNT_TYPE_URL.list());
      }
    } finally {
      dispatch(hideSpinner());
    }
  };

  const onDelete = () => {
    confirmAlert({
      title: translate('react.default.areYouSure.label', 'Are you sure?'),
      message: translate(
        'react.glAccountType.delete.confirm.label',
        'Are you sure you want to delete this GL account type?',
      ),
      buttons: [
        {
          label: translate('react.default.yes.label', 'Yes'),
          onClick: deleteGlAccountType,
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
          {glAccountTypeId
            ? <Translate id="react.glAccountType.edit.label" defaultMessage="Edit GL Account Type" />
            : <Translate id="react.glAccountType.create.label" defaultMessage="Create GL Account Type" />}
        </span>
      </HeaderWrapper>
      <form onSubmit={handleSubmit(onSubmit)} className="p-3">
        <Section
          title={{ label: 'react.glAccountType.detailsSection.label', defaultMessage: 'GL Account Type Details' }}
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
                    title={{ id: 'react.glAccountType.code.label', defaultMessage: 'Code' }}
                    required
                    errorMessage={errors.code?.message}
                    {...field}
                  />
                )}
              />
            </div>
            <div className="col-lg-4 col-md-6 px-2 pt-2">
              <Controller
                name="name"
                control={control}
                render={({ field }) => (
                  <TextInput
                    title={{ id: 'react.glAccountType.name.label', defaultMessage: 'Name' }}
                    {...field}
                  />
                )}
              />
            </div>
            <div className="col-lg-4 col-md-6 px-2 pt-2">
              <Controller
                name="glAccountTypeCode"
                control={control}
                rules={{
                  required: translate('react.default.error.requiredField.label', 'This field is required'),
                }}
                render={({ field }) => (
                  <SelectField
                    title={{ id: 'react.glAccountType.glAccountTypeCode.label', defaultMessage: 'GL Account Type Code' }}
                    required
                    errorMessage={errors.glAccountTypeCode?.message}
                    options={glAccountTypeCodeOptions}
                    {...field}
                  />
                )}
              />
            </div>
          </div>
          <div className="d-flex gap-8 pt-3">
            <Button
              type="submit"
              defaultLabel={glAccountTypeId ? 'Update' : 'Create'}
              label={glAccountTypeId ? 'react.default.button.update.label' : 'react.default.button.create.label'}
              variant="primary"
              disabled={isSubmitting}
            />
            {glAccountTypeId && (
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
              onClick={() => history.push(GL_ACCOUNT_TYPE_URL.list())}
            />
          </div>
        </Section>
      </form>
    </PageWrapper>
  );
};

export default GlAccountTypeForm;
