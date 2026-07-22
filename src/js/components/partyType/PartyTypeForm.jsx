import React, { useEffect, useState } from 'react';

import { confirmAlert } from 'react-confirm-alert';
import { Controller, useForm } from 'react-hook-form';
import { useDispatch } from 'react-redux';
import { useHistory, useParams } from 'react-router-dom';

import { hideSpinner, showSpinner } from 'actions';
import partyTypeApi from 'api/services/PartyTypeApi';
import Button from 'components/form-elements/Button';
import SelectField from 'components/form-elements/v2/SelectField';
import TextInput from 'components/form-elements/v2/TextInput';
import notification from 'components/Layout/notifications/notification';
import Section from 'components/Layout/v2/Section';
import { PARTY_TYPE_URL } from 'consts/applicationUrls';
import NotificationType from 'consts/notificationTypes';
import useTranslate from 'hooks/useTranslate';
import useTranslation from 'hooks/useTranslation';
import Translate from 'utils/Translate';
import HeaderWrapper from 'wrappers/HeaderWrapper';
import PageWrapper from 'wrappers/PageWrapper';

const PartyTypeForm = () => {
  useTranslation('partyType', 'default');

  const { partyTypeId } = useParams();
  const history = useHistory();
  const dispatch = useDispatch();
  const translate = useTranslate();

  const [partyTypeCodeOptions, setPartyTypeCodeOptions] = useState([]);

  useEffect(() => {
    partyTypeApi.getPartyTypeCodeOptions()
      .then((response) => {
        setPartyTypeCodeOptions(response?.data?.data?.map((option) => ({
          id: option.id,
          value: option.id,
          label: option.label,
        })) ?? []);
      });
  }, []);

  const emptyValues = {
    code: '',
    name: '',
    description: '',
    partyTypeCode: null,
  };

  const getPartyType = async () => {
    const response = await partyTypeApi.getPartyType(partyTypeId);
    const partyType = response?.data?.data;
    return {
      code: partyType?.code ?? '',
      name: partyType?.name ?? '',
      description: partyType?.description ?? '',
      partyTypeCode: partyType?.partyTypeCode
        ? {
          id: partyType.partyTypeCode,
          value: partyType.partyTypeCode,
          label: partyType.partyTypeCode,
        }
        : null,
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

  useEffect(() => {
    if (partyTypeId) {
      getPartyType().then((values) => reset(values));
      return;
    }
    reset(emptyValues);
  }, [partyTypeId]);

  const onSubmit = async (values) => {
    const payload = {
      code: values.code || null,
      name: values.name || null,
      description: values.description || null,
      partyTypeCode: values.partyTypeCode?.id ?? null,
    };
    if (partyTypeId) {
      try {
        await partyTypeApi.updatePartyType(partyTypeId, payload);
      } catch (error) {
        // apiClient's response interceptor already notifies the user
        return;
      }
      notification(NotificationType.SUCCESS)({
        message: translate('react.partyType.update.success.label', 'Party type has been updated successfully'),
      });
      history.push(PARTY_TYPE_URL.list());
      return;
    }
    try {
      await partyTypeApi.createPartyType(payload);
    } catch (error) {
      // apiClient's response interceptor already notifies the user
      return;
    }
    notification(NotificationType.SUCCESS)({
      message: translate('react.partyType.create.success.label', 'Party type has been created successfully'),
    });
    history.push(PARTY_TYPE_URL.list());
  };

  const deletePartyType = async () => {
    dispatch(showSpinner());
    try {
      const { status } = await partyTypeApi.deletePartyType(partyTypeId);
      if (status === 204) {
        notification(NotificationType.SUCCESS)({
          message: translate('react.partyType.delete.success.label', 'Party type has been deleted successfully'),
        });
        history.push(PARTY_TYPE_URL.list());
      }
    } finally {
      dispatch(hideSpinner());
    }
  };

  const onDelete = () => {
    confirmAlert({
      title: translate('react.default.areYouSure.label', 'Are you sure?'),
      message: translate(
        'react.partyType.delete.confirm.label',
        'Are you sure you want to delete this party type?',
      ),
      buttons: [
        {
          label: translate('react.default.yes.label', 'Yes'),
          onClick: deletePartyType,
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
          {partyTypeId
            ? <Translate id="react.partyType.edit.label" defaultMessage="Edit Party Type" />
            : <Translate id="react.partyType.create.label" defaultMessage="Create Party Type" />}
        </span>
      </HeaderWrapper>
      <form onSubmit={handleSubmit(onSubmit)} className="p-3">
        <Section
          title={{ label: 'react.partyType.detailsSection.label', defaultMessage: 'Party Type Details' }}
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
                    title={{ id: 'react.partyType.code.label', defaultMessage: 'Code' }}
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
                rules={{
                  required: translate('react.default.error.requiredField.label', 'This field is required'),
                }}
                render={({ field }) => (
                  <TextInput
                    title={{ id: 'react.partyType.name.label', defaultMessage: 'Name' }}
                    required
                    errorMessage={errors.name?.message}
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
                    title={{ id: 'react.partyType.description.label', defaultMessage: 'Description' }}
                    {...field}
                  />
                )}
              />
            </div>
            <div className="col-lg-4 col-md-6 px-2 pt-2">
              <Controller
                name="partyTypeCode"
                control={control}
                rules={{
                  required: translate('react.default.error.requiredField.label', 'This field is required'),
                }}
                render={({ field }) => (
                  <SelectField
                    title={{ id: 'react.partyType.partyTypeCode.label', defaultMessage: 'Party Type Code' }}
                    placeholder={translate('react.default.selectField.placeholder.label', 'Select')}
                    options={partyTypeCodeOptions}
                    errorMessage={errors.partyTypeCode?.message}
                    required
                    {...field}
                  />
                )}
              />
            </div>
          </div>
          <div className="d-flex gap-8 pt-3">
            <Button
              type="submit"
              disabled={isSubmitting}
              defaultLabel={partyTypeId ? 'Update' : 'Create'}
              label={partyTypeId ? 'react.default.button.update.label' : 'react.default.button.create.label'}
              variant="primary"
            />
            {partyTypeId && (
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
              onClick={() => history.push(PARTY_TYPE_URL.list())}
            />
          </div>
        </Section>
      </form>
    </PageWrapper>
  );
};

export default PartyTypeForm;
