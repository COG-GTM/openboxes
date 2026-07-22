import React, { useEffect, useState } from 'react';

import { confirmAlert } from 'react-confirm-alert';
import { Controller, useForm } from 'react-hook-form';
import { useDispatch } from 'react-redux';
import { useHistory, useParams } from 'react-router-dom';

import { hideSpinner, showSpinner } from 'actions';
import glAccountApi from 'api/services/GlAccountApi';
import Button from 'components/form-elements/Button';
import Checkbox from 'components/form-elements/v2/Checkbox';
import SelectField from 'components/form-elements/v2/SelectField';
import TextInput from 'components/form-elements/v2/TextInput';
import notification from 'components/Layout/notifications/notification';
import Section from 'components/Layout/v2/Section';
import { GL_ACCOUNT_URL } from 'consts/applicationUrls';
import NotificationType from 'consts/notificationTypes';
import useTranslate from 'hooks/useTranslate';
import useTranslation from 'hooks/useTranslation';
import Translate from 'utils/Translate';
import HeaderWrapper from 'wrappers/HeaderWrapper';
import PageWrapper from 'wrappers/PageWrapper';

const GlAccountForm = () => {
  useTranslation('glAccount', 'default');

  const { glAccountId } = useParams();
  const history = useHistory();
  const dispatch = useDispatch();
  const translate = useTranslate();

  const [glAccountTypeOptions, setGlAccountTypeOptions] = useState([]);

  useEffect(() => {
    glAccountApi.getGlAccountTypeOptions()
      .then((response) => {
        setGlAccountTypeOptions(response?.data?.data?.map((option) => ({
          id: option.id,
          value: option.id,
          label: option.label,
        })) ?? []);
      });
  }, []);

  const getGlAccount = async () => {
    const response = await glAccountApi.getGlAccount(glAccountId);
    const glAccount = response?.data?.data;
    return {
      active: glAccount?.active ?? true,
      code: glAccount?.code ?? '',
      name: glAccount?.name ?? '',
      description: glAccount?.description ?? '',
      glAccountType: glAccount?.glAccountType
        ? {
          id: glAccount.glAccountType.id,
          value: glAccount.glAccountType.id,
          label: glAccount.glAccountType.code,
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
    defaultValues: glAccountId
      ? getGlAccount
      : {
        active: true, code: '', name: '', description: '', glAccountType: null,
      },
  });

  const onSubmit = async (values) => {
    const payload = {
      active: values.active,
      code: values.code,
      name: values.name,
      description: values.description,
      glAccountType: values.glAccountType ? { id: values.glAccountType.id } : null,
    };
    if (glAccountId) {
      await glAccountApi.updateGlAccount(glAccountId, payload);
      notification(NotificationType.SUCCESS)({
        message: translate('react.glAccount.update.success.label', 'GL account has been updated successfully'),
      });
      history.push(GL_ACCOUNT_URL.list());
      return;
    }
    const response = await glAccountApi.createGlAccount(payload);
    notification(NotificationType.SUCCESS)({
      message: translate('react.glAccount.create.success.label', 'GL account has been created successfully'),
    });
    history.push(GL_ACCOUNT_URL.edit(response?.data?.data?.id));
  };

  const deleteGlAccount = async () => {
    dispatch(showSpinner());
    try {
      const { status } = await glAccountApi.deleteGlAccount(glAccountId);
      if (status === 204) {
        notification(NotificationType.SUCCESS)({
          message: translate('react.glAccount.delete.success.label', 'GL account has been deleted successfully'),
        });
        history.push(GL_ACCOUNT_URL.list());
      }
    } finally {
      dispatch(hideSpinner());
    }
  };

  const onDelete = () => {
    confirmAlert({
      title: translate('react.default.areYouSure.label', 'Are you sure?'),
      message: translate(
        'react.glAccount.delete.confirm.label',
        'Are you sure you want to delete this GL account?',
      ),
      buttons: [
        {
          label: translate('react.default.yes.label', 'Yes'),
          onClick: deleteGlAccount,
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
          {glAccountId
            ? <Translate id="react.glAccount.edit.label" defaultMessage="Edit GL Account" />
            : <Translate id="react.glAccount.create.label" defaultMessage="Create GL Account" />}
        </span>
      </HeaderWrapper>
      <form onSubmit={handleSubmit(onSubmit)} className="p-3">
        <Section
          title={{ label: 'react.glAccount.detailsSection.label', defaultMessage: 'GL Account Details' }}
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
                    title={{ id: 'react.glAccount.code.label', defaultMessage: 'Code' }}
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
                    title={{ id: 'react.glAccount.name.label', defaultMessage: 'Name' }}
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
                    title={{ id: 'react.glAccount.description.label', defaultMessage: 'Description' }}
                    {...field}
                  />
                )}
              />
            </div>
            <div className="col-lg-4 col-md-6 px-2 pt-2">
              <Controller
                name="glAccountType"
                control={control}
                rules={{
                  required: translate('react.default.error.requiredField.label', 'This field is required'),
                }}
                render={({ field }) => (
                  <SelectField
                    title={{ id: 'react.glAccount.glAccountType.label', defaultMessage: 'GL Account Type' }}
                    required
                    errorMessage={errors.glAccountType?.message}
                    options={glAccountTypeOptions}
                    {...field}
                  />
                )}
              />
            </div>
            <div className="col-lg-4 col-md-6 px-2 pt-2">
              <Controller
                name="active"
                control={control}
                render={({ field }) => (
                  <Checkbox
                    title={{ id: 'react.glAccount.active.label', defaultMessage: 'Active' }}
                    {...field}
                  />
                )}
              />
            </div>
          </div>
          <div className="d-flex gap-8 pt-3">
            <Button
              type="submit"
              defaultLabel={glAccountId ? 'Update' : 'Create'}
              label={glAccountId ? 'react.default.button.update.label' : 'react.default.button.create.label'}
              variant="primary"
              disabled={isSubmitting}
            />
            {glAccountId && (
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
              onClick={() => history.push(GL_ACCOUNT_URL.list())}
            />
          </div>
        </Section>
      </form>
    </PageWrapper>
  );
};

export default GlAccountForm;
