import React, { useEffect, useState } from 'react';

import { confirmAlert } from 'react-confirm-alert';
import { Controller, useForm } from 'react-hook-form';
import { useDispatch } from 'react-redux';
import { useHistory, useParams } from 'react-router-dom';

import { hideSpinner, showSpinner } from 'actions';
import eventTypeApi from 'api/services/EventTypeApi';
import Button from 'components/form-elements/Button';
import SelectField from 'components/form-elements/v2/SelectField';
import TextInput from 'components/form-elements/v2/TextInput';
import notification from 'components/Layout/notifications/notification';
import Section from 'components/Layout/v2/Section';
import { EVENT_TYPE_URL } from 'consts/applicationUrls';
import NotificationType from 'consts/notificationTypes';
import useTranslate from 'hooks/useTranslate';
import useTranslation from 'hooks/useTranslation';
import Translate from 'utils/Translate';
import HeaderWrapper from 'wrappers/HeaderWrapper';
import PageWrapper from 'wrappers/PageWrapper';

const EventTypeForm = () => {
  useTranslation('eventType', 'default');

  const { eventTypeId } = useParams();
  const history = useHistory();
  const dispatch = useDispatch();
  const translate = useTranslate();

  const [eventCodeOptions, setEventCodeOptions] = useState([]);

  useEffect(() => {
    eventTypeApi.getEventCodeOptions()
      .then((response) => {
        setEventCodeOptions(response?.data?.data?.map((option) => ({
          id: option.id,
          value: option.value,
          label: option.label,
        })) ?? []);
      });
  }, []);

  const getEventType = async () => {
    try {
      const response = await eventTypeApi.getEventType(eventTypeId);
      const eventType = response?.data?.data;
      return {
        name: eventType?.name ?? '',
        description: eventType?.description ?? '',
        sortOrder: eventType?.sortOrder ?? '',
        eventCode: eventType?.eventCode
          ? {
            id: eventType.eventCode,
            value: eventType.eventCode,
            label: eventType.eventCode,
          }
          : null,
      };
    } catch (error) {
      // Like the legacy edit action: not-found redirects back to the list.
      history.push(EVENT_TYPE_URL.list());
      return {
        name: '', description: '', sortOrder: '', eventCode: null,
      };
    }
  };

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    mode: 'onBlur',
    defaultValues: eventTypeId
      ? getEventType
      : {
        name: '', description: '', sortOrder: '', eventCode: null,
      },
  });

  const goToList = () => {
    history.push(EVENT_TYPE_URL.list());
  };

  const onSubmit = async (values) => {
    const payload = {
      name: values.name,
      description: values.description,
      sortOrder: values.sortOrder !== '' ? Number(values.sortOrder) : null,
      eventCode: values.eventCode?.value ?? null,
    };
    if (eventTypeId) {
      await eventTypeApi.updateEventType(eventTypeId, payload);
      notification(NotificationType.SUCCESS)({
        message: translate('react.eventType.update.success.label', 'Event type has been updated successfully'),
      });
      goToList();
      return;
    }
    await eventTypeApi.createEventType(payload);
    notification(NotificationType.SUCCESS)({
      message: translate('react.eventType.create.success.label', 'Event type has been created successfully'),
    });
    goToList();
  };

  const deleteEventType = async () => {
    dispatch(showSpinner());
    try {
      const { status } = await eventTypeApi.deleteEventType(eventTypeId);
      if (status === 204) {
        notification(NotificationType.SUCCESS)({
          message: translate('react.eventType.delete.success.label', 'Event type has been deleted successfully'),
        });
        goToList();
      }
    } catch (error) {
      // Error feedback is surfaced by the global apiClient interceptor.
    } finally {
      dispatch(hideSpinner());
    }
  };

  const onDelete = () => {
    confirmAlert({
      title: translate('react.default.areYouSure.label', 'Are you sure?'),
      message: translate(
        'react.eventType.delete.confirm.label',
        'Are you sure you want to delete this event type?',
      ),
      buttons: [
        {
          label: translate('react.default.yes.label', 'Yes'),
          onClick: deleteEventType,
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
          {eventTypeId
            ? <Translate id="react.eventType.edit.label" defaultMessage="Edit Event Type" />
            : <Translate id="react.eventType.create.label" defaultMessage="Create Event Type" />}
        </span>
      </HeaderWrapper>
      <form onSubmit={handleSubmit(onSubmit)} className="p-3">
        <Section
          title={{ label: 'react.eventType.detailsSection.label', defaultMessage: 'Event Type Details' }}
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
                    title={{ id: 'react.eventType.name.label', defaultMessage: 'Name' }}
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
                    title={{ id: 'react.eventType.description.label', defaultMessage: 'Description' }}
                    {...field}
                  />
                )}
              />
            </div>
            <div className="col-lg-4 col-md-6 px-2 pt-2">
              <Controller
                name="sortOrder"
                control={control}
                render={({ field }) => (
                  <TextInput
                    type="number"
                    title={{ id: 'react.eventType.sortOrder.label', defaultMessage: 'Sort Order' }}
                    {...field}
                  />
                )}
              />
            </div>
            <div className="col-lg-4 col-md-6 px-2 pt-2">
              <Controller
                name="eventCode"
                control={control}
                rules={{
                  required: translate('react.default.error.requiredField.label', 'This field is required'),
                }}
                render={({ field }) => (
                  <SelectField
                    title={{ id: 'react.eventType.eventCode.label', defaultMessage: 'Event Status' }}
                    required
                    errorMessage={errors.eventCode?.message}
                    options={eventCodeOptions}
                    {...field}
                  />
                )}
              />
            </div>
          </div>
          <div className="d-flex gap-8 pt-3">
            <Button
              type="submit"
              defaultLabel={eventTypeId ? 'Update' : 'Create'}
              label={eventTypeId ? 'react.default.button.update.label' : 'react.default.button.create.label'}
              variant="primary"
              disabled={isSubmitting}
            />
            {eventTypeId && (
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

export default EventTypeForm;
