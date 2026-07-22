import React, { useEffect, useState } from 'react';

import { Controller, useForm } from 'react-hook-form';

import shipmentWorkflowApi from 'api/services/ShipmentWorkflowApi';
import Button from 'components/form-elements/Button';
import SelectField from 'components/form-elements/v2/SelectField';
import TextInput from 'components/form-elements/v2/TextInput';
import notification from 'components/Layout/notifications/notification';
import Section from 'components/Layout/v2/Section';
import { SHIPMENT_WORKFLOW_URL } from 'consts/applicationUrls';
import NotificationType from 'consts/notificationTypes';
import useTranslate from 'hooks/useTranslate';
import useTranslation from 'hooks/useTranslation';
import apiClient from 'utils/apiClient';
import Translate from 'utils/Translate';
import HeaderWrapper from 'wrappers/HeaderWrapper';
import PageWrapper from 'wrappers/PageWrapper';

const ShipmentWorkflowCreate = () => {
  useTranslation('shipmentWorkflow', 'default');

  const translate = useTranslate();

  const [shipmentTypes, setShipmentTypes] = useState([]);

  useEffect(() => {
    apiClient.get('/api/generic/shipmentType', { params: { max: 100 } })
      .then((response) => {
        setShipmentTypes((response?.data?.data ?? []).map((shipmentType) => ({
          id: shipmentType.id,
          value: shipmentType.id,
          label: shipmentType.name,
        })));
      });
  }, []);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    mode: 'onBlur',
    defaultValues: {
      name: '',
      shipmentType: null,
      excludedFields: '',
      documentTemplate: '',
    },
  });

  const goToList = () => {
    // shipmentWorkflow/list is still a legacy GSP screen, so leave the SPA.
    window.location.href = SHIPMENT_WORKFLOW_URL.list();
  };

  const onSubmit = async (values) => {
    await shipmentWorkflowApi.createShipmentWorkflow({
      name: values.name,
      shipmentType: values.shipmentType ? { id: values.shipmentType.id } : null,
      excludedFields: values.excludedFields || null,
      documentTemplate: values.documentTemplate || null,
    });
    notification(NotificationType.SUCCESS)({
      message: translate('react.shipmentWorkflow.create.success.label', 'Shipment workflow has been created successfully'),
    });
    goToList();
  };

  return (
    <PageWrapper>
      <HeaderWrapper className="align-items-center h-auto py-3">
        <span className="title">
          <Translate id="react.shipmentWorkflow.create.label" defaultMessage="Create Shipment Workflow" />
        </span>
      </HeaderWrapper>
      <form onSubmit={handleSubmit(onSubmit)} className="p-3">
        <Section
          title={{ label: 'react.shipmentWorkflow.detailsSection.label', defaultMessage: 'Shipment Workflow Details' }}
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
                    title={{ id: 'react.shipmentWorkflow.name.label', defaultMessage: 'Name' }}
                    required
                    errorMessage={errors.name?.message}
                    {...field}
                  />
                )}
              />
            </div>
            <div className="col-lg-4 col-md-6 px-2 pt-2">
              <Controller
                name="shipmentType"
                control={control}
                rules={{
                  required: translate('react.default.error.requiredField.label', 'This field is required'),
                }}
                render={({ field }) => (
                  <SelectField
                    title={{ id: 'react.shipmentWorkflow.shipmentType.label', defaultMessage: 'Shipment Type' }}
                    required
                    options={shipmentTypes}
                    errorMessage={errors.shipmentType?.message}
                    {...field}
                  />
                )}
              />
            </div>
            <div className="col-lg-4 col-md-6 px-2 pt-2">
              <Controller
                name="excludedFields"
                control={control}
                render={({ field }) => (
                  <TextInput
                    title={{ id: 'react.shipmentWorkflow.excludedFields.label', defaultMessage: 'Excluded Fields' }}
                    {...field}
                  />
                )}
              />
            </div>
            <div className="col-lg-4 col-md-6 px-2 pt-2">
              <Controller
                name="documentTemplate"
                control={control}
                render={({ field }) => (
                  <TextInput
                    title={{ id: 'react.shipmentWorkflow.documentTemplate.label', defaultMessage: 'Document Template' }}
                    {...field}
                  />
                )}
              />
            </div>
          </div>
          <div className="d-flex gap-8 pt-3">
            <Button
              type="submit"
              defaultLabel="Create"
              label="react.default.button.create.label"
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

export default ShipmentWorkflowCreate;
