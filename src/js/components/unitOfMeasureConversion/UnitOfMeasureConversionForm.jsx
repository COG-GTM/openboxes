import React, { useEffect, useState } from 'react';

import { confirmAlert } from 'react-confirm-alert';
import { Controller, useForm } from 'react-hook-form';
import { useDispatch } from 'react-redux';
import { useHistory, useParams } from 'react-router-dom';

import { hideSpinner, showSpinner } from 'actions';
import unitOfMeasureConversionApi from 'api/services/UnitOfMeasureConversionApi';
import Button from 'components/form-elements/Button';
import Checkbox from 'components/form-elements/v2/Checkbox';
import SelectField from 'components/form-elements/v2/SelectField';
import TextInput from 'components/form-elements/v2/TextInput';
import notification from 'components/Layout/notifications/notification';
import Section from 'components/Layout/v2/Section';
import { UNIT_OF_MEASURE_CONVERSION_URL } from 'consts/applicationUrls';
import NotificationType from 'consts/notificationTypes';
import useTranslate from 'hooks/useTranslate';
import useTranslation from 'hooks/useTranslation';
import Translate from 'utils/Translate';
import HeaderWrapper from 'wrappers/HeaderWrapper';
import PageWrapper from 'wrappers/PageWrapper';

const toOption = (uom) => (uom ? { id: uom.id, value: uom.id, label: uom.name } : null);

