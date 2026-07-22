import React from 'react';

import { confirmAlert } from 'react-confirm-alert';
import { Controller, useForm } from 'react-hook-form';
import { useDispatch, useSelector } from 'react-redux';
import { useHistory, useParams } from 'react-router-dom';

import { hideSpinner, showSpinner } from 'actions';
import budgetCodeApi from 'api/services/BudgetCodeApi';
import Button from 'components/form-elements/Button';
import Checkbox from 'components/form-elements/v2/Checkbox';
import SelectField from 'components/form-elements/v2/SelectField';
import TextInput from 'components/form-elements/v2/TextInput';
import notification from 'components/Layout/notifications/notification';
import Section from 'components/Layout/v2/Section';
import { BUDGET_CODE_URL } from 'consts/applicationUrls';
import NotificationType from 'consts/notificationTypes';
import useTranslate from 'hooks/useTranslate';
import useTranslation from 'hooks/useTranslation';
import { debounceOrganizationsFetch } from 'utils/option-utils';
import Translate from 'utils/Translate';
import HeaderWrapper from 'wrappers/HeaderWrapper';
import PageWrapper from 'wrappers/PageWrapper';

// Role types matching the legacy GSP's organization select
const ORGANIZATION_ROLE_TYPES = ['ROLE_ORGANIZATION', 'ROLE_SUPPLIER', 'ROLE_MANUFACTURER'];

const BudgetCodeForm = () => {
  useTranslation('budgetCode', 'default');

  const { budgetCodeId } = useParams();
  const history = useHistory();
  const dispatch = useDispatch();
  const translate = useTranslate();

  const { debounceTime, minSearchLength } = useSelector((state) => ({
    debounceTime: state.session.searchConfig.debounceTime,
    minSearchLength: state.session.searchConfig.minSearchLength,
  }));

  const debouncedOrganizationsFetch = debounceOrganizationsFetch(
    debounceTime,
    minSearchLength,
    ORGANIZATION_ROLE_TYPES,
  );

  const getBudgetCode = async () => {
    const response = await budgetCodeApi.getBudgetCode(budgetCodeId);
    const budgetCode = response?.data?.data;
    return {
      active: budgetCode?.active ?? true,
      code: budgetCode?.code ?? '',
      name: budgetCode?.name ?? '',
      description: budgetCode?.description ?? '',
      organization: budgetCode?.organization
        ? {
          id: budgetCode.organization.id,
          value: budgetCode.organization.id,
          label: budgetCode.organization.name,
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
    defaultValues: budgetCodeId
      ? getBudgetCode
      : {
        active: true, code: '', name: '', description: '', organization: null,
      },
  });

  const onSubmit = async (values) => {
    const payload = {
      active: values.active,
      code: values.code,
      name: values.name,
      description: values.description,
      organization: values.organization ? { id: values.organization.id } : null,
    };
    if (budgetCodeId) {
      await budgetCodeApi.updateBudgetCode(budgetCodeId, payload);
      notification(NotificationType.SUCCESS)({
        message: translate('react.budgetCode.update.success.label', 'Budget code has been updated successfully'),
      });
      history.push(BUDGET_CODE_URL.list());
      return;
    }
    const response = await budgetCodeApi.createBudgetCode(payload);
    notification(NotificationType.SUCCESS)({
      message: translate('react.budgetCode.create.success.label', 'Budget code has been created successfully'),
    });
    history.push(BUDGET_CODE_URL.edit(response?.data?.data?.id));
  };

  const deleteBudgetCode = async () => {
    dispatch(showSpinner());
    try {
      const { status } = await budgetCodeApi.deleteBudgetCode(budgetCodeId);
      if (status === 204) {
        notification(NotificationType.SUCCESS)({
          message: translate('react.budgetCode.delete.success.label', 'Budget code has been deleted successfully'),
        });
        history.push(BUDGET_CODE_URL.list());
      }
    } finally {
      dispatch(hideSpinner());
    }
  };

  const onDelete = () => {
    confirmAlert({
      title: translate('react.default.areYouSure.label', 'Are you sure?'),
      message: translate(
        'react.budgetCode.delete.confirm.label',
        'Are you sure you want to delete this budget code?',
      ),
      buttons: [
        {
          label: translate('react.default.yes.label', 'Yes'),
          onClick: deleteBudgetCode,
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
          {budgetCodeId
            ? <Translate id="react.budgetCode.edit.label" defaultMessage="Edit Budget Code" />
            : <Translate id="react.budgetCode.create.label" defaultMessage="Create Budget Code" />}
        </span>
      </HeaderWrapper>
      <form onSubmit={handleSubmit(onSubmit)} className="p-3">
        <Section
          title={{ label: 'react.budgetCode.detailsSection.label', defaultMessage: 'Budget Code Details' }}
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
                    title={{ id: 'react.budgetCode.code.label', defaultMessage: 'Code' }}
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
                    title={{ id: 'react.budgetCode.name.label', defaultMessage: 'Name' }}
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
                    title={{ id: 'react.budgetCode.description.label', defaultMessage: 'Description' }}
                    {...field}
                  />
                )}
              />
            </div>
            <div className="col-lg-4 col-md-6 px-2 pt-2">
              <Controller
                name="organization"
                control={control}
                render={({ field }) => (
                  <SelectField
                    title={{ id: 'react.budgetCode.organization.label', defaultMessage: 'Organization' }}
                    placeholder={translate('react.budgetCode.organization.placeholder.label', 'Search for an organization')}
                    async
                    loadOptions={debouncedOrganizationsFetch}
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
                    title={{ id: 'react.budgetCode.active.label', defaultMessage: 'Active' }}
                    {...field}
                  />
                )}
              />
            </div>
          </div>
          <div className="d-flex gap-8 pt-3">
            <Button
              type="submit"
              defaultLabel={budgetCodeId ? 'Update' : 'Create'}
              label={budgetCodeId ? 'react.default.button.update.label' : 'react.default.button.create.label'}
              variant="primary"
              disabled={isSubmitting}
            />
            {budgetCodeId && (
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
              onClick={() => history.push(BUDGET_CODE_URL.list())}
            />
          </div>
        </Section>
      </form>
    </PageWrapper>
  );
};

export default BudgetCodeForm;