const UnitOfMeasureConversionForm = () => {
  useTranslation('unitOfMeasureConversion', 'default');

  const { unitOfMeasureConversionId } = useParams();
  const history = useHistory();
  const dispatch = useDispatch();
  const translate = useTranslate();

  const [unitOfMeasureOptions, setUnitOfMeasureOptions] = useState([]);

  useEffect(() => {
    unitOfMeasureConversionApi.getUnitOfMeasures()
      .then((response) => {
        setUnitOfMeasureOptions(response?.data?.data?.map(toOption) ?? []);
      });
  }, []);

  const goToList = () => {
    history.push(UNIT_OF_MEASURE_CONVERSION_URL.list());
  };

  const getUnitOfMeasureConversion = async () => {
    const response = await unitOfMeasureConversionApi
      .getUnitOfMeasureConversion(unitOfMeasureConversionId);
    const uomConversion = response?.data?.data;
    return {
      fromUnitOfMeasure: toOption(uomConversion?.fromUnitOfMeasure),
      toUnitOfMeasure: toOption(uomConversion?.toUnitOfMeasure),
      conversionRate: uomConversion?.conversionRate !== null
        && uomConversion?.conversionRate !== undefined
        ? `${Number(uomConversion.conversionRate)}`
        : '',
      active: uomConversion?.active ?? true,
    };
  };

  const emptyValues = {
    fromUnitOfMeasure: null, toUnitOfMeasure: null, conversionRate: '', active: true,
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

  // Fetch and reset on every id change so the form is correctly populated
  // even when routed between create/edit without a remount.
  useEffect(() => {
    if (unitOfMeasureConversionId) {
      getUnitOfMeasureConversion().then((values) => reset(values));
      return;
    }
    reset(emptyValues);
  }, [unitOfMeasureConversionId]);

  const onSubmit = async (values) => {
    const payload = {
      fromUnitOfMeasure: values.fromUnitOfMeasure ? { id: values.fromUnitOfMeasure.id } : null,
      toUnitOfMeasure: values.toUnitOfMeasure ? { id: values.toUnitOfMeasure.id } : null,
      conversionRate: values.conversionRate === '' ? null : values.conversionRate,
      active: values.active,
    };
    if (unitOfMeasureConversionId) {
      await unitOfMeasureConversionApi
        .updateUnitOfMeasureConversion(unitOfMeasureConversionId, payload);
      notification(NotificationType.SUCCESS)({
        message: translate('react.unitOfMeasureConversion.update.success.label', 'Unit of measure conversion has been updated successfully'),
      });
      goToList();
      return;
    }
    const response = await unitOfMeasureConversionApi.createUnitOfMeasureConversion(payload);
    notification(NotificationType.SUCCESS)({
      message: translate('react.unitOfMeasureConversion.create.success.label', 'Unit of measure conversion has been created successfully'),
    });
    history.push(UNIT_OF_MEASURE_CONVERSION_URL.edit(response?.data?.data?.id));
  };

  const deleteUnitOfMeasureConversion = async () => {
    dispatch(showSpinner());
    try {
      const { status } = await unitOfMeasureConversionApi
        .deleteUnitOfMeasureConversion(unitOfMeasureConversionId);
      if (status === 204) {
        notification(NotificationType.SUCCESS)({
          message: translate('react.unitOfMeasureConversion.delete.success.label', 'Unit of measure conversion has been deleted successfully'),
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
        'react.unitOfMeasureConversion.delete.confirm.label',
        'Are you sure you want to delete this unit of measure conversion?',
      ),
      buttons: [
        {
          label: translate('react.default.yes.label', 'Yes'),
          onClick: deleteUnitOfMeasureConversion,
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
          {unitOfMeasureConversionId
            ? <Translate id="react.unitOfMeasureConversion.edit.label" defaultMessage="Edit Unit of Measure Conversion" />
            : <Translate id="react.unitOfMeasureConversion.create.label" defaultMessage="Create Unit of Measure Conversion" />}
        </span>
      </HeaderWrapper>
      <form onSubmit={handleSubmit(onSubmit)} className="p-3">
        <Section
          title={{ label: 'react.unitOfMeasureConversion.detailsSection.label', defaultMessage: 'Unit of Measure Conversion Details' }}
        >
          <div className="row">
            <div className="col-lg-4 col-md-6 px-2 pt-2">
              <Controller
                name="fromUnitOfMeasure"
                control={control}
                rules={{
                  required: translate('react.default.error.requiredField.label', 'This field is required'),
                }}
                render={({ field }) => (
                  <SelectField
                    title={{ id: 'react.unitOfMeasureConversion.fromUnitOfMeasure.label', defaultMessage: 'From Unit of Measure' }}
                    required
                    options={unitOfMeasureOptions}
                    errorMessage={errors.fromUnitOfMeasure?.message}
                    {...field}
                  />
                )}
              />
            </div>
            <div className="col-lg-4 col-md-6 px-2 pt-2">
              <Controller
                name="toUnitOfMeasure"
                control={control}
                rules={{
                  required: translate('react.default.error.requiredField.label', 'This field is required'),
                }}
                render={({ field }) => (
                  <SelectField
                    title={{ id: 'react.unitOfMeasureConversion.toUnitOfMeasure.label', defaultMessage: 'To Unit of Measure' }}
                    required
                    options={unitOfMeasureOptions}
                    errorMessage={errors.toUnitOfMeasure?.message}
                    {...field}
                  />
                )}
              />
            </div>
            <div className="col-lg-4 col-md-6 px-2 pt-2">
              <Controller
                name="conversionRate"
                control={control}
                rules={{
                  required: translate('react.default.error.requiredField.label', 'This field is required'),
                }}
                render={({ field }) => (
                  <TextInput
                    type="number"
                    title={{ id: 'react.unitOfMeasureConversion.conversionRate.label', defaultMessage: 'Conversion Rate' }}
                    required
                    errorMessage={errors.conversionRate?.message}
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
                    title={{ id: 'react.unitOfMeasureConversion.active.label', defaultMessage: 'Active' }}
                    {...field}
                  />
                )}
              />
            </div>
          </div>
          <div className="d-flex gap-8 pt-3">
            <Button
              type="submit"
              defaultLabel={unitOfMeasureConversionId ? 'Update' : 'Create'}
              label={unitOfMeasureConversionId ? 'react.default.button.update.label' : 'react.default.button.create.label'}
              variant="primary"
              disabled={isSubmitting}
            />
            {unitOfMeasureConversionId && (
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

export default UnitOfMeasureConversionForm;
